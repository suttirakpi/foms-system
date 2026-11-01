// controllers/opsController.js
// ฝั่งทีมจัดงานหน้างาน (OPS): งานที่รับผิดชอบ, ติ๊กขั้นตอนพิธีรายคืน, ตรวจรับของคู่ค้า,
// บัญชีซองทำบุญ, จัดบุคลากรเข้ากำหนดการ, สรุปงาน และเปลี่ยนสถานะงาน (เริ่ม/เสร็จสิ้น)
// OPS ที่มีวัดสังกัดเห็นเฉพาะงานของวัดตัวเอง ส่วน ADMIN (หรือ OPS ที่ไม่มีวัดสังกัด) เห็นทุกวัด
const {
  Booking, Addon, Person, PersonAssignment, ScheduleItem, TempleRule,
  RunStep, VendorDelivery, MeritEnvelope,
} = require("../models");
const { addDays, dateToStr, isValidDateStr, todayInBangkok } = require("../utils/dates");

const LIVE = ["CONFIRMED", "PAID", "IN_PROGRESS"];
const isId = (v) => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v);
const bad = (res, message) => res.status(400).json({ message });
const str = (v) => String(v ?? "").trim();
const pad = (n) => String(n).padStart(2, "0");

const wrap = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err.name === "ValidationError") return bad(res, Object.values(err.errors).map((e) => e.message).join(", "));
    if (err.code === 11000) return res.status(409).json({ message: "ข้อมูลนี้ซ้ำกับที่มีอยู่แล้ว" });
    next(err);
  }
};

const scope = (req) => (req.user.role === "ADMIN" || !req.user.templeId ? {} : { templeId: req.user.templeId });

// โหลดงานตาม :id ภายใต้ขอบเขตวัด ถ้าไม่เจอ/ไม่มีสิทธิ์ จะตอบ error เองแล้วคืน null
async function loadJob(req, res, id = req.params.id) {
  if (!isId(id)) return void bad(res, "รหัสงานไม่ถูกต้อง");
  const booking = await Booking.findOne({ _id: id, ...scope(req) }).lean();
  if (!booking) return void res.status(404).json({ message: "ไม่พบงานที่ระบุ" });
  return booking;
}

const dayDiff = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

function jobDto(b) {
  const startISO = dateToStr(b.startDate);
  const cremationISO = dateToStr(b.endDate);
  const today = todayInBangkok();
  let tonight = null; // คืนที่เท่าไรของงาน (cremation = วันฌาปนกิจ)
  if (today >= startISO && today < cremationISO) tonight = dayDiff(startISO, today) + 1;
  else if (today === cremationISO) tonight = "cremation";
  return {
    id: String(b._id),
    bookingRef: b.bookingRef,
    status: b.status,
    deceasedName: b.deceasedName,
    hostName: b.hostName,
    templeName: b.templeName,
    hallName: b.hallName,
    startISO,
    cremationISO,
    nights: b.nights,
    guests: b.guests,
    packageName: b.packageName,
    tonight,
  };
}

// วันที่ที่ใช้เปิดกระดาน: ใช้วันที่ที่ส่งมา ไม่งั้นใช้วันนี้ แต่ถ้านอกช่วงงานให้ดึงเข้าช่วง (กระดานจะได้ไม่ว่างเสมอ)
function pickDate(b, wanted) {
  const startISO = dateToStr(b.startDate);
  const cremationISO = dateToStr(b.endDate);
  let d = wanted && isValidDateStr(wanted) ? wanted : todayInBangkok();
  if (d < startISO) d = startISO;
  if (d > cremationISO) d = cremationISO;
  return d;
}

// ---------------------------------------------------------------- รายการงาน
exports.jobs = wrap(async (req, res) => {
  const statuses = req.query.include === "completed" ? [...LIVE, "COMPLETED"] : LIVE;
  const rows = await Booking.find({ ...scope(req), status: { $in: statuses } }).sort({ startDate: 1 }).lean();
  const jobs = rows.map(jobDto);
  // งานที่เปิดพิธีวันนี้ขึ้นก่อน
  jobs.sort((a, b) => Number(b.tonight !== null) - Number(a.tonight !== null) || a.startISO.localeCompare(b.startISO));
  res.json(jobs);
});

