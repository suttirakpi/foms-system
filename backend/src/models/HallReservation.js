const mongoose = require("mongoose");

// หัวใจของการกันจองศาลาซ้อน: เก็บ "ทีละคืนต่อศาลา" แล้วใส่ unique (hallId, date)
// สองคนกดจองพร้อมกัน ฐานข้อมูลจะให้ผ่านแค่คนเดียว (error code 11000)
const schema = new mongoose.Schema(
  {
    hallId: { type: mongoose.Schema.Types.ObjectId, required: true }, // _id ของศาลา (ฝังในวัด)
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // YYYY-MM-DD
  },
  { timestamps: true },
);
schema.index({ hallId: 1, date: 1 }, { unique: true });
schema.index({ bookingId: 1 });

module.exports = mongoose.model("HallReservation", schema);
