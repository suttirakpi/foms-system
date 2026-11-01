const mongoose = require("mongoose");

// คลังอุปกรณ์ของวัด (หน้า เจ้าหน้าที่วัด > คลังอุปกรณ์) sku ไม่ซ้ำภายในวัดเดียวกัน
const schema = new mongoose.Schema(
  {
    templeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Temple",
      required: true,
    },
    sku: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    desc: { type: String, default: "", trim: true },
    category: { type: String, default: "", trim: true },
    unit: { type: String, default: "ชิ้น", trim: true },
    total: { type: Number, required: true, min: 0 },
    ready: { type: Number, required: true, min: 0 }, // จำนวนที่พร้อมใช้งาน (ต้องไม่เกิน total)
    usingNote: { type: String, default: "", trim: true }, // เช่น "กำลังใช้ในงาน FOMS-2569-0042"
    status: {
      type: String,
      enum: ["IN_USE", "PARTIAL", "LOW", "READY"],
      default: "READY",
    },
  },
  { timestamps: true },
);
schema.index({ templeId: 1, sku: 1 }, { unique: true });

module.exports = mongoose.model("Inventory", schema);
