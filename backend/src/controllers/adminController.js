// controllers/adminController.js
// ฝั่งผู้ดูแลระบบ (ADMIN): ภาพรวม, ผู้ใช้/สิทธิ์, วัด-ศาลา, แพ็กเกจ, ตัวเลือกเสริม, บุคลากร, กฎวัด, audit, ตั้งค่าระบบ
// ทุกการเพิ่ม/แก้ไขเขียนบันทึกลง AuditLog ผ่าน logAudit
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");
const Payment = require("../models/Payment");
const Person = require("../models/Person");
const TempleRule = require("../models/TempleRule");
const AuditLog = require("../models/AuditLog");
const { Temple, Package, Addon, Booking } = require("../models/FuneralModels");
const { logAudit } = require("../utils/audit");
const {
  DEFAULT_RULES,
  BUFFER_CHOICES,
  getRules,
} = require("../utils/templeRules");
const { todayInBangkok } = require("../utils/dates");

const ROLES = ["ADMIN", "STAFF", "OPS", "HOST"];
const LEVELS = ["Economy", "Standard", "Premium"];
const PERSON_TYPES = ["MONK", "DEACON", "MC"];
const LIVE_STATUSES = ["PENDING", "CONFIRMED", "PAID", "IN_PROGRESS"];

const isId = (v) => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v);
const bad = (res, message) => res.status(400).json({ message });
const str = (v) => String(v ?? "").trim();
const normalizePhone = (p) => str(p).replace(/\D/g, "");
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isNonNegNumber = (n) => Number.isFinite(n) && n >= 0;

// ครอบ handler: แปลง error ที่พบบ่อยของ mongoose เป็นข้อความที่อ่านออก
const wrap = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err.name === "ValidationError")
      return bad(
        res,
        Object.values(err.errors)
          .map((e) => e.message)
          .join(", "),
      );
    if (err.code === 11000)
      return res.status(409).json({ message: "ข้อมูลนี้ซ้ำกับที่มีอยู่แล้ว" });
    next(err);
  }
};

function lastSixMonths(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const y = Number(parts.find((p) => p.type === "year").value);
  const m = Number(parts.find((p) => p.type === "month").value); // 1-12
  const keys = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    keys.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
    );
  }
  // 00:00 น. ของวันที่ 1 เดือนแรก ตามเวลาไทย (UTC+7)
  const since = new Date(Date.UTC(y, m - 1 - 5, 1) - 7 * 3600 * 1000);
  return { keys, since };
}

// ---------------------------------------------------------------- ภาพรวม
exports.overview = wrap(async (req, res) => {
  const [
    userRoles,
    userActive,
    bookingStatus,
    revenue,
    pendingSlips,
    temples,
    recentBookings,
    recentAudit,
  ] = await Promise.all([
    User.aggregate([{ $group: { _id: "$role", n: { $sum: 1 } } }]),
    User.countDocuments({ isActive: true }),
    Booking.aggregate([
      {
        $group: {
          _id: "$status",
          n: { $sum: 1 },
          amount: { $sum: "$pricing.grandTotal" },
        },
      },
    ]),
    Payment.aggregate([
      { $match: { status: "APPROVED" } },
      { $group: { _id: null, total: { $sum: "$amountDue" } } },
    ]),
    Payment.countDocuments({ status: "PENDING" }),
    Temple.find().lean(),
    Booking.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .select(
        "bookingRef hostName deceasedName templeName hallName status startDate nights pricing.grandTotal createdAt",
      )
      .lean(),
    AuditLog.find().sort({ createdAt: -1 }).limit(6).lean(),
  ]);
  const byRole = Object.fromEntries(userRoles.map((r) => [r._id, r.n]));
  const byStatus = Object.fromEntries(bookingStatus.map((r) => [r._id, r.n]));
  const bookingTotal = bookingStatus.reduce((s, r) => s + r.n, 0);
  res.json({
    users: {
      total: Object.values(byRole).reduce((a, b) => a + b, 0),
      active: userActive,
      byRole,
    },
    bookings: { total: bookingTotal, byStatus },
    revenue: { approved: revenue[0] ? revenue[0].total : 0, pendingSlips },
    temples: {
      total: temples.length,
      active: temples.filter((t) => t.isActive !== false).length,
      halls: temples.reduce((s, t) => s + t.halls.length, 0),
      hallsActive: temples.reduce(
        (s, t) => s + t.halls.filter((h) => h.isActive !== false).length,
        0,
      ),
    },
    recentBookings,
    recentAudit,
  });
});