// ---------------------------------------------------------------- แม่แบบขั้นตอนพิธี
async function ruleTime(templeId, key, fallback) {
  const r = await TempleRule.findOne({ templeId, key }).lean();
  return r && typeof r.value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(r.value) ? r.value : fallback;
}
const toMin = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
const fromMin = (m) => `${pad(Math.floor(((m % 1440) + 1440) % 1440 / 60))}:${pad(((m % 60) + 60) % 60)}`;

// คืนสวดพระอภิธรรม: ไล่เวลาจากเวลาเริ่มสวด (offset นาที, ระยะเวลา นาที)
const CHANT_TEMPLATE = [
  [-150, 30, "จัดตั้งโต๊ะหมู่บูชาและเครื่องไทยธรรมประจำจุดพระสงฆ์", "ตรวจโต๊ะหมู่ เครื่องไทยธรรม ธูปเทียน และน้ำดื่มประจำจุดพระสงฆ์ให้ครบ"],
  [-105, 45, "ตรวจรับและติดตั้งชุดดอกไม้ประดับหน้าหีบศพ", "ตรวจรับดอกไม้จากคู่ค้าและติดตั้งตามแบบที่เจ้าภาพเลือก"],
  [-45, 30, "เปิดศาลา ต้อนรับครอบครัวเจ้าภาพและจัดเตรียมของว่าง", "ทีมต้อนรับประจำจุดประตูทางเข้าและโต๊ะรับรอง เสิร์ฟน้ำดื่มและอาหารว่างแขก"],
  [-15, 15, "นิมนต์พระภิกษุสงฆ์ขึ้นสู่อาสน์สงฆ์ และจัดเตรียมเครื่องไทยธรรม", "มัคนายกนำเทียนอาราธนาธรรม และจัดเตรียมที่นั่งประธานพิธีสงฆ์"],
  [0, 45, "พิธีสวดพระอภิธรรม", "จุดเทียนบูชาพระรัตนตรัย ธูปเทียนหน้าตู้พระอภิธรรมและหน้าศพ"],
  [45, 30, "เจ้าภาพทอดผ้าบังสุกุล ถวายจตุปัจจัยไทยธรรม กรวดน้ำรับพร", "จัดเตรียมพานผ้ามหาบังสุกุลและกรวดน้ำส่งมอบเจ้าภาพ"],
  [75, 15, "สรุปยอดซองร่วมทำบุญเข้าบัญชีดิจิทัลและส่งมอบเจ้าภาพ", "ตรวจนับและปิดบัญชีหน้างานร่วมกับตัวแทนครอบครัว"],
];
// วันฌาปนกิจ
const CREMATION_TEMPLATE = [
  [-120, 30, "เตรียมเมรุและตรวจความพร้อมระบบเตา", "ตรวจเมรุ ระบบดักฝุ่น และจัดวางพวงหรีด/ดอกไม้ประดับเมรุ"],
  [-60, 30, "ตั้งขบวนและเชิญหีบศพออกจากศาลา", "จัดขบวนเจ้าภาพและพระสงฆ์ เชิญหีบศพขึ้นรถนำไปยังเมรุ"],
  [-15, 15, "เวียนเมรุ ๓ รอบ และเชิญหีบศพขึ้นเมรุ", "นำโดยพระสงฆ์ เวียนซ้าย ๓ รอบ"],
  [0, 45, "พิธีฌาปนกิจ: ทอดผ้าบังสุกุลและเทศน์ธรรม", "ทอดผ้าบังสุกุล พระสงฆ์ชักผ้า และถวายเพลิง/ดอกไม้จันทน์"],
  [60, 30, "ปิดพิธี สรุปซองทำบุญ และส่งมอบเจ้าภาพ", "ตรวจนับและปิดบัญชีหน้างาน เก็บอุปกรณ์"],
];

async function buildSteps(booking, date) {
  const isCremation = date === dateToStr(booking.endDate);
  const base = isCremation
    ? await ruleTime(booking.templeId, "CREMATION_START_TIME", "10:00")
    : await ruleTime(booking.templeId, "CHANT_START_TIME", "19:00");
  const baseMin = toMin(base);
  return (isCremation ? CREMATION_TEMPLATE : CHANT_TEMPLATE).map(([offset, dur, title, desc], i) => {
    const s = baseMin + offset;
    return {
      bookingId: booking._id, date, n: i + 1,
      time: `${fromMin(s)} น.`, range: `${fromMin(s)} – ${fromMin(s + dur)} น.`,
      title, desc, status: i === 0 ? "active" : "wait",
    };
  });
}

