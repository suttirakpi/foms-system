// controllers/staffBookingController.js
// ฝั่งเจ้าหน้าที่วัด: รายการจอง (อนุมัติ/ประวัติ), อนุมัติ/ปฏิเสธ, ปฏิทินศาลา
// STAFF เห็นเฉพาะงานของวัดที่ตัวเองสังกัด (User.templeId) ส่วน ADMIN เห็นทุกวัด
const { Booking, Temple } = require("../models/FuneralModels");
const HallReservation = require("../models/HallReservation");
const ScheduleItem = require("../models/ScheduleItem");
const User = require("../models/User");
const { addDays, dateToStr, isValidDateStr, todayInBangkok } = require("../utils/dates");

const STATUSES = ["PENDING", "CONFIRMED", "PAID", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const MAX_ROWS = 500;
const isId = (v) => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v);
const bad = (res, message) => res.status(400).json({ message });
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// กรองตามวัดของผู้ใช้ (ADMIN หรือบัญชีที่ไม่มีวัดสังกัด = ไม่กรอง)
function templeScope(req) {
  if (req.user.role === "ADMIN" || !req.user.templeId) return {};
  return { templeId: req.user.templeId };
}

// แปลง Booking เป็นรูปที่หน้าเจ้าหน้าที่ใช้ พร้อมข้อมูลที่ต้อง join (ความจุศาลา, เบอร์เจ้าภาพ)
async function toDtos(bookings) {
  const [temples, users] = await Promise.all([
    Temple.find({ _id: { $in: [...new Set(bookings.map((b) => String(b.templeId)))] } }).lean(),
    User.find({ _id: { $in: bookings.map((b) => b.hostId) } })
      .select("phone")
      .lean(),
  ]);
  const capacity = new Map();
  for (const t of temples) for (const h of t.halls) capacity.set(String(h._id), h.capacity);
  const phone = new Map(users.map((u) => [String(u._id), u.phone]));
  const today = todayInBangkok();
  const tomorrow = addDays(today, 1);

  return bookings.map((b) => {
    const startISO = dateToStr(b.startDate);
    const cap = capacity.get(String(b.hallId)) || 0;
    let flag = "NORMAL";
    if (startISO <= tomorrow) flag = "URGENT";
    else if (cap && b.guests > cap) flag = "OVER_CAPACITY";
    return {
      id: String(b._id),
      bookingRef: b.bookingRef,
      status: b.status,
      paymentStatus: b.paymentStatus,
      submittedAt: b.createdAt,
      flag,
      hostName: b.hostName,
      hostPhone: phone.get(String(b.hostId)) || "",
      deceasedName: b.deceasedName,
      templeName: b.templeName,
      hallName: b.hallName,
      hallCapacity: cap,
      packageName: b.packageName,
      addons: (b.addons || []).map((a) => a.name),
      startISO,
      cremationISO: dateToStr(b.endDate),
      nights: b.nights,
      guests: b.guests,
      grandTotal: b.pricing.grandTotal,
      rejectReason: b.rejectReason || "",
      cancelReason: b.cancelReason || "",
    };
  });
}

// GET /api/staff/bookings?status=PENDING,CONFIRMED&from=YYYY-MM-DD&to=YYYY-MM-DD&q=คำค้น
exports.list = async (req, res, next) => {
  try {
    const filter = { ...templeScope(req) };
    if (req.query.status) {
      const wanted = String(req.query.status).split(",").map((s) => s.trim());
      if (!wanted.every((s) => STATUSES.includes(s))) return bad(res, "สถานะที่ระบุไม่ถูกต้อง");
      filter.status = { $in: wanted };
    }
    const { from, to } = req.query;
    if ((from && !isValidDateStr(from)) || (to && !isValidDateStr(to)))
      return bad(res, "วันที่ต้องเป็นรูปแบบ YYYY-MM-DD");
    if (from || to) {
      filter.startDate = {};
      if (from) filter.startDate.$gte = new Date(from);
      if (to) filter.startDate.$lte = new Date(to);
    }
    const q = String(req.query.q || "").trim();
    if (q) {
      const re = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ bookingRef: re }, { hostName: re }, { deceasedName: re }];
    }
    const descending = req.query.sort === "desc"; // ประวัติ: ใหม่ก่อน / อนุมัติ: ใกล้ถึงก่อน
    const bookings = await Booking.find(filter)
      .sort({ startDate: descending ? -1 : 1, createdAt: -1 })
      .limit(MAX_ROWS)
      .lean();
    res.json(await toDtos(bookings));
  } catch (err) {
    next(err);
  }
};