// ---------------------------------------------------------------- ผู้ใช้และสิทธิ์
function userDto(u, templeNames) {
  return {
    id: String(u._id),
    name: u.name,
    phone: u.phone,
    email: u.email || "",
    role: u.role,
    isActive: u.isActive !== false,
    templeId: u.templeId ? String(u.templeId) : "",
    templeName: u.templeId ? templeNames.get(String(u.templeId)) || "" : "",
    lastLoginAt: u.lastLoginAt || null,
    createdAt: u.createdAt,
  };
}
const templeNameMap = async () =>
  new Map(
    (await Temple.find().select("name").lean()).map((t) => [
      String(t._id),
      t.name,
    ]),
  );

exports.listUsers = wrap(async (req, res) => {
  const filter = {};
  if (req.query.role) {
    if (!ROLES.includes(req.query.role)) return bad(res, "บทบาทไม่ถูกต้อง");
    filter.role = req.query.role;
  }
  const q = str(req.query.q);
  if (q) {
    const re = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: re }, { phone: re }, { email: re }];
  }
  const [users, names] = await Promise.all([
    User.find(filter).sort({ createdAt: 1 }).lean(),
    templeNameMap(),
  ]);
  res.json(users.map((u) => userDto(u, names)));
});

async function checkTempleForRole(role, templeId) {
  if (templeId) {
    if (!isId(String(templeId)) || !(await Temple.exists({ _id: templeId })))
      return "ไม่พบวัดที่เลือก";
  } else if (role === "STAFF") {
    return "เจ้าหน้าที่วัดต้องระบุวัดที่สังกัด";
  }
  return null;
}