// ---------------------------------------------------------------- กระดานรายคืน
const stepDto = (s) => ({
  id: String(s._id), n: s.n, time: s.time, range: s.range, title: s.title, desc: s.desc, status: s.status,
  doneByName: s.doneByName, doneAt: s.doneAt,
});
const vendorDto = (v) => ({
  id: String(v._id), category: v.category, title: v.title, partner: v.partner, expectedTime: v.expectedTime,
  detail: v.detail, status: v.status, receivedByName: v.receivedByName, receivedAt: v.receivedAt, ref: v.ref, note: v.note,
});
const envelopeDto = (e) => ({
  id: String(e._id), date: e.date, donorName: e.donorName, amount: e.amount, note: e.note,
  recordedByName: e.recordedByName, createdAt: e.createdAt, voided: e.voided, voidReason: e.voidReason, voidedByName: e.voidedByName,
});
function ledgerTotals(rows) {
  const valid = rows.filter((e) => !e.voided);
  return { total: valid.reduce((s, e) => s + e.amount, 0), count: valid.length, voidedCount: rows.length - valid.length };
}

exports.board = wrap(async (req, res) => {
  const booking = await loadJob(req, res);
  if (!booking) return;
  const date = pickDate(booking, req.query.date);
  const [steps, vendors, envelopes, items] = await Promise.all([
    RunStep.find({ bookingId: booking._id, date }).sort({ n: 1 }).lean(),
    VendorDelivery.find({ bookingId: booking._id }).sort({ createdAt: 1 }).lean(),
    MeritEnvelope.find({ bookingId: booking._id }).sort({ createdAt: 1 }).lean(),
    ScheduleItem.find({ bookingId: booking._id, date }).sort({ sortOrder: 1, time: 1 }).lean(),
  ]);
  const nights = [];
  for (let d = dateToStr(booking.startDate); d <= dateToStr(booking.endDate); d = addDays(d, 1)) nights.push(d);
  res.json({
    job: jobDto(booking),
    date,
    dateKind: date === dateToStr(booking.endDate) ? "CREMATION" : "CHANT",
    nights,
    live: LIVE.includes(booking.status),
    steps: steps.map(stepDto),
    vendors: vendors.map(vendorDto),
    ledger: { items: envelopes.map(envelopeDto), ...ledgerTotals(envelopes) },
    scheduleItems: items.map((i) => ({ id: String(i._id), time: i.time || "", type: i.type, title: i.title })),
  });
});

// เริ่มงานของคืนนั้น: สร้างขั้นตอนจากแม่แบบ (กดซ้ำได้ ไม่สร้างซ้ำ)
exports.initSteps = wrap(async (req, res) => {
  const booking = await loadJob(req, res);
  if (!booking) return;
  if (!LIVE.includes(booking.status)) return res.status(409).json({ message: "งานนี้ยังไม่ได้รับอนุมัติหรือปิดงานไปแล้ว" });
  const date = req.body && req.body.date;
  if (!isValidDateStr(date) || date < dateToStr(booking.startDate) || date > dateToStr(booking.endDate))
    return bad(res, "วันที่ต้องอยู่ในช่วงของงาน");
  if (!(await RunStep.exists({ bookingId: booking._id, date }))) {
    try {
      await RunStep.insertMany(await buildSteps(booking, date), { ordered: true });
    } catch (err) {
      if (err.code !== 11000) throw err; // มีคนกดเริ่มพร้อมกัน ถือว่าสร้างแล้ว
    }
  }
  const steps = await RunStep.find({ bookingId: booking._id, date }).sort({ n: 1 }).lean();
  res.status(201).json(steps.map(stepDto));
});

// ติ๊กขั้นที่กำลังดำเนินการว่าเสร็จ แล้วเลื่อนขั้นถัดไปเป็น active (กดซ้ำ/พร้อมกันไม่ได้ ตอบ 409)
exports.completeStep = wrap(async (req, res) => {
  if (!isId(req.params.id)) return bad(res, "รหัสขั้นตอนไม่ถูกต้อง");
  const step = await RunStep.findById(req.params.id).lean();
  if (!step) return res.status(404).json({ message: "ไม่พบขั้นตอน" });
  const booking = await loadJob(req, res, String(step.bookingId));
  if (!booking) return;
  if (!LIVE.includes(booking.status)) return res.status(409).json({ message: "งานนี้ปิดแล้วหรือยังไม่ได้รับอนุมัติ" });

  const done = await RunStep.findOneAndUpdate(
    { _id: step._id, status: "active" },
    { status: "done", doneBy: req.user._id, doneByName: req.user.name, doneAt: new Date() },
    { new: true },
  );
  if (!done) return res.status(409).json({ message: "ขั้นตอนนี้ไม่ได้อยู่ในสถานะกำลังดำเนินการ" });
  await RunStep.findOneAndUpdate({ bookingId: step.bookingId, date: step.date, n: step.n + 1, status: "wait" }, { status: "active" });
  if (["CONFIRMED", "PAID"].includes(booking.status))
    await Booking.updateOne({ _id: booking._id, status: { $in: ["CONFIRMED", "PAID"] } }, { status: "IN_PROGRESS" });
  const steps = await RunStep.find({ bookingId: step.bookingId, date: step.date }).sort({ n: 1 }).lean();
  res.json({ steps: steps.map(stepDto), allDone: steps.every((s) => s.status === "done") });
});

