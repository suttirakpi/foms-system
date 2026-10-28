// controllers/scheduleController.js
// POST   /api/bookings/:id/schedule/generate  สร้างกำหนดการพิธี (แทนที่ของเดิมทั้งหมด)
// GET    /api/bookings/:id/schedule           ดูกำหนดการ + ชื่อพระ/มัคนายก (join PersonAssignment)
// PATCH  /api/schedule-items/:id              แก้เวลา/หัวข้อ/วันที่ รายการเดียว
// DELETE /api/schedule-items/:id              ลบรายการเดียว
//
// รูปแบบงาน (ตามข้อตกลง):
//   - พิธีสรงน้ำศพ        วันเริ่มงาน (startDate)        เวลาเริ่มต้น 16:00
//   - สวดพระอภิธรรม      ทุกคืน (startDate .. ก่อนฌาปนกิจ) เวลาเริ่มต้น 19:00
//   - พิธีฌาปนกิจ        วัน endDate (startDate + nights) เวลาเริ่มต้น 10:00
//   - ทำบุญ 7/50/100 วัน  endDate + 6 / +49 / +99
//     (MERIT_DAY_COUNT_START = CREMATION_DAY_IS_DAY_1 → วันฌาปนกิจ = วันที่ 1 ของการนับ)
//   เวลาทั้งหมดอ่านจาก TempleRule ของวัดก่อน ไม่พบจึงใช้ค่า default
//   วันพระของวันฌาปนกิจ → "เตือน" เท่านั้น (warnings[]) ไม่บล็อกการสร้าง

const {
  Booking,
  ScheduleItem,
  TempleRule,
  PersonAssignment,
  Person,
} = require("../models");
const { AppError } = require("../utils/pricing");
const { addDays, nightDates, dateToStr, isValidDateStr } = require("../utils/dates");
const { isBuddhistDay } = require("../utils/buddhistDays");

const isId = (v) => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v);
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// เวลาพิธีเริ่มต้น (override ด้วย TempleRule: BATHING_START_TIME / CHANT_START_TIME / CREMATION_START_TIME)
const DEFAULT_TIMES = { BATHING: "16:00", CHANT: "19:00", CREMATION: "10:00" };

function sendError(res, err) {
  if (err instanceof AppError)
    return res.status(err.status).json({ code: err.code, message: err.message });
  if (err.name === "CastError")
    return res.status(400).json({ code: "INVALID_ID", message: "รหัสอ้างอิงไม่ถูกต้อง" });
  console.error(err);
  return res.status(500).json({ code: "SERVER_ERROR", message: "เกิดข้อผิดพลาดในระบบ" });
}

// โหลดกฎวัดทั้งหมดของงานนี้เป็น object { KEY: value }
async function loadRules(templeId) {
  const rows = await TempleRule.find({ templeId }).lean();
  const rules = {};
  for (const r of rows) rules[r.key] = r.value;
  return rules;
}

function ruleTime(rules, key, fallback) {
  const v = rules[key];
  return typeof v === "string" && TIME_RE.test(v) ? v : fallback;
}

// ค่ากฎเป็น boolean? (ตีค่า string "false"/0 เป็นปิด เผื่อคนตั้งค่าผิดรูปแบบ)
function ruleEnabled(value) {
  if (value === undefined) return true; // ไม่มีกฎ = เตือนไว้ก่อน (ปลอดภัยกว่า เพราะเป็นแค่ warning)
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return !["false", "0", "no"].includes(value.toLowerCase());
  return Boolean(value);
}

function assertBookingAccess(req, booking) {
  const isOwner =
    booking.hostId && String(booking.hostId) === String(req.user._id || req.user.id);
  if (!isOwner && !["STAFF", "OPS", "ADMIN"].includes(req.user.role))
    throw new AppError("FORBIDDEN", "ท่านไม่มีสิทธิ์ดูงานนี้", 403);
}

