const mongoose = require("mongoose");

// บัญชีซองทำบุญของงาน: บันทึกแล้วแก้จำนวนเงินไม่ได้ ยกเลิกได้เฉพาะแบบ "void" พร้อมเหตุผล (เก็บหลักฐานไว้)
const schema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    donorName: { type: String, default: "ไม่ประสงค์ออกนาม", trim: true },
    amount: { type: Number, required: true, min: 1 },
    note: { type: String, default: "", trim: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recordedByName: { type: String, default: "" },
    voided: { type: Boolean, default: false },
    voidReason: { type: String, default: "" },
    voidedByName: { type: String, default: "" },
    voidedAt: { type: Date },
  },
  { timestamps: true },
);
schema.index({ bookingId: 1, date: 1, createdAt: 1 });

module.exports = mongoose.model("MeritEnvelope", schema);
