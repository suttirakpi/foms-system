// pricing.js : M4-01 calcPrice, M4-02 ตรวจความจุ, M4-05 snapshot + คำนวณใหม่
// ใช้ชื่อ field ตาม database ปัจจุบัน: packages, addons, temples.halls[]

// ค่าศาลา (pricePerNight × คืน) คิดรวมใน grandTotal
// ทีมยืนยันแล้วว่าคิดรวมเหมือนระบบจองเดิม ถ้าจะเลิกคิด เปลี่ยนเป็น false ที่เดียวจบ
const INCLUDE_HALL_PRICE = true;

class AppError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// ---------- ส่วนคำนวณล้วน (ไม่แตะ DB) ----------
// pkg:     { name, basePrice, snackPerHead }
// hall:    { name, capacity, pricePerNight }
// options: [{ name, price, categoryKey, categoryName, addonId }]
function buildPricing({ pkg, hall, options, guestCount, nights }) {
  const lines = [];

  lines.push({ label: `แพ็กเกจ ${pkg.name}`, amount: pkg.basePrice });

  const snackTotal = pkg.snackPerHead * guestCount * nights;
  lines.push({
    label: `ค่าบริการต่อหัว ${guestCount} คน × ${nights} คืน × ${pkg.snackPerHead} บาท`,
    amount: snackTotal,
  });

  let hallTotal = 0;
  if (INCLUDE_HALL_PRICE) {
    hallTotal = hall.pricePerNight * nights;
    lines.push({
      label: `${hall.name} ${nights} คืน × ${hall.pricePerNight} บาท`,
      amount: hallTotal,
    });
  }

  let addonsTotal = 0;
  for (const o of options) {
    addonsTotal += o.price;
    const label = o.categoryName ? `${o.categoryName}: ${o.name}` : o.name;
    lines.push({ label, amount: o.price });
  }

  const total = lines.reduce((s, l) => s + l.amount, 0);

  // ตรวจความจุ: เตือนอย่างเดียว ไม่ห้ามจอง
  const warnings = [];
  if (guestCount > hall.capacity) {
    warnings.push({
      type: "CAPACITY",
      message: `แขก ${guestCount} คน เกินความจุ${hall.name} (${hall.capacity} คน) อยู่ ${guestCount - hall.capacity} คน`,
    });
  }

  return {
    lines,
    total,
    warnings,
    pricing: { hallTotal, snackTotal, addonsTotal, grandTotal: total },
  };
}

function validateInput({ guestCount, nights }) {
  if (!Number.isInteger(guestCount) || guestCount < 0)
    throw new AppError("INVALID_INPUT", "guestCount ต้องเป็นจำนวนเต็ม >= 0");
  if (!Number.isInteger(nights) || nights < 1)
    throw new AppError("INVALID_INPUT", "nights ต้องเป็นจำนวนเต็ม >= 1");
}

// ตัวเลือกต้องเปิดใช้งาน และอยู่ในแพ็กเกจนี้ (packageIds ว่าง = ใช้ได้ทุกแพ็กเกจ)
function assertOptionUsable(o, packageId) {
  const inPackage =
    !o.packageIds || o.packageIds.length === 0 ||
    o.packageIds.some((id) => String(id) === String(packageId));
  if (!o.isActive || !inPackage)
    throw new AppError("OPTION_NOT_IN_PACKAGE", `ตัวเลือก "${o.name}" ใช้กับแพ็กเกจนี้ไม่ได้`);
}

// 1 ตัวเลือกต่อหมวด ตัวที่ไม่มี categoryKey = บริการเสริมทั่วไป เลือกได้หลายอย่าง ไม่นับ
function assertOneOptionPerCategory(options) {
  const keys = options.map((o) => o.categoryKey).filter(Boolean);
  if (new Set(keys).size !== keys.length)
    throw new AppError("DUPLICATE_CATEGORY", "แต่ละหมวดเลือกได้ 1 ตัวเลือก");
}

