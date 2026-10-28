// controllers/paymentController.js
// POST  /api/bookings/:id/payment-plan   เจ้าภาพเลือกจ่ายเต็ม / แบ่งงวด (สร้างงวดให้)
// GET   /api/bookings/:id/payments       ดูงวดทั้งหมดของงาน
// POST  /api/payments/:id/slip           เจ้าภาพอัปโหลดสลิปของงวดนั้น
// GET   /api/payments/pending            คิวรอตรวจ (แอดมิน)
// GET   /api/payments/:id/slip           ดูรูปสลิป (แอดมิน/เจ้าภาพเจ้าของ)
// PATCH /api/payments/:id/review         แอดมินอนุมัติ/ปฏิเสธ

const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const { Booking, Temple } = require("../models");
const Payment = require("../models/Payment");
const { AppError } = require("../utils/pricing");

// ---------- ค่าตั้งต้น (แก้ที่นี่ที่เดียว) ----------
const DEPOSIT_PERCENT = 30; // มัดจำกี่ % ของยอดรวม (ให้ทีมยืนยัน)
const SLIP_DIR = path.join(__dirname, "..", "uploads", "slips");
const MAX_SLIP_BYTES = 5 * 1024 * 1024;
const EXT = { "image/jpeg": ".jpg", "image/png": ".png" };

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SLIP_BYTES },
  fileFilter: (req, file, cb) =>
    EXT[file.mimetype]
      ? cb(null, true)
      : cb(new AppError("INVALID_FILE", "รองรับเฉพาะรูป JPG หรือ PNG")),
});
exports.uploadMiddleware = upload.single("slip");

// ---------- helper ----------
function sendError(res, err) {
  if (err instanceof AppError)
    return res.status(err.status).json({ code: err.code, message: err.message });
  if (err.name === "MulterError")
    return res.status(400).json({ code: "INVALID_FILE", message: "อัปโหลดไฟล์ไม่สำเร็จ (ไฟล์ใหญ่เกิน 5MB หรือส่งผิดช่อง)" });
  if (err.name === "CastError")
    return res.status(400).json({ code: "INVALID_ID", message: "รหัสอ้างอิงไม่ถูกต้อง" });
  console.error(err);
  return res.status(500).json({ code: "SERVER_ERROR", message: "เกิดข้อผิดพลาดในระบบ" });
}

const isOwnerOrStaff = (req, booking) =>
  !(req.user && req.user.role === "HOST" &&
    String(booking.hostId) !== String(req.user._id || req.user.id));

function assertAccess(req, booking) {
  // TODO: ปรับให้ตรงกับ middleware ของ M2-01
  if (!isOwnerOrStaff(req, booking))
    throw new AppError("FORBIDDEN", "ไม่มีสิทธิ์ดูงานนี้", 403);
}

// อัปเดต booking.paymentStatus จากสถานะของทุกงวด
async function syncBookingPayment(bookingId) {
  const booking = await Booking.findById(bookingId).lean();
  const payments = await Payment.find({ bookingId }).lean();
  if (!booking) return null;

  const paid = payments
    .filter((p) => p.status === "APPROVED")
    .reduce((s, p) => s + p.amountDue, 0);
  const hasPending = payments.some((p) => p.status === "PENDING");

  let paymentStatus;
  if (paid >= booking.pricing.grandTotal) paymentStatus = "PAID";
  else if (paid > 0) paymentStatus = "PARTIAL";
  else if (hasPending) paymentStatus = "SLIP_UPLOADED";
  else paymentStatus = "UNPAID";

  await Booking.findByIdAndUpdate(bookingId, { paymentStatus }, { runValidators: true });
  return paymentStatus;
}

