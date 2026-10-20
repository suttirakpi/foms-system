const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    type: {
      type: String,
      enum: [
        "CHANT_REMINDER",
        "CREMATION_REMINDER",
        "MERIT_REMINDER",
        "STATUS_CHANGE",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    readAt: { type: Date },
    dedupeKey: { type: String, unique: true, sparse: true },
  },
  { timestamps: true },
);
schema.index({ userId: 1, readAt: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", schema);
