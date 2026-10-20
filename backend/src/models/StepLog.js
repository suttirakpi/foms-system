const mongoose = require("mongoose");

// บันทึกการติ๊กสเต็ปหน้างาน: ใครติ๊ก เมื่อไหร่ (กระดานรันคิว)
// unique (bookingId, date, step) = ติ๊กสเต็ปเดิมซ้ำในวันเดียวกันไม่ได้
const schema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    step: {
      type: String,
      enum: ["BATHING_START", "MONKS_SEATED", "CHANTING", "CLOSED"],
      required: true,
    },
    doneBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    doneAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true },
);
schema.index({ bookingId: 1, date: 1, step: 1 }, { unique: true });

module.exports = mongoose.model("StepLog", schema);
