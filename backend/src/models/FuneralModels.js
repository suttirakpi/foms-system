// models/FuneralModels.js
// รวมโมเดลหลักของต้นแบบ (Temple, Package, Addon, Booking) ยังใช้ชื่อและฟิลด์เดิมของหน้าเว็บ
// ส่วนที่เพิ่มจากต้นแบบมีคอมเมนต์ "เพิ่มใหม่" กำกับ
const mongoose = require("mongoose");

// 1. ศาลา (ฝังอยู่ในวัด เหมือนเดิม) — _id ของศาลาใช้อ้างอิงใน HallReservation ได้
const hallSchema = new mongoose.Schema({
  name: { type: String, required: true },
  capacity: { type: Number, required: true, min: 1 }, // ใช้เตือน "ศาลาเล็กเกินไป" (เตือนอย่างเดียว ไม่ห้ามจอง)
  pricePerNight: { type: Number, required: true, min: 0 },
  kind: { type: String, enum: ["HALL", "CREMATORIUM"], default: "HALL" }, // เพิ่มใหม่: ศาลา / เมรุ
  isActive: { type: Boolean, default: true }, // เพิ่มใหม่
});

// 2. วัด
const templeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String }, // เพิ่มใหม่
  province: { type: String }, // เพิ่มใหม่
  bankName: { type: String, default: "ธนาคารกรุงไทย" }, // ใช้แสดงให้เจ้าภาพโอนเงิน
  bankAccount: { type: String, default: "123-4-56789-0" },
  isActive: { type: Boolean, default: true }, // เพิ่มใหม่
  halls: [hallSchema],
});

// 3. แพ็กเกจ (Economy, Standard, Premium)
const packageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  level: {
    type: String,
    enum: ["Economy", "Standard", "Premium"],
    required: true,
  },
  basePrice: { type: Number, required: true, min: 0 },
  snackPerHead: { type: Number, required: true, min: 0 }, // ค่าบริการต่อหัวแขกต่อคืน
  desc: { type: String, required: true },
  features: { type: [String], default: [] }, // เพิ่มใหม่: รายการสั้น ๆ สำหรับการ์ดแพ็กเกจ
  recommended: { type: Boolean, default: false }, // เพิ่มใหม่
  sortOrder: { type: Number, default: 0 }, // เพิ่มใหม่
  isActive: { type: Boolean, default: true }, // เพิ่มใหม่
});

// 4. ตัวเลือก/บริการเสริม (Add-ons)
// price คือ "ส่วนต่างราคา" (priceDelta) 0 = รวมอยู่ในแพ็กเกจ, > 0 = อัปเกรด
// ถ้ามี categoryKey (เช่น COFFIN, FLOWERS) = เลือกได้ 1 ตัวเลือกต่อหมวด (ระบบตรวจตอนจอง)
// ถ้าไม่มี categoryKey = บริการเสริมทั่วไป เลือกได้หลายอย่าง เหมือนเดิม
const addonSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  categoryKey: { type: String, uppercase: true, trim: true }, // เพิ่มใหม่
  categoryName: { type: String, trim: true }, // เพิ่มใหม่: ชื่อหมวดที่โชว์ เช่น "หีบศพ"
  packageIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Package" }], // เพิ่มใหม่: ว่าง = ใช้ได้ทุกแพ็กเกจ
  isDefault: { type: Boolean, default: false }, // เพิ่มใหม่: ค่าเริ่มต้นของหมวด
  sortOrder: { type: Number, default: 0 }, // เพิ่มใหม่
  isActive: { type: Boolean, default: true }, // เพิ่มใหม่
});

// 5. การจอง (Booking)
const bookingSchema = new mongoose.Schema(
  {
    bookingRef: { type: String, required: true, unique: true }, // FOMS-2569-0001 (รันตามลำดับ ไม่สุ่มแล้ว)
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "ต้องเข้าสู่ระบบก่อนจอง"], // แก้ไข: เดิมไม่บังคับ ทำให้เกิดงานไม่มีเจ้าของ
    },
    hostName: { type: String, required: true },
    deceasedName: { type: String, required: true },
    templeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Temple",
      required: true,
    },
    templeName: { type: String, required: true },
    hallId: { type: mongoose.Schema.Types.ObjectId, required: true },
    hallName: { type: String, required: true },
    hallPricePerNight: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }, // วันฌาปนกิจ (startDate + nights)
    nights: { type: Number, enum: [1, 3, 5, 7], required: true },
    guests: { type: Number, required: true, min: 1, max: 1000 },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      required: true,
    },
    packageName: { type: String, required: true },
    packageBasePrice: { type: Number, required: true },
    snackPerHead: { type: Number, required: true },
    addons: [
      {
        addonId: { type: mongoose.Schema.Types.ObjectId, ref: "Addon" },
        name: String,
        price: Number,
        categoryKey: String, // เพิ่มใหม่
      },
    ],
    pricing: {
      hallTotal: { type: Number, required: true },
      snackTotal: { type: Number, required: true },
      addonsTotal: { type: Number, required: true },
      grandTotal: { type: Number, required: true },
    },
    // PAID เป็นค่าเดิมของต้นแบบ (ให้หน้าเว็บเดิมยังทำงาน) งาน M4-07 จะย้ายไปใช้ paymentStatus อย่างเดียว
    status: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "PAID",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "PENDING",
    },
    paymentStatus: {
      type: String,
      enum: ["UNPAID", "SLIP_UPLOADED", "PARTIAL", "PAID"], // PARTIAL = อนุมัติบางงวด (เพิ่มใหม่)
      default: "UNPAID",
    }, // เพิ่มใหม่
    paymentSlipUrl: { type: String, default: "" },
    shareToken: { type: String, unique: true, sparse: true }, // เพิ่มใหม่: ลิงก์ E-Card สาธารณะ
    rejectReason: { type: String }, // เพิ่มใหม่
    cancelReason: { type: String }, // เพิ่มใหม่
  },
  { timestamps: true },
);
bookingSchema.index({ hostId: 1, createdAt: -1 });
bookingSchema.index({ templeId: 1, status: 1 });

module.exports = {
  Temple: mongoose.model("Temple", templeSchema),
  Package: mongoose.model("Package", packageSchema),
  Addon: mongoose.model("Addon", addonSchema),
  Booking: mongoose.model("Booking", bookingSchema),
};
