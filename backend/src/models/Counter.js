const mongoose = require("mongoose");
const { todayInBangkok } = require("../utils/dates");

const counterSchema = new mongoose.Schema({
  _id: { type: String },
  seq: { type: Number, default: 0 },
});
const Counter = mongoose.model("Counter", counterSchema);

async function nextBookingRef() {
  const be = Number(todayInBangkok().slice(0, 4)) + 543;
  const c = await Counter.findOneAndUpdate(
    { _id: `booking-${be}` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  );
  return `FOMS-${be}-${String(c.seq).padStart(4, "0")}`;
}

module.exports = { Counter, nextBookingRef };