exports.createUser = wrap(async (req, res) => {
  const b = req.body || {};
  const name = str(b.name);
  const phone = normalizePhone(b.phone);
  const email = str(b.email).toLowerCase() || undefined;
  const role = str(b.role) || "HOST";
  if (!name) return bad(res, "กรุณาระบุชื่อ-นามสกุล");
  if (!/^0\d{8,9}$/.test(phone))
    return bad(res, "เบอร์โทรศัพท์ไม่ถูกต้อง (ตัวเลข 9-10 หลัก ขึ้นต้นด้วย 0)");
  if (typeof b.password !== "string" || b.password.length < 8)
    return bad(res, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
  if (!ROLES.includes(role)) return bad(res, "บทบาทไม่ถูกต้อง");
  const templeErr = await checkTempleForRole(role, b.templeId || null);
  if (templeErr) return bad(res, templeErr);
  if (await User.exists({ $or: [{ phone }, ...(email ? [{ email }] : [])] }))
    return res
      .status(409)
      .json({ message: "เบอร์โทรหรืออีเมลนี้ถูกใช้งานแล้ว" });

  const user = await User.create({
    name,
    phone,
    email,
    role,
    templeId: b.templeId || undefined,
    password: await bcrypt.hash(b.password, 10),
    pdpaConsent: true, // บัญชีที่แอดมินสร้างให้ ถือว่าตกลงตามเงื่อนไขของสำนักงานวัดแล้ว
  });
  await logAudit(req, {
    action: "CREATE",
    entity: "USER",
    entityId: user._id,
    summary: `สร้างบัญชี ${name} (${role})`,
  });
  res.status(201).json(userDto(user.toObject(), await templeNameMap()));
});

exports.updateUser = wrap(async (req, res) => {
  if (!isId(req.params.id)) return bad(res, "รหัสผู้ใช้ไม่ถูกต้อง");
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "ไม่พบผู้ใช้" });
  const b = req.body || {};
  const self = String(user._id) === String(req.user._id);
  const changes = [];

  if (b.name !== undefined) {
    if (!str(b.name)) return bad(res, "ชื่อห้ามเว้นว่าง");
    if (str(b.name) !== user.name) changes.push(`ชื่อเป็น ${str(b.name)}`);
    user.name = str(b.name);
  }
  if (b.role !== undefined && b.role !== user.role) {
    if (!ROLES.includes(b.role)) return bad(res, "บทบาทไม่ถูกต้อง");
    if (self)
      return bad(
        res,
        "เปลี่ยนบทบาทของตัวเองไม่ได้ (กันแอดมินคนสุดท้ายหลุดสิทธิ์)",
      );
    changes.push(`บทบาท ${user.role} → ${b.role}`);
    user.role = b.role;
  }
  if (b.isActive !== undefined && Boolean(b.isActive) !== user.isActive) {
    if (self) return bad(res, "ระงับบัญชีของตัวเองไม่ได้");
    user.isActive = Boolean(b.isActive);
    changes.push(user.isActive ? "เปิดใช้งานบัญชี" : "ระงับบัญชี");
  }
  if (b.templeId !== undefined) {
    const next = b.templeId || null;
    if (String(next || "") !== String(user.templeId || "")) {
      if (
        next &&
        (!isId(String(next)) || !(await Temple.exists({ _id: next })))
      )
        return bad(res, "ไม่พบวัดที่เลือก");
      user.templeId = next || undefined;
      changes.push("เปลี่ยนวัดที่สังกัด");
    }
  }
  const templeErr = await checkTempleForRole(user.role, user.templeId);
  if (templeErr) return bad(res, templeErr);
  if (!changes.length)
    return res.json(userDto(user.toObject(), await templeNameMap()));

  await user.save();
  await logAudit(req, {
    action: "UPDATE",
    entity: "USER",
    entityId: user._id,
    summary: `แก้ไขบัญชี ${user.name}: ${changes.join(", ")}`,
  });
  res.json(userDto(user.toObject(), await templeNameMap()));
});

// ---------------------------------------------------------------- วัดและศาลา
exports.listTemples = wrap(async (req, res) => {
  res.json(await Temple.find().sort({ _id: 1 }).lean());
});

exports.createTemple = wrap(async (req, res) => {
  const b = req.body || {};
  if (!str(b.name)) return bad(res, "กรุณาระบุชื่อวัด");
  const temple = await Temple.create({
    name: str(b.name),
    address: str(b.address),
    province: str(b.province),
    ...(str(b.bankName) ? { bankName: str(b.bankName) } : {}),
    ...(str(b.bankAccount) ? { bankAccount: str(b.bankAccount) } : {}),
  });
  await logAudit(req, {
    action: "CREATE",
    entity: "TEMPLE",
    entityId: temple._id,
    summary: `เพิ่มวัด ${temple.name}`,
  });
  res.status(201).json(temple);
});

exports.updateTemple = wrap(async (req, res) => {
  if (!isId(req.params.id)) return bad(res, "รหัสวัดไม่ถูกต้อง");
  const temple = await Temple.findById(req.params.id);
  if (!temple) return res.status(404).json({ message: "ไม่พบวัด" });
  const b = req.body || {};
  for (const k of ["name", "address", "province", "bankName", "bankAccount"]) {
    if (b[k] !== undefined) {
      if (k === "name" && !str(b[k])) return bad(res, "ชื่อวัดห้ามเว้นว่าง");
      temple[k] = str(b[k]);
    }
  }
  if (b.isActive !== undefined) temple.isActive = Boolean(b.isActive);
  await temple.save();
  await logAudit(req, {
    action: "UPDATE",
    entity: "TEMPLE",
    entityId: temple._id,
    summary: `แก้ไขวัด ${temple.name}`,
  });
  res.json(temple);
});

function parseHall(b, partial) {
  const out = {};
  if (b.name !== undefined || !partial) {
    if (!str(b.name)) return { error: "กรุณาระบุชื่อศาลา" };
    out.name = str(b.name);
  }
  if (b.capacity !== undefined || !partial) {
    const n = Number(b.capacity);
    if (!Number.isInteger(n) || n < 1)
      return { error: "ความจุต้องเป็นจำนวนเต็มตั้งแต่ 1" };
    out.capacity = n;
  }
  if (b.pricePerNight !== undefined || !partial) {
    const n = Number(b.pricePerNight);
    if (!isNonNegNumber(n)) return { error: "ค่าบำรุงต้องเป็นตัวเลขตั้งแต่ 0" };
    out.pricePerNight = n;
  }
  if (b.kind !== undefined) {
    if (!["HALL", "CREMATORIUM"].includes(b.kind))
      return { error: "ประเภทต้องเป็น HALL หรือ CREMATORIUM" };
    out.kind = b.kind;
  }
  for (const k of ["code", "description", "equipment", "feeNote"])
    if (b[k] !== undefined) out[k] = str(b[k]);
  return { data: out };
}

exports.createHall = wrap(async (req, res) => {
  if (!isId(req.params.id)) return bad(res, "รหัสวัดไม่ถูกต้อง");
  const temple = await Temple.findById(req.params.id);
  if (!temple) return res.status(404).json({ message: "ไม่พบวัด" });
  const { error, data } = parseHall(req.body || {}, false);
  if (error) return bad(res, error);
  if (!data.code) {
    const prefix = data.kind === "CREMATORIUM" ? "MER" : "HAL";
    const n =
      temple.halls.filter((h) => (h.kind || "HALL") === (data.kind || "HALL"))
        .length + 1;
    data.code = `${prefix}-${String(n).padStart(2, "0")}`;
  }
  temple.halls.push(data);
  await temple.save();
  const hall = temple.halls[temple.halls.length - 1];
  await logAudit(req, {
    action: "CREATE",
    entity: "HALL",
    entityId: hall._id,
    summary: `เพิ่มศาลา ${hall.name} (${temple.name})`,
  });
  res.status(201).json(temple);
});

exports.updateHall = wrap(async (req, res) => {
  const { id, hallId } = req.params;
  if (!isId(id) || !isId(hallId)) return bad(res, "รหัสไม่ถูกต้อง");
  const temple = await Temple.findById(id);
  const hall = temple && temple.halls.id(hallId);
  if (!hall) return res.status(404).json({ message: "ไม่พบศาลา" });
  const b = req.body || {};
  const { error, data } = parseHall(b, true);
  if (error) return bad(res, error);

  let action = "UPDATE";
  if (
    b.isActive !== undefined &&
    Boolean(b.isActive) !== (hall.isActive !== false)
  ) {
    if (!b.isActive) {
      // ระงับศาลาที่ยังมีงานค้างอยู่ ต้องยืนยันซ้ำ (force) เพราะจะกระทบเจ้าภาพ
      const live = await Booking.countDocuments({
        hallId: hall._id,
        status: { $in: LIVE_STATUSES },
        endDate: { $gte: new Date(todayInBangkok()) },
      });
      if (live > 0 && !b.force)
        return res.status(409).json({
          code: "HALL_HAS_BOOKINGS",
          count: live,
          message: `ศาลานี้ยังมีงานที่ใช้งานอยู่ ${live} งาน`,
        });
    }
    hall.isActive = Boolean(b.isActive);
    action = hall.isActive ? "ACTIVATE" : "DEACTIVATE";
  }
  Object.assign(hall, data);
  await temple.save();
  await logAudit(req, {
    action,
    entity: "HALL",
    entityId: hall._id,
    summary: `${action === "UPDATE" ? "แก้ไข" : action === "ACTIVATE" ? "เปิดใช้งาน" : "ระงับ"}ศาลา ${hall.name} (${temple.name})`,
  });
  res.json(temple);
});

