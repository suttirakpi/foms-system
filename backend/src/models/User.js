const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "กรุณาระบุชื่อ-นามสกุล"],
    },
    phone: {
      type: String,
      required: [true, "กรุณาระบุเบอร์โทรศัพท์มือถือ"],
      unique: true, // unique: true จะสร้าง Index ให้อัตโนมัติแล้ว
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
    },
    password: {
      type: String,
      required: [true, "กรุณากำหนดรหัสผ่าน"],
    },
    role: {
      type: String,
      enum: ["ADMIN", "TEMPLE_STAFF", "OPS_TEAM", "HOST"],
      default: "HOST",
    },
    pdpaConsent: {
      type: Boolean,
      required: [true, "ต้องกดยอมรับ PDPA ก่อนลงทะเบียน"],
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", userSchema);