// ---------- 1) เลือกแผนการชำระ ----------
// body: { plan: "FULL" | "INSTALLMENT" }
exports.createPlan = async (req, res) => {
  try {
    const { plan } = req.body;
    if (!["FULL", "INSTALLMENT"].includes(plan))
      throw new AppError("INVALID_INPUT", 'plan ต้องเป็น "FULL" หรือ "INSTALLMENT"');

    const booking = await Booking.findById(req.params.id).lean();
    if (!booking) throw new AppError("BOOKING_NOT_FOUND", "ไม่พบงาน", 404);
    assertAccess(req, booking);

    // เปลี่ยนแผนได้เฉพาะตอนที่ยังไม่มีสลิปรอตรวจ/อนุมัติ
    const locked = await Payment.exists({
      bookingId: booking._id,
      status: { $in: ["PENDING", "APPROVED"] },
    });
    if (locked)
      throw new AppError("PLAN_LOCKED", "มีการชำระเงินแล้ว เปลี่ยนแผนไม่ได้", 409);

    const total = booking.pricing.grandTotal;
    let rows;
    if (plan === "FULL") {
      rows = [{ installmentNo: 1, label: "ชำระเต็มจำนวน", amountDue: total }];
    } else {
      const deposit = Math.round((total * DEPOSIT_PERCENT) / 100);
      rows = [
        { installmentNo: 1, label: "มัดจำ", amountDue: deposit },
        { installmentNo: 2, label: "ยอดคงเหลือ", amountDue: total - deposit },
      ];
    }

    await Payment.deleteMany({ bookingId: booking._id }); // ล้างงวดเดิม (ยังไม่มีสลิปที่ต้องเก็บ)
    const created = await Payment.insertMany(
      rows.map((r) => ({ ...r, bookingId: booking._id, plan }))
    );
    res.status(201).json({ plan, payments: created });
  } catch (err) {
    sendError(res, err);
  }
};

// ---------- 2) ดูงวดของงาน ----------
exports.listByBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).lean();
    if (!booking) throw new AppError("BOOKING_NOT_FOUND", "ไม่พบงาน", 404);
    assertAccess(req, booking);

    const payments = await Payment.find({ bookingId: booking._id })
      .sort({ installmentNo: 1 })
      .select("-slip.path -slip.hash")
      .lean();
    const temple = await Temple.findById(booking.templeId).select("bankName bankAccount").lean();
    res.json({
      total: booking.pricing.grandTotal,
      paymentStatus: booking.paymentStatus || "UNPAID",
      bank: temple ? { bankName: temple.bankName, bankAccount: temple.bankAccount } : null,
      payments,
    });
  } catch (err) {
    sendError(res, err);
  }
};

// ---------- 3) อัปโหลดสลิป ----------
// multipart/form-data: slip (ไฟล์), paidAmount, paidAt
exports.uploadSlip = async (req, res) => {
  try {
    if (!req.file) throw new AppError("INVALID_INPUT", "ต้องแนบรูปสลิป (ช่อง slip)");

    const payment = await Payment.findById(req.params.id);
    if (!payment) throw new AppError("PAYMENT_NOT_FOUND", "ไม่พบงวดการชำระ", 404);

    const booking = await Booking.findById(payment.bookingId).lean();
    if (!booking) throw new AppError("BOOKING_NOT_FOUND", "ไม่พบงาน", 404);
    assertAccess(req, booking);

    if (!["UNPAID", "REJECTED"].includes(payment.status))
      throw new AppError("INVALID_STATE", "งวดนี้ส่งสลิปแล้วหรืออนุมัติแล้ว", 409);

    // งวดที่ 2 ต้องรอให้งวดที่ 1 อนุมัติก่อน
    if (payment.installmentNo > 1) {
      const prev = await Payment.findOne({
        bookingId: payment.bookingId,
        installmentNo: payment.installmentNo - 1,
      }).lean();
      if (!prev || prev.status !== "APPROVED")
        throw new AppError("PREVIOUS_NOT_PAID", "ต้องชำระงวดก่อนหน้าให้อนุมัติก่อน", 409);
    }

    const paidAmount = Number(req.body.paidAmount);
    if (!Number.isFinite(paidAmount) || paidAmount <= 0)
      throw new AppError("INVALID_INPUT", "paidAmount ไม่ถูกต้อง");
    const paidAt = req.body.paidAt ? new Date(req.body.paidAt) : new Date();
    if (isNaN(paidAt)) throw new AppError("INVALID_INPUT", "paidAt ไม่ถูกต้อง");

    // เช็กสลิปซ้ำ (รูปเดียวกันเคยส่งมาแล้วในงวดอื่นที่รอตรวจ/อนุมัติ)
    const hash = crypto.createHash("sha256").update(req.file.buffer).digest("hex");
    const dup = await Payment.exists({
      _id: { $ne: payment._id },
      "slip.hash": hash,
      status: { $in: ["PENDING", "APPROVED"] },
    });
    if (dup) throw new AppError("DUPLICATE_SLIP", "สลิปนี้เคยถูกใช้แล้ว", 409);

    await fs.mkdir(SLIP_DIR, { recursive: true });
    const fileName = `${hash}${EXT[req.file.mimetype]}`;
    await fs.writeFile(path.join(SLIP_DIR, fileName), req.file.buffer);

    payment.slip = { path: fileName, hash, originalName: req.file.originalname };
    payment.paidAmount = paidAmount;
    payment.paidAt = paidAt;
    payment.status = "PENDING";
    payment.rejectReason = undefined;
    await payment.save();

    await syncBookingPayment(payment.bookingId);
    res.json({ id: payment._id, status: payment.status });
  } catch (err) {
    sendError(res, err);
  }
};

