const mongoose = require("mongoose");

// รายการกำหนดการพิธี (ตัวสร้างกำหนดการสร้างให้) ชื่อพระ/มัคนายกให้ดึงจาก PersonAssignment ตามวันที่
const schema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    time: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    type: {
      type: String,
      enum: ["BATHING", "CHANT", "CREMATION", "MERIT"],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    hallId: { type: mongoose.Schema.Types.ObjectId },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);
schema.index({ bookingId: 1, date: 1, sortOrder: 1 });

module.exports = mongoose.model("ScheduleItem", schema);