// ---------------------------------------------------------------- แพ็กเกจ
function parsePackage(b, partial) {
  const out = {};
  if (b.name !== undefined || !partial) {
    if (!str(b.name)) return { error: "กรุณาระบุชื่อแพ็กเกจ" };
    out.name = str(b.name);
  }
  if (b.level !== undefined || !partial) {
    if (!LEVELS.includes(b.level))
      return { error: "ระดับต้องเป็น Economy, Standard หรือ Premium" };
    out.level = b.level;
  }
  for (const [k, label] of [
    ["basePrice", "ราคาฐาน"],
    ["snackPerHead", "ค่าบริการต่อหัว"],
  ]) {
    if (b[k] !== undefined || !partial) {
      const n = Number(b[k]);
      if (!isNonNegNumber(n))
        return { error: `${label}ต้องเป็นตัวเลขตั้งแต่ 0` };
      out[k] = n;
    }
  }
  if (b.desc !== undefined || !partial) {
    if (!str(b.desc)) return { error: "กรุณาระบุคำอธิบายแพ็กเกจ" };
    out.desc = str(b.desc);
  }
  if (b.features !== undefined)
    out.features = (
      Array.isArray(b.features) ? b.features : str(b.features).split("\n")
    )
      .map(str)
      .filter(Boolean);
  if (b.recommended !== undefined) out.recommended = Boolean(b.recommended);
  if (b.sortOrder !== undefined) out.sortOrder = Number(b.sortOrder) || 0;
  if (b.isActive !== undefined) out.isActive = Boolean(b.isActive);
  return { data: out };
}

exports.listPackages = wrap(async (req, res) => {
  res.json(await Package.find().sort({ sortOrder: 1, basePrice: 1 }).lean());
});
exports.createPackage = wrap(async (req, res) => {
  const { error, data } = parsePackage(req.body || {}, false);
  if (error) return bad(res, error);
  const pkg = await Package.create(data);
  await logAudit(req, {
    action: "CREATE",
    entity: "PACKAGE",
    entityId: pkg._id,
    summary: `เพิ่มแพ็กเกจ ${pkg.name}`,
  });
  res.status(201).json(pkg);
});
exports.updatePackage = wrap(async (req, res) => {
  if (!isId(req.params.id)) return bad(res, "รหัสแพ็กเกจไม่ถูกต้อง");
  const { error, data } = parsePackage(req.body || {}, true);
  if (error) return bad(res, error);
  const pkg = await Package.findByIdAndUpdate(req.params.id, data, {
    new: true,
    runValidators: true,
  });
  if (!pkg) return res.status(404).json({ message: "ไม่พบแพ็กเกจ" });
  const verb =
    data.isActive === undefined
      ? "แก้ไข"
      : data.isActive
        ? "เปิดใช้งาน"
        : "ระงับ";
  await logAudit(req, {
    action:
      data.isActive === undefined
        ? "UPDATE"
        : data.isActive
          ? "ACTIVATE"
          : "DEACTIVATE",
    entity: "PACKAGE",
    entityId: pkg._id,
    summary: `${verb}แพ็กเกจ ${pkg.name}`,
  });
  res.json(pkg);
});

