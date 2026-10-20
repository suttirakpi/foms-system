const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "กรุณาระบุชื่อ-นามสกุล"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "กรุณาระบุเบอร์โทรศัพท์มือถือ"],
      unique: true, // เก็บเป็นตัวเลขล้วน เช่น 0812345678 (ตัดขีดและเว้นวรรคแล้ว)
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true, // ไม่มีอีเมลได้หลายคน
      lowercase: true,
      trim: true,
    },
    // select:false = query ปกติไม่ดึงรหัสผ่านมา ตอนล็อกอินต้องใช้ .select("+password")
    password: {
      type: String,
      required: [true, "กรุณากำหนดรหัสผ่าน"],
      select: false,
    },
    // ค่า role ตามสัญญากลางของทีม: ADMIN | STAFF | OPS | HOST
    role: {
      type: String,
      enum: ["ADMIN", "STAFF", "OPS", "HOST"],
      default: "HOST",
    },
    templeId: { type: mongoose.Schema.Types.ObjectId, ref: "Temple" }, // เจ้าหน้าที่/ทีมงานสังกัดวัดไหน
    pdpaConsent: {
      type: Boolean,
      required: [true, "ต้องกดยอมรับ PDPA ก่อนลงทะเบียน"],
      default: false,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