// ---------------------------------------------------------------- คู่ค้า / ตรวจรับของ
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
exports.addVendor = wrap(async (req, res) => {
  const booking = await loadJob(req, res);
  if (!booking) return;
  const b = req.body || {};
  if (!str(b.title)) return bad(res, "กรุณาระบุรายการที่ต้องตรวจรับ");
  if (b.expectedTime && !TIME_RE.test(b.expectedTime)) return bad(res, "เวลานัดต้องเป็นรูปแบบ HH:MM");
  const v = await VendorDelivery.create({
    bookingId: booking._id, templeId: booking.templeId, category: str(b.category) || "บริการเสริม",
    title: str(b.title), partner: str(b.partner), expectedTime: b.expectedTime || "", detail: str(b.detail),
  });
  res.status(201).json(vendorDto(v));
});

// สร้างรายการตรวจรับจากตัวเลือกเสริมที่เจ้าภาพเลือกไว้ (ไม่สร้างซ้ำถ้าชื่อซ้ำ)
exports.seedVendors = wrap(async (req, res) => {
  const booking = await loadJob(req, res);
  if (!booking) return;
  const existing = new Set((await VendorDelivery.find({ bookingId: booking._id }).select("title").lean()).map((v) => v.title));
  const ids = (booking.addons || []).map((a) => a.addonId).filter(Boolean);
  const cats = new Map((await Addon.find({ _id: { $in: ids } }).select("categoryName").lean()).map((a) => [String(a._id), a.categoryName]));
  const docs = [];
  for (const a of booking.addons || []) {
    if (!a.name || existing.has(a.name)) continue;
    docs.push({ bookingId: booking._id, templeId: booking.templeId, category: cats.get(String(a.addonId)) || "บริการเสริม", title: a.name, detail: `ตัวเลือกที่เจ้าภาพเลือกไว้ใน ${booking.bookingRef}` });
  }
  if (booking.guests && !existing.has(`อาหารว่างและเครื่องดื่มรับรองแขก (${booking.guests} ท่าน)`))
    docs.push({ bookingId: booking._id, templeId: booking.templeId, category: "อาหารว่าง", title: `อาหารว่างและเครื่องดื่มรับรองแขก (${booking.guests} ท่าน)`, detail: `ตามแพ็กเกจ ${booking.packageName}` });
  const created = docs.length ? await VendorDelivery.insertMany(docs) : [];
  res.status(201).json({ created: created.length });
});

exports.updateVendor = wrap(async (req, res) => {
  if (!isId(req.params.id)) return bad(res, "รหัสไม่ถูกต้อง");
  const v = await VendorDelivery.findById(req.params.id);
  if (!v) return res.status(404).json({ message: "ไม่พบรายการ" });
  if (!(await loadJob(req, res, String(v.bookingId)))) return;
  const b = req.body || {};
  if (v.status === "RECEIVED" && b.status && b.status !== "RECEIVED") return res.status(409).json({ message: "ตรวจรับแล้ว ย้อนสถานะไม่ได้" });
  for (const k of ["category", "title", "partner", "detail", "note"]) if (b[k] !== undefined) v[k] = str(b[k]);
  if (!v.title) return bad(res, "ชื่อรายการห้ามเว้นว่าง");
  if (b.expectedTime !== undefined) {
    if (b.expectedTime && !TIME_RE.test(b.expectedTime)) return bad(res, "เวลานัดต้องเป็นรูปแบบ HH:MM");
    v.expectedTime = b.expectedTime || "";
  }
  if (b.status !== undefined && b.status !== v.status) {
    if (!["SHIPPING", "ARRIVED", "RECEIVED"].includes(b.status)) return bad(res, "สถานะไม่ถูกต้อง");
    v.status = b.status;
    if (b.status === "RECEIVED") {
      v.receivedBy = req.user._id;
      v.receivedByName = req.user.name;
      v.receivedAt = new Date();
      const n = (await VendorDelivery.countDocuments({ bookingId: v.bookingId, status: "RECEIVED" })) + 1;
      v.ref = `REC-${new Date().getFullYear() + 543}-${String(v._id).slice(-4).toUpperCase()}${n}`;
    }
  }
  await v.save();
  res.json(vendorDto(v));
});

