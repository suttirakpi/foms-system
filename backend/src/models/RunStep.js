const mongoose = require("mongoose");

// ขั้นตอนพิธีรายคืนที่ทีมจัดงาน (OPS) ไล่ติ๊กหน้างาน: สร้างจากแม่แบบเมื่อกด "เริ่มงานคืนนี้"
// มี step เดียวที่เป็น active ในแต่ละคืน (ขั้นแรกที่ยังไม่เสร็จ) ติ๊กเสร็จแล้วขั้นถัดไปจะ active ต่อ
const schema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    n: { type: Number, required: true, min: 1 },
    time: { type: String, default: "" }, // เวลาเริ่ม เช่น "19:00 น."
    range: { type: String, default: "" }, // ช่วงเวลา เช่น "19:00 – 19:45 น."
    title: { type: String, required: true, trim: true },
    desc: { type: String, default: "" },
    status: { type: String, enum: ["wait", "active", "done"], default: "wait" },
    doneBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    doneByName: { type: String, default: "" },
    doneAt: { type: Date },
  },
  { timestamps: true },
);
schema.index({ bookingId: 1, date: 1, n: 1 }, { unique: true });

module.exports = mongoose.model("RunStep", schema);
