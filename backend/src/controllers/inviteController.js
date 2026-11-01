// controllers/inviteController.js
// ลิงก์บัตรเชิญสาธารณะ: เจ้าภาพสร้างลิงก์ (shareToken) ส่งให้ญาติ แขกเปิดดูได้โดยไม่ต้องล็อกอิน
// หน้าสาธารณะแสดงเฉพาะข้อมูลที่เหมาะกับบัตรเชิญ (ไม่มีเบอร์โทร ราคา หรือข้อมูลการชำระเงิน)
const crypto = require("crypto");
const { Booking, ScheduleItem } = require("../models");
const { dateToStr } = require("../utils/dates");

const isId = (v) => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v);

async function loadMine(req, res) {
  if (!isId(req.params.id)) return void res.status(400).json({ message: "รหัสงานไม่ถูกต้อง" });
  const booking = await Booking.findById(req.params.id);
  if (!booking) return void res.status(404).json({ message: "ไม่พบงานที่ระบุ" });
  const isOwner = booking.hostId && String(booking.hostId) === String(req.user._id);
  if (!isOwner && !["STAFF", "ADMIN"].includes(req.user.role))
    return void res.status(403).json({ message: "ท่านไม่มีสิทธิ์จัดการงานนี้" });
  return booking;
}

// POST /api/bookings/:id/share — สร้างลิงก์ (มีอยู่แล้วคืนอันเดิม)
exports.createLink = async (req, res, next) => {
  try {
    const booking = await loadMine(req, res);
    if (!booking) return;
    if (booking.status === "CANCELLED") return res.status(409).json({ message: "งานนี้ถูกยกเลิกแล้ว จึงสร้างบัตรเชิญไม่ได้" });
    if (!booking.shareToken) {
      booking.shareToken = crypto.randomBytes(18).toString("base64url");
      await booking.save();
    }
    res.json({ token: booking.shareToken });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/bookings/:id/share — ยกเลิกลิงก์ (ลิงก์เก่าใช้ไม่ได้ทันที)
exports.revokeLink = async (req, res, next) => {
  try {
    const booking = await loadMine(req, res);
    if (!booking) return;
    await Booking.updateOne({ _id: booking._id }, { $unset: { shareToken: "" } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// GET /api/public/invite/:token — ไม่ต้องล็อกอิน
exports.publicView = async (req, res, next) => {
  try {
    const token = String(req.params.token || "");
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return res.status(404).json({ message: "ไม่พบบัตรเชิญ" });
    const booking = await Booking.findOne({ shareToken: token, status: { $ne: "CANCELLED" } }).lean();
    if (!booking) return res.status(404).json({ message: "ไม่พบบัตรเชิญ หรือลิงก์ถูกยกเลิกแล้ว" });
    const items = await ScheduleItem.find({ bookingId: booking._id, type: { $in: ["BATHING", "CHANT", "CREMATION"] } })
      .sort({ date: 1, sortOrder: 1, time: 1 })
      .lean();
    res.set("Cache-Control", "no-store");
    res.json({
      deceasedName: booking.deceasedName,
      hostName: booking.hostName,
      templeName: booking.templeName,
      hallName: booking.hallName,
      startISO: dateToStr(booking.startDate),
      cremationISO: dateToStr(booking.endDate),
      nights: booking.nights,
      schedule: items.map((i) => ({ date: i.date, time: i.time || "", type: i.type, title: i.title })),
    });
  } catch (err) {
    next(err);
  }
};