// เปลี่ยนสถานะจาก PENDING แบบอะตอมมิก (กันสองคนกดอนุมัติ/ปฏิเสธงานเดียวกันพร้อมกัน)
async function decide(req, res, next, update, afterUpdate) {
  try {
    if (!isId(req.params.id)) return bad(res, "รหัสงานไม่ถูกต้อง");
    const scope = templeScope(req);
    const updated = await Booking.findOneAndUpdate(
      { _id: req.params.id, status: "PENDING", ...scope },
      update,
      { new: true },
    );
    if (!updated) {
      const exists = await Booking.exists({ _id: req.params.id, ...scope });
      return exists
        ? res.status(409).json({ message: "งานนี้ถูกพิจารณาไปแล้ว" })
        : res.status(404).json({ message: "ไม่พบงานที่ระบุ" });
    }
    if (afterUpdate) await afterUpdate(updated);
    const [dto] = await toDtos([updated.toObject()]);
    res.json(dto);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/staff/bookings/:id/approve  (PENDING -> CONFIRMED)
exports.approve = (req, res, next) =>
  decide(req, res, next, { status: "CONFIRMED", $unset: { rejectReason: "" } });

// PATCH /api/staff/bookings/:id/reject  body: { reason? }  (PENDING -> CANCELLED + คืนคิวศาลา)
exports.reject = (req, res, next) => {
  const reason = String((req.body && req.body.reason) || "").trim().slice(0, 500);
  return decide(
    req,
    res,
    next,
    { status: "CANCELLED", rejectReason: reason },
    (booking) => HallReservation.deleteMany({ bookingId: booking._id }),
  );
};

// GET /api/staff/calendar?month=YYYY-MM  — งานที่ใช้ศาลา/เมรุอย่างน้อย 1 วันในเดือนนั้น
exports.calendar = async (req, res, next) => {
  try {
    const month = String(req.query.month || todayInBangkok().slice(0, 7));
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return bad(res, "เดือนต้องเป็นรูปแบบ YYYY-MM");
    const first = `${month}-01`;
    const [y, m] = month.split("-").map(Number);
    const last = dateToStr(new Date(Date.UTC(y, m, 0)));

    const bookings = await Booking.find({
      ...templeScope(req),
      status: { $ne: "CANCELLED" },
      startDate: { $lte: new Date(last) },
      endDate: { $gte: new Date(first) },
    })
      .sort({ startDate: 1 })
      .lean();

    const [dtos, items] = await Promise.all([
      toDtos(bookings),
      ScheduleItem.find({ bookingId: { $in: bookings.map((b) => b._id) } })
        .sort({ date: 1, time: 1, sortOrder: 1 })
        .lean(),
    ]);
    const byBooking = new Map();
    for (const it of items) {
      const key = String(it.bookingId);
      if (!byBooking.has(key)) byBooking.set(key, []);
      byBooking.get(key).push({ date: it.date, time: it.time || "", type: it.type, title: it.title });
    }

    res.json(
      dtos.map((d) => ({
        id: d.id,
        ref: d.bookingRef,
        status: d.status,
        hallName: d.hallName,
        hallCapacity: d.hallCapacity,
        start: d.startISO,
        end: addDays(d.cremationISO, -1), // คืนสุดท้ายที่ใช้ศาลา
        cremationISO: d.cremationISO,
        deceasedName: d.deceasedName,
        hostName: d.hostName,
        hostPhone: d.hostPhone,
        guests: d.guests,
        packageName: d.packageName,
        addons: d.addons,
        schedule: byBooking.get(d.id) || [],
      })),
    );
  } catch (err) {
    next(err);
  }
};
