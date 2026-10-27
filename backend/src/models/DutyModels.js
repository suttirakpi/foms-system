// models/DutyModels.js
const mongoose = require("mongoose");

// 1. บุคลากร (พระ / มัคนายก)
const staffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, enum: ["MONK", "MC"], required: true }, // MONK = พระ, MC = มัคนายก
  templeId: { type: mongoose.Schema.Types.ObjectId, ref: "Temple", required: true },
  phone: { type: String, default: "" },
  isActive: { type: Boolean, default: true },
});

// 2. การจัดคิวประจำคืน (Duty Assignment)
const dutyAssignmentSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    templeId: { type: mongoose.Schema.Types.ObjectId, ref: "Temple", required: true },
    dutyDate: { type: Date, required: true }, // วันที่สวดคืนนั้นๆ (YYYY-MM-DD)
    monkIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Staff" }], // รายชื่อพระ (ปกติ 4 รูป)
    mcId: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" }, // มัคนายกผู้ดูแล
    status: {
      type: String,
      enum: ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      default: "SCHEDULED",
    },
  },
  { timestamps: true }
);

// Compound Index เพื่อการค้นหาคืนของวัดนั้นๆ ได้รวดเร็ว
dutyAssignmentSchema.index({ templeId: 1, dutyDate: 1 });
dutyAssignmentSchema.index({ bookingId: 1, dutyDate: 1 }, { unique: true });

module.exports = {
  Staff: mongoose.model("Staff", staffSchema),
  DutyAssignment: mongoose.model("DutyAssignment", dutyAssignmentSchema),
};