// ---------------------------------------------------------------- ตัวเลือกเสริม
async function parseAddon(b, partial) {
  const out = {};
  if (b.name !== undefined || !partial) {
    if (!str(b.name)) return { error: "กรุณาระบุชื่อตัวเลือก" };
    out.name = str(b.name);
  }
  if (b.price !== undefined || !partial) {
    const n = Number(b.price);
    if (!isNonNegNumber(n))
      return { error: "ราคา/ส่วนต่างต้องเป็นตัวเลขตั้งแต่ 0" };
    out.price = n;
  }
  if (b.categoryKey !== undefined)
    out.categoryKey = str(b.categoryKey).toUpperCase() || undefined;
  if (b.categoryName !== undefined)
    out.categoryName = str(b.categoryName) || undefined;
  if (b.packageIds !== undefined) {
    const ids = Array.isArray(b.packageIds) ? b.packageIds : [];
    if (!ids.every(isId)) return { error: "รหัสแพ็กเกจไม่ถูกต้อง" };
    if (
      ids.length &&
      (await Package.countDocuments({ _id: { $in: ids } })) !==
        new Set(ids).size
    )
      return { error: "ไม่พบแพ็กเกจที่เลือกบางรายการ" };
    out.packageIds = ids;
  }
  if (b.isDefault !== undefined) out.isDefault = Boolean(b.isDefault);
  if (b.sortOrder !== undefined) out.sortOrder = Number(b.sortOrder) || 0;
  if (b.isActive !== undefined) out.isActive = Boolean(b.isActive);
  return { data: out };
}
exports.listAddons = wrap(async (req, res) => {
  res.json(await Addon.find().sort({ categoryKey: 1, sortOrder: 1 }).lean());
});
exports.createAddon = wrap(async (req, res) => {
  const { error, data } = await parseAddon(req.body || {}, false);
  if (error) return bad(res, error);
  const addon = await Addon.create(data);
  await logAudit(req, {
    action: "CREATE",
    entity: "ADDON",
    entityId: addon._id,
    summary: `เพิ่มตัวเลือก ${addon.name}`,
  });
  res.status(201).json(addon);
});
exports.updateAddon = wrap(async (req, res) => {
  if (!isId(req.params.id)) return bad(res, "รหัสตัวเลือกไม่ถูกต้อง");
  const { error, data } = await parseAddon(req.body || {}, true);
  if (error) return bad(res, error);
  const addon = await Addon.findByIdAndUpdate(req.params.id, data, {
    new: true,
    runValidators: true,
  });
  if (!addon) return res.status(404).json({ message: "ไม่พบตัวเลือก" });
  const verb =
    data.isActive === undefined
      ? "แก้ไข"
      : data.isActive
        ? "เปิดใช้งาน"
        : "ระงับ";
  await logAudit(req, {
    action:
      data.isActive === undefined
        ? "UPDATE"
        : data.isActive
          ? "ACTIVATE"
          : "DEACTIVATE",
    entity: "ADDON",
    entityId: addon._id,
    summary: `${verb}ตัวเลือก ${addon.name}`,
  });
  res.json(addon);
});

// ---------------------------------------------------------------- พระ / มัคนายก / พิธีกร
exports.listPersons = wrap(async (req, res) => {
  const filter = {};
  if (req.query.templeId) {
    if (!isId(req.query.templeId)) return bad(res, "รหัสวัดไม่ถูกต้อง");
    filter.templeId = req.query.templeId;
  }
  if (req.query.type) {
    if (!PERSON_TYPES.includes(req.query.type))
      return bad(res, "ประเภทไม่ถูกต้อง");
    filter.type = req.query.type;
  }
  res.json(await Person.find(filter).sort({ type: 1, name: 1 }).lean());
});
exports.createPerson = wrap(async (req, res) => {
  const b = req.body || {};
  if (!isId(str(b.templeId)) || !(await Temple.exists({ _id: b.templeId })))
    return bad(res, "ไม่พบวัดที่เลือก");
  if (!PERSON_TYPES.includes(b.type))
    return bad(res, "ประเภทต้องเป็น MONK, DEACON หรือ MC");
  if (!str(b.name)) return bad(res, "กรุณาระบุชื่อ");
  const person = await Person.create({
    templeId: b.templeId,
    type: b.type,
    name: str(b.name),
    title: str(b.title) || undefined,
  });
  await logAudit(req, {
    action: "CREATE",
    entity: "PERSON",
    entityId: person._id,
    summary: `เพิ่ม ${person.name} (${person.type})`,
  });
  res.status(201).json(person);
});
exports.updatePerson = wrap(async (req, res) => {
  if (!isId(req.params.id)) return bad(res, "รหัสไม่ถูกต้อง");
  const person = await Person.findById(req.params.id);
  if (!person) return res.status(404).json({ message: "ไม่พบรายชื่อ" });
  const b = req.body || {};
  if (b.name !== undefined) {
    if (!str(b.name)) return bad(res, "ชื่อห้ามเว้นว่าง");
    person.name = str(b.name);
  }
  if (b.title !== undefined) person.title = str(b.title) || undefined;
  let action = "UPDATE";
  if (b.isActive !== undefined && Boolean(b.isActive) !== person.isActive) {
    person.isActive = Boolean(b.isActive);
    action = person.isActive ? "ACTIVATE" : "DEACTIVATE";
  }
  await person.save();
  await logAudit(req, {
    action,
    entity: "PERSON",
    entityId: person._id,
    summary: `${action === "UPDATE" ? "แก้ไข" : action === "ACTIVATE" ? "เปิดใช้งาน" : "ระงับ"} ${person.name}`,
  });
  res.json(person);
});