// ---------- 4) คิวรอตรวจ (แอดมิน) ----------
exports.listPending = async (req, res) => {
  try {
    const payments = await Payment.find({ status: "PENDING" })
      .sort({ updatedAt: 1 })
      .select("-slip.hash")
      .lean();
    res.json({ payments });
  } catch (err) {
    sendError(res, err);
  }
};

// ---------- 5) ดูรูปสลิป ----------
exports.getSlip = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).lean();
    if (!payment || !payment.slip || !payment.slip.path)
      throw new AppError("SLIP_NOT_FOUND", "ไม่พบสลิป", 404);

    const booking = await Booking.findById(payment.bookingId).lean();
    if (!booking) throw new AppError("BOOKING_NOT_FOUND", "ไม่พบงาน", 404);
    assertAccess(req, booking);

    const filePath = path.join(SLIP_DIR, payment.slip.path);
    await fs.access(filePath); // ไฟล์หายจากดิสก์ → 404 ไม่ใช่ 500
    res.sendFile(filePath);
  } catch (err) {
    if (err.code === "ENOENT")
      return res.status(404).json({ code: "SLIP_NOT_FOUND", message: "ไม่พบไฟล์สลิปบนระบบ" });
    sendError(res, err);
  }
};

// ---------- 6) แอดมินอนุมัติ/ปฏิเสธ ----------
// body: { decision: "APPROVE" | "REJECT", reason? }  (REJECT ต้องมี reason)
exports.review = async (req, res) => {
  try {
    const { decision, reason } = req.body;
    if (!["APPROVE", "REJECT"].includes(decision))
      throw new AppError("INVALID_INPUT", 'decision ต้องเป็น "APPROVE" หรือ "REJECT"');
    if (decision === "REJECT" && !reason)
      throw new AppError("INVALID_INPUT", "ต้องระบุเหตุผลที่ปฏิเสธ");

    const payment = await Payment.findById(req.params.id);
    if (!payment) throw new AppError("PAYMENT_NOT_FOUND", "ไม่พบงวดการชำระ", 404);
    if (payment.status !== "PENDING")
      throw new AppError("INVALID_STATE", "รายการนี้ไม่ได้อยู่ในสถานะรอตรวจ", 409);

    payment.status = decision === "APPROVE" ? "APPROVED" : "REJECTED";
    payment.rejectReason = decision === "REJECT" ? reason : undefined;
    payment.reviewedBy = req.user && (req.user._id || req.user.id);
    payment.reviewedAt = new Date();
    await payment.save();

    const paymentStatus = await syncBookingPayment(payment.bookingId);
    res.json({ id: payment._id, status: payment.status, bookingPaymentStatus: paymentStatus });
  } catch (err) {
    sendError(res, err);
  }
};