// ---------------------------------------------------------------- ซองทำบุญ
exports.addEnvelope = wrap(async (req, res) => {
  const booking = await loadJob(req, res);
  if (!booking) return;
  if (!LIVE.includes(booking.status)) return res.status(409).json({ message: "งานนี้ปิดแล้วหรือยังไม่ได้รับอนุมัติ จึงบันทึกซองไม่ได้" });
  const b = req.body || {};
  const amount = Number(b.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) return bad(res, "จำนวนเงินต้องมากกว่า 0 และไม่เกิน 10,000,000 บาท");
  const date = b.date && isValidDateStr(b.date) ? b.date : pickDate(booking);
  if (date < dateToStr(booking.startDate) || date > dateToStr(booking.endDate)) return bad(res, "วันที่ต้องอยู่ในช่วงของงาน");
  const e = await MeritEnvelope.create({
    bookingId: booking._id, date, amount: Math.round(amount * 100) / 100,
    donorName: str(b.donorName) || "ไม่ประสงค์ออกนาม", note: str(b.note),
    recordedBy: req.user._id, recordedByName: req.user.name,
  });
  res.status(201).json(envelopeDto(e));
});

exports.voidEnvelope = wrap(async (req, res) => {
  if (!isId(req.params.id)) return bad(res, "รหัสไม่ถูกต้อง");
  const reason = str(req.body && req.body.reason);
  if (!reason) return bad(res, "กรุณาระบุเหตุผลที่ยกเลิกซอง");
  const e = await MeritEnvelope.findById(req.params.id).lean();
  if (!e) return res.status(404).json({ message: "ไม่พบรายการซอง" });
  if (!(await loadJob(req, res, String(e.bookingId)))) return;
  const upd = await MeritEnvelope.findOneAndUpdate(
    { _id: e._id, voided: false },
    { voided: true, voidReason: reason.slice(0, 300), voidedByName: req.user.name, voidedAt: new Date() },
    { new: true },
  );
  if (!upd) return res.status(409).json({ message: "รายการนี้ถูกยกเลิกไปแล้ว" });
  res.json(envelopeDto(upd));
});

// ---------------------------------------------------------------- จัดบุคลากรเข้ากำหนดการ
exports.assignments = wrap(async (req, res) => {
  const booking = await loadJob(req, res);
  if (!booking) return;
  const [rows, persons] = await Promise.all([
    PersonAssignment.find({ bookingId: booking._id }).sort({ date: 1 }).lean(),
    Person.find({ templeId: booking.templeId, isActive: true }).sort({ type: 1, name: 1 }).lean(),
  ]);
  const byId = new Map(persons.map((p) => [String(p._id), p]));
  res.json({
    assignments: rows.map((a) => ({ id: String(a._id), date: a.date, role: a.role, personId: String(a.personId), name: byId.get(String(a.personId))?.name || "(ไม่ใช้งานแล้ว)" })),
    persons: persons.map((p) => ({ id: String(p._id), name: p.name, type: p.type, title: p.title || "" })),
  });
});

