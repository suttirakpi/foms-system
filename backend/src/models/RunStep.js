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
    // wait → active → review (ทีมจัดงานติ๊กว่าเสร็จ รอเจ้าภาพยืนยัน) → done (เจ้าภาพยืนยันแล้ว = เสร็จจริง)
    // เจ้าภาพแจ้งว่ายังไม่เสร็จ → disputed (ทีมจัดงานต้องติ๊กใหม่)
    status: { type: String, enum: ["wait", "active", "review", "disputed", "done"], default: "wait" },
    doneBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // ทีมจัดงานที่ติ๊กว่าเสร็จ
    doneByName: { type: String, default: "" },
    doneAt: { type: Date },
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // เจ้าภาพที่ยืนยัน
    confirmedByName: { type: String, default: "" },
    confirmedAt: { type: Date },
    disputeNote: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);
schema.index({ bookingId: 1, date: 1, n: 1 }, { unique: true });

module.exports = mongoose.model("RunStep", schema);