// ---------------------------------------------------------------- กฎวัด
exports.getRules = wrap(async (req, res) => {
  if (!isId(str(req.query.templeId))) return bad(res, "กรุณาระบุ templeId");
  res.json(await getRules(req.query.templeId));
});
exports.putRules = wrap(async (req, res) => {
  const { templeId, rules } = req.body || {};
  if (!isId(str(templeId)) || !(await Temple.exists({ _id: templeId })))
    return bad(res, "ไม่พบวัดที่เลือก");
  if (!rules || typeof rules !== "object") return bad(res, "กรุณาส่ง rules");
  const ops = [];
  for (const [key, value] of Object.entries(rules)) {
    if (!(key in DEFAULT_RULES)) return bad(res, `ไม่รู้จักกฎ ${key}`);
    if (key === "HALL_BUFFER_MINUTES") {
      if (!BUFFER_CHOICES.includes(Number(value)))
        return bad(
          res,
          `เวลาจัดเตรียมศาลาต้องเป็น ${BUFFER_CHOICES.join(", ")} นาที`,
        );
    } else if (typeof value !== "boolean")
      return bad(res, `กฎ ${key} ต้องเป็น true/false`);
    ops.push({
      updateOne: {
        filter: { templeId, key },
        update: {
          $set: {
            value: key === "HALL_BUFFER_MINUTES" ? Number(value) : value,
          },
        },
        upsert: true,
      },
    });
  }
  if (ops.length) await TempleRule.bulkWrite(ops);
  const temple = await Temple.findById(templeId).select("name").lean();
  await logAudit(req, {
    action: "RULES_UPDATE",
    entity: "RULES",
    entityId: templeId,
    summary: `บันทึกกฎเกณฑ์ของ ${temple.name} (${Object.keys(rules).length} รายการ)`,
  });
  res.json(await getRules(templeId));
});

// ---------------------------------------------------------------- Audit / ระบบ / รหัสผ่านตัวเอง
exports.listAudit = wrap(async (req, res) => {
  const limit = Math.min(
    Math.max(parseInt(req.query.limit, 10) || 100, 1),
    500,
  );
  const filter = {};
  if (req.query.entity) filter.entity = str(req.query.entity).toUpperCase();
  const q = str(req.query.q);
  if (q) {
    const re = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ summary: re }, { actorName: re }];
  }
  res.json(
    await AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean(),
  );
});

exports.system = wrap(async (req, res) => {
  const pkg = require("../../package.json");
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  const [users, bookings, temples, audit] = await Promise.all([
    User.countDocuments(),
    Booking.countDocuments(),
    Temple.countDocuments(),
    AuditLog.countDocuments(),
  ]);
  res.json({
    appName: pkg.name,
    appVersion: pkg.version,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || "development",
    uptimeSeconds: Math.round(process.uptime()),
    serverTime: new Date().toISOString(),
    database: {
      state: states[mongoose.connection.readyState] || "unknown",
      name: mongoose.connection.name,
    },
    counts: { users, bookings, temples, audit },
  });
});

exports.changeOwnPassword = wrap(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof newPassword !== "string" || newPassword.length < 8)
    return bad(res, "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร");
  const user = await User.findById(req.user._id).select("+password");
  if (
    !user ||
    !(await bcrypt.compare(String(currentPassword || ""), user.password))
  )
    return res.status(400).json({ message: "รหัสผ่านปัจจุบันไม่ถูกต้อง" });
  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  await logAudit(req, {
    action: "PASSWORD_CHANGE",
    entity: "USER",
    entityId: user._id,
    summary: `${user.name} เปลี่ยนรหัสผ่านของตัวเอง`,
  });
  res.json({ success: true });
});
