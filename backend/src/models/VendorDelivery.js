const mongoose = require("mongoose");

// การตรวจรับของจากคู่ค้าหน้างาน (ดอกไม้ อาหารว่าง ฯลฯ) ของแต่ละงาน
const schema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    templeId: { type: mongoose.Schema.Types.ObjectId, ref: "Temple", required: true },
    category: { type: String, default: "บริการเสริม", trim: true },
    title: { type: String, required: true, trim: true },
    partner: { type: String, default: "", trim: true },
    expectedTime: { type: String, default: "" }, // เวลานัดส่งมอบ "HH:MM"
    detail: { type: String, default: "", trim: true },
    status: { type: String, enum: ["SHIPPING", "ARRIVED", "RECEIVED"], default: "SHIPPING" },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    receivedByName: { type: String, default: "" },
    receivedAt: { type: Date },
    ref: { type: String, default: "" }, // เลขใบตรวจรับ สร้างตอนตรวจรับ
    note: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);
schema.index({ bookingId: 1, createdAt: 1 });

module.exports = mongoose.model("VendorDelivery", schema);
