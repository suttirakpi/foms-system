const mongoose = require("mongoose");

// จัดพระ/มัคนายก/พิธีกรรายคืน unique (personId, date) = หนึ่งท่านต่อหนึ่งงานต่อวัน
// ประธาน (CHIEF) 1 ท่านต่อคืน ให้ตรวจที่ชั้น service
const schema = new mongoose.Schema(
  {
    personId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Person",
      required: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    role: { type: String, enum: ["CHIEF", "MC", "CHANT"], required: true },
  },
  { timestamps: true },
);
schema.index({ personId: 1, date: 1 }, { unique: true });
schema.index({ bookingId: 1, date: 1 });

module.exports = mongoose.model("PersonAssignment", schema);
