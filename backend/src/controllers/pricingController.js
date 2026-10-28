// controllers/pricingController.js
// POST /api/pricing/calc        คำนวณราคาจากข้อมูลปัจจุบัน (หน้าจอง/สไลเดอร์แขก)
// POST /api/bookings/:id/recalc คำนวณใหม่จาก snapshot ในงาน (แก้แขก/คืน/ตัวเลือก) คืนส่วนต่าง

const { Booking } = require("../models");
const { calcPrice, recalcFromBooking, AppError } = require("../utils/pricing");

const isId = (v) => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v);

function sendError(res, err) {
  if (err instanceof AppError)
    return res.status(err.status).json({ code: err.code, message: err.message });
  if (err.name === "CastError")
    return res.status(400).json({ code: "INVALID_ID", message: "รหัสอ้างอิงไม่ถูกต้อง" });
  console.error(err);
  return res.status(500).json({ code: "SERVER_ERROR", message: "เกิดข้อผิดพลาดในระบบ" });
}

// ---------- 1) คำนวณราคา (ใช้ตอนจอง) ----------
// body: { packageId, optionIds?, guestCount, nights, hallId }
exports.calc = async (req, res) => {
  try {
    const { packageId, optionIds, hallId } = req.body || {};
    const result = await calcPrice({
      packageId,
      optionIds: Array.isArray(optionIds) ? optionIds : [],
      guestCount: Number(req.body.guestCount),
      nights: Number(req.body.nights),
      hallId,
    });
    res.json(result);
  } catch (err) {
    sendError(res, err);
  }
};

// ---------- 2) คำนวณใหม่จาก snapshot (คืนส่วนต่าง) ----------
// body: { guestCount?, nights?, optionIds? }  ไม่ส่ง = ใช้ค่าเดิมของงาน
exports.recalc = async (req, res) => {
  try {
    if (!isId(req.params.id))
      throw new AppError("INVALID_ID", "รหัสงานไม่ถูกต้อง");

    const booking = await Booking.findById(req.params.id).lean();
    if (!booking) throw new AppError("BOOKING_NOT_FOUND", "ไม่พบงานที่ระบุ", 404);

    // เจ้าของงาน หรือทีมงาน/แอดมิน
    const isOwner = booking.hostId && String(booking.hostId) === String(req.user._id);
    if (!isOwner && !["STAFF", "ADMIN"].includes(req.user.role))
      throw new AppError("FORBIDDEN", "ท่านไม่มีสิทธิ์ดูงานนี้", 403);

    const { guestCount, nights, optionIds } = req.body || {};
    const result = await recalcFromBooking(booking, {
      guestCount: guestCount != null ? Number(guestCount) : undefined,
      nights: nights != null ? Number(nights) : undefined,
      optionIds: Array.isArray(optionIds) ? optionIds : undefined,
    });
    res.json(result);
  } catch (err) {
    sendError(res, err);
  }
};
