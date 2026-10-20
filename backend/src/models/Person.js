const mongoose = require("mongoose");

// พระสงฆ์ / มัคนายก / พิธีกร อยู่ collection เดียว แยกด้วย type
const schema = new mongoose.Schema(
  {
    templeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Temple",
      required: true,
    },
    type: { type: String, enum: ["MONK", "DEACON", "MC"], required: true },
    name: { type: String, required: true, trim: true },
    title: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
schema.index({ templeId: 1, type: 1, isActive: 1 });

module.exports = mongoose.model("Person", schema);