// ---------- M4-01 + M4-02 : คำนวณจากราคาปัจจุบัน (ใช้ตอนจอง) ----------
// input: { packageId, optionIds[], guestCount, nights, hallId }
async function calcPrice(input) {
  const { Package, Addon, Temple } = require("../models");

  const { packageId, optionIds = [], guestCount, nights, hallId } = input;
  validateInput(input);

  const pkg = await Package.findById(packageId).lean();
  if (!pkg || !pkg.isActive)
    throw new AppError("PACKAGE_NOT_FOUND", "ไม่พบแพ็กเกจ หรือปิดใช้งาน", 404);

  // ศาลาฝังอยู่ใน temples.halls[]
  const temple = await Temple.findOne({ "halls._id": hallId }).lean();
  const hall = temple && temple.halls.find((h) => String(h._id) === String(hallId));
  if (!hall || !hall.isActive)
    throw new AppError("HALL_NOT_FOUND", "ไม่พบศาลา หรือปิดใช้งาน", 404);

  // ตัวเลือก: ต้องมีจริง, เปิดใช้งาน, อยู่ในแพ็กเกจนี้ (packageIds ว่าง = ใช้ได้ทุกแพ็กเกจ)
  const options = await Addon.find({ _id: { $in: optionIds } }).lean();
  if (options.length !== optionIds.length)
    throw new AppError("OPTION_NOT_FOUND", "มีตัวเลือกที่ไม่พบในระบบ");

  options.forEach((o) => assertOptionUsable(o, pkg._id));
  assertOneOptionPerCategory(options);

  const optionRows = options.map((o) => ({
    addonId: o._id, name: o.name, price: o.price,
    categoryKey: o.categoryKey, categoryName: o.categoryName,
  }));

  const result = buildPricing({ pkg, hall, options: optionRows, guestCount, nights });

  // snapshot ที่คัดลอกลง booking (ใช้ชื่อ field เดียวกับ booking เดิม)
  const snapshot = {
    hallName: hall.name,
    hallPricePerNight: hall.pricePerNight,
    packageName: pkg.name,
    packageBasePrice: pkg.basePrice,
    snackPerHead: pkg.snackPerHead,
    addons: optionRows.map(({ addonId, name, price, categoryKey }) => ({
      addonId, name, price, categoryKey,
    })),
    guests: guestCount,
    nights,
  };

  return { ...result, snapshot };
}

// ---------- M4-05 : คำนวณใหม่จาก snapshot (แขก/คืน/ตัวเลือกเปลี่ยน) คืนส่วนต่าง ----------
// ราคาเดิมใช้จาก snapshot ใน booking (แอดมินแก้ราคาทีหลังไม่กระทบงานเก่า)
// เฉพาะตัวเลือกที่ "เพิ่มใหม่" เท่านั้นที่ใช้ราคาปัจจุบันจาก addons
// input: { guestCount?, nights?, optionIds? } ไม่ส่ง = ใช้ค่าเดิมของ booking
async function recalcFromBooking(booking, { guestCount, nights, optionIds } = {}) {
  const { Temple, Addon } = require("../models");

  const newGuests = guestCount ?? booking.guests;
  const newNights = nights ?? booking.nights;
  validateInput({ guestCount: newGuests, nights: newNights });

  // ตัวเลือก: ของเดิมที่ยังเลือกอยู่ใช้ราคา snapshot, ของใหม่ดึงราคาปัจจุบัน
  let options = booking.addons || [];
  if (Array.isArray(optionIds)) {
    const wanted = optionIds.map(String);
    const kept = options.filter((a) => wanted.includes(String(a.addonId)));
    const keptIds = kept.map((a) => String(a.addonId));
    const newIds = wanted.filter((id) => !keptIds.includes(id));

    const fetched = newIds.length
      ? await Addon.find({ _id: { $in: newIds } }).lean()
      : [];
    if (fetched.length !== newIds.length)
      throw new AppError("OPTION_NOT_FOUND", "มีตัวเลือกที่ไม่พบในระบบ");
    fetched.forEach((o) => assertOptionUsable(o, booking.packageId));

    options = [
      ...kept,
      ...fetched.map((o) => ({
        addonId: o._id, name: o.name, price: o.price,
        categoryKey: o.categoryKey, categoryName: o.categoryName,
      })),
    ];
    assertOneOptionPerCategory(options);
  }

  // ความจุอ่านจากศาลาปัจจุบัน (ไม่ใช่ราคา)
  const temple = await Temple.findOne({ "halls._id": booking.hallId }).lean();
  const liveHall = temple && temple.halls.find((h) => String(h._id) === String(booking.hallId));

  const hall = {
    name: booking.hallName,
    pricePerNight: booking.hallPricePerNight,
    capacity: liveHall ? liveHall.capacity : Infinity,
  };
  const pkg = {
    name: booking.packageName,
    basePrice: booking.packageBasePrice,
    snackPerHead: booking.snackPerHead,
  };

  const result = buildPricing({
    pkg, hall, options, guestCount: newGuests, nights: newNights,
  });

  const oldTotal = booking.pricing.grandTotal;
  return {
    ...result,
    oldTotal,
    difference: result.total - oldTotal, // + = ต้องจ่ายเพิ่ม, − = ราคาลดลง
  };
}

module.exports = { calcPrice, recalcFromBooking, buildPricing, AppError };