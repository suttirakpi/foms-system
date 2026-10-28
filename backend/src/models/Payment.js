// models/Payment.js
// 1 แถว = 1 งวดการชำระ  (จ่ายครั้งเดียว = 1 แถว, แบ่งงวด = 2 แถว: มัดจำ + ยอดคงเหลือ)
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    plan: { type: String, enum: ["FULL", "INSTALLMENT"], required: true },
    installmentNo: { type: Number, required: true }, // 1, 2
    label: { type: String, required: true },         // "ชำระเต็มจำนวน" / "มัดจำ" / "ยอดคงเหลือ"
    amountDue: { type: Number, required: true },     // ยอดที่ต้องจ่ายในงวดนี้

    // UNPAID = ยังไม่ส่งสลิป, PENDING = รอแอดมินตรวจ, APPROVED / REJECTED = ผลตรวจ
    status: {
      type: String,
      enum: ["UNPAID", "PENDING", "APPROVED", "REJECTED"],
      default: "UNPAID",
      index: true,
    },

    // ข้อมูลที่เจ้าภาพกรอกตอนส่งสลิป
    slip: {
      path: String,         // ชื่อไฟล์ในโฟลเดอร์เก็บสลิป
      hash: String,         // sha256 ของไฟล์ ใช้เช็กสลิปซ้ำ
      originalName: String,
    },
    paidAmount: Number,
    paidAt: Date,

    // ผลตรวจโดยแอดมิน
    reviewedBy: { type: mongoose.Schema.Types.ObjectId },
    reviewedAt: Date,
    rejectReason: String,
  },
  { timestamps: true }
);

paymentSchema.index({ bookingId: 1, installmentNo: 1 }, { unique: true });
paymentSchema.index({ "slip.hash": 1 });

module.exports = mongoose.model("Payment", paymentSchema);