const ROLE_FOR_TYPE = { MONK: ["CHIEF", "CHANT"], DEACON: ["MC"], MC: ["MC"] };
exports.assign = wrap(async (req, res) => {
  const booking = await loadJob(req, res);
  if (!booking) return;
  const { date, personId, role } = req.body || {};
  if (!isValidDateStr(date) || date < dateToStr(booking.startDate) || date > dateToStr(booking.endDate)) return bad(res, "วันที่ต้องอยู่ในช่วงของงาน");
  if (!isId(str(personId))) return bad(res, "รหัสบุคลากรไม่ถูกต้อง");
  const person = await Person.findOne({ _id: personId, templeId: booking.templeId, isActive: true }).lean();
  if (!person) return bad(res, "ไม่พบบุคลากรของวัดนี้ หรือถูกระงับแล้ว");
  if (!["CHIEF", "MC", "CHANT"].includes(role) || !ROLE_FOR_TYPE[person.type].includes(role)) return bad(res, `หน้าที่ไม่ตรงกับประเภทบุคลากร (${person.type})`);
  if (role === "CHIEF" && (await PersonAssignment.exists({ bookingId: booking._id, date, role: "CHIEF" })))
    return res.status(409).json({ message: "คืนนี้มีพระประธานแล้ว 1 รูป" });
  const clash = await PersonAssignment.findOne({ personId: person._id, date }).lean();
  if (clash) {
    const other = await Booking.findById(clash.bookingId).select("bookingRef").lean();
    return res.status(409).json({ code: "PERSON_BUSY", message: `${person.name} ถูกจัดไว้แล้วในวันที่ ${date} (งาน ${other ? other.bookingRef : "อื่น"})` });
  }
  const a = await PersonAssignment.create({ personId: person._id, bookingId: booking._id, date, role });
  res.status(201).json({ id: String(a._id), date, role, personId: String(person._id), name: person.name });
});

exports.unassign = wrap(async (req, res) => {
  if (!isId(req.params.id)) return bad(res, "รหัสไม่ถูกต้อง");
  const a = await PersonAssignment.findById(req.params.id).lean();
  if (!a) return res.status(404).json({ message: "ไม่พบรายการ" });
  if (!(await loadJob(req, res, String(a.bookingId)))) return;
  await PersonAssignment.deleteOne({ _id: a._id });
  res.json({ success: true });
});

// ---------------------------------------------------------------- สรุปงาน + เปลี่ยนสถานะ
exports.summary = wrap(async (req, res) => {
  const booking = await loadJob(req, res);
  if (!booking) return;
  const [steps, vendors, envelopes, assignments] = await Promise.all([
    RunStep.find({ bookingId: booking._id }).lean(),
    VendorDelivery.find({ bookingId: booking._id }).lean(),
    MeritEnvelope.find({ bookingId: booking._id }).sort({ createdAt: 1 }).lean(),
    PersonAssignment.countDocuments({ bookingId: booking._id }),
  ]);
  const nights = [];
  for (let d = dateToStr(booking.startDate); d <= dateToStr(booking.endDate); d = addDays(d, 1)) {
    const ds = steps.filter((s) => s.date === d);
    const env = envelopes.filter((e) => e.date === d);
    nights.push({
      date: d, kind: d === dateToStr(booking.endDate) ? "CREMATION" : "CHANT",
      stepsTotal: ds.length, stepsDone: ds.filter((s) => s.status === "done").length,
      envelopeTotal: ledgerTotals(env).total,
    });
  }
  res.json({
    job: jobDto(booking), nights,
    steps: { total: steps.length, done: steps.filter((s) => s.status === "done").length },
    vendors: { total: vendors.length, received: vendors.filter((v) => v.status === "RECEIVED").length },
    ledger: ledgerTotals(envelopes),
    assignments,
    canStart: ["CONFIRMED", "PAID"].includes(booking.status),
    canComplete: booking.status === "IN_PROGRESS",
  });
});

// เริ่มงาน (CONFIRMED/PAID -> IN_PROGRESS) หรือปิดงาน (IN_PROGRESS -> COMPLETED) — ปิดงานแล้วงานจะเข้าหน้าประวัติของเจ้าหน้าที่วัด
exports.setStatus = wrap(async (req, res) => {
  const booking = await loadJob(req, res);
  if (!booking) return;
  const next = req.body && req.body.status;
  const from = { IN_PROGRESS: ["CONFIRMED", "PAID"], COMPLETED: ["IN_PROGRESS"] }[next];
  if (!from) return bad(res, "สถานะต้องเป็น IN_PROGRESS หรือ COMPLETED");
  if (next === "COMPLETED") {
    const pendingVendors = await VendorDelivery.countDocuments({ bookingId: booking._id, status: { $ne: "RECEIVED" } });
    if (pendingVendors > 0 && !req.body.force)
      return res.status(409).json({ code: "VENDORS_PENDING", count: pendingVendors, message: `ยังมีของที่ยังไม่ตรวจรับ ${pendingVendors} รายการ` });
  }
  const upd = await Booking.findOneAndUpdate({ _id: booking._id, status: { $in: from } }, { status: next }, { new: true }).lean();
  if (!upd) return res.status(409).json({ message: `เปลี่ยนเป็น ${next} ไม่ได้จากสถานะ ${booking.status}` });
  res.json(jobDto(upd));
});