// ---------- 1) สร้างกำหนดการ (แทนที่ของเดิมทั้งหมด) ----------
exports.generate = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isId(id)) throw new AppError("INVALID_ID", "รหัสงานไม่ถูกต้อง");

    const booking = await Booking.findById(id).lean();
    if (!booking) throw new AppError("BOOKING_NOT_FOUND", "ไม่พบงานที่ระบุ", 404);
    if (booking.status === "CANCELLED")
      throw new AppError(
        "BOOKING_CANCELLED",
        "งานถูกยกเลิกแล้ว ไม่สามารถสร้างกำหนดการได้",
        409,
      );

    const rules = await loadRules(booking.templeId);
    const start = dateToStr(booking.startDate);
    const end = dateToStr(booking.endDate); // = startDate + nights (วันฌาปนกิจ)
    const times = {
      BATHING: ruleTime(rules, "BATHING_START_TIME", DEFAULT_TIMES.BATHING),
      CHANT: ruleTime(rules, "CHANT_START_TIME", DEFAULT_TIMES.CHANT),
      CREMATION: ruleTime(rules, "CREMATION_START_TIME", DEFAULT_TIMES.CREMATION),
    };

    // ---- เตือนวันพระของวันฌาปนกิจ (ไม่บล็อก ตามกฎ NO_CREMATION_ON_BUDDHIST_DAY) ----
    const warnings = [];
    if (ruleEnabled(rules.NO_CREMATION_ON_BUDDHIST_DAY) && isBuddhistDay(end)) {
      warnings.push({
        rule: "NO_CREMATION_ON_BUDDHIST_DAY",
        date: end,
        message: `วันฌาปนกิจ ${end} ตรงกับวันพระ — กรุณาตรวจสอบกับทางวัดก่อนดำเนินการ`,
      });
    }

    // ---- รายการพิธี ----
    const docs = [];
    const base = { bookingId: booking._id, hallId: booking.hallId };

    docs.push({
      ...base,
      date: start,
      time: times.BATHING,
      type: "BATHING",
      title: "พิธีสรงน้ำศพ",
      sortOrder: 0,
    });

    nightDates(start, booking.nights).forEach((d, i) => {
      docs.push({
        ...base,
        date: d,
        time: times.CHANT,
        type: "CHANT",
        title: `สวดพระอภิธรรม (คืนที่ ${i + 1})`,
        sortOrder: 1,
      });
    });

    docs.push({
      ...base,
      date: end,
      time: times.CREMATION,
      type: "CREMATION",
      title: "พิธีฌาปนกิจ",
      sortOrder: 0,
    });

    // วันทำบุญ 7/50/100 — นับจากวันฌาปนกิจเป็นวันที่ 1 (ค่าเดิม DEATH_DAY_IS_DAY_1 ยังรองรับ)
    const meritBase =
      rules.MERIT_DAY_COUNT_START === "DEATH_DAY_IS_DAY_1" ? start : end;
    for (const n of [7, 50, 100]) {
      docs.push({
        bookingId: booking._id,
        date: addDays(meritBase, n - 1),
        type: "MERIT",
        title: `ทำบุญอุทิศส่วนกุศล ${n} วัน`,
        sortOrder: 0,
      });
    }

    // แทนที่ของเดิมทั้งหมด (generate ซ้ำได้ ไม่เกิดงานซ้ำ)
    await ScheduleItem.deleteMany({ bookingId: booking._id });
    const items = await ScheduleItem.insertMany(docs);

    res.status(201).json({ bookingId: booking._id, count: items.length, items, warnings });
  } catch (err) {
    sendError(res, err);
  }
};

// ---------- 2) ดูกำหนดการ (เจ้าของงาน/ทีมงาน) + join ชื่อจาก PersonAssignment ----------
exports.listByBooking = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isId(id)) throw new AppError("INVALID_ID", "รหัสงานไม่ถูกต้อง");

    const booking = await Booking.findById(id).lean();
    if (!booking) throw new AppError("BOOKING_NOT_FOUND", "ไม่พบงานที่ระบุ", 404);
    assertBookingAccess(req, booking);

    const [items, assignments] = await Promise.all([
      ScheduleItem.find({ bookingId: booking._id })
        .sort({ date: 1, sortOrder: 1, time: 1 })
        .lean(),
      PersonAssignment.find({ bookingId: booking._id }).lean(),
    ]);

    // join ชื่อคน (PersonAssignment เก็บแค่ personId)
    const personIds = [...new Set(assignments.map((a) => String(a.personId)))];
    const persons = personIds.length
      ? await Person.find({ _id: { $in: personIds } }).lean()
      : [];
    const nameById = new Map(persons.map((p) => [String(p._id), p.name]));

    const byDate = {};
    for (const a of assignments) {
      (byDate[a.date] = byDate[a.date] || []).push({
        personId: a.personId,
        name: nameById.get(String(a.personId)) || "ไม่พบชื่อ",
        role: a.role,
      });
    }

    res.json({
      bookingId: booking._id,
      items: items.map((it) => ({ ...it, persons: byDate[it.date] || [] })),
    });
  } catch (err) {
    sendError(res, err);
  }
};

// ---------- 3) แก้รายการเดียว ----------
// body: { title?, time?, date? } — ส่ง field ไหนก็แก้ field นั้น (time: null = ไม่กำหนดเวลา)
exports.updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isId(id)) throw new AppError("INVALID_ID", "รหัสรายการไม่ถูกต้อง");

    const { title, time, date } = req.body || {};
    const set = {};

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim())
        throw new AppError("INVALID_TITLE", "หัวข้อรายการต้องเป็นข้อความ");
      set.title = title.trim().slice(0, 200);
    }
    if (time !== undefined) {
      if (time === null || time === "") set.time = null;
      else if (typeof time !== "string" || !TIME_RE.test(time))
        throw new AppError("INVALID_TIME", "เวลารูปแบบต้องเป็น HH:mm (00:00-23:59)");
      else set.time = time;
    }
    if (date !== undefined) {
      if (typeof date !== "string" || !isValidDateStr(date))
        throw new AppError("INVALID_DATE", "วันที่ต้องเป็น YYYY-MM-DD ที่ถูกต้อง");
      set.date = date;
    }
    if (!Object.keys(set).length)
      throw new AppError("EMPTY_UPDATE", "ไม่มีข้อมูลที่ต้องการแก้ไข");

    const item = await ScheduleItem.findByIdAndUpdate(
      id,
      { $set: set },
      { new: true, runValidators: true },
    );
    if (!item) throw new AppError("ITEM_NOT_FOUND", "ไม่พบรายการกำหนดการ", 404);

    res.json({ item });
  } catch (err) {
    sendError(res, err);
  }
};

// ---------- 4) ลบรายการเดียว ----------
exports.deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isId(id)) throw new AppError("INVALID_ID", "รหัสรายการไม่ถูกต้อง");

    const item = await ScheduleItem.findByIdAndDelete(id);
    if (!item) throw new AppError("ITEM_NOT_FOUND", "ไม่พบรายการกำหนดการ", 404);

    res.json({ id: item._id, deleted: true });
  } catch (err) {
    sendError(res, err);
  }
};
