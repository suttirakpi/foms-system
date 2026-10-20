const mongoose = require("mongoose");

// กฎเฉพาะของแต่ละวัด (key/value) ตัวสร้างกำหนดการอ่านจากตรงนี้ ไม่ hardcode
// ตัวอย่าง key: NO_CREMATION_ON_BUDDHIST_DAY, MERIT_DAY_COUNT_START, CHANT_START_TIME
const schema = new mongoose.Schema(
  {
    templeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Temple",
      required: true,
    },
    key: { type: String, required: true, trim: true, uppercase: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    description: { type: String, trim: true },
  },
  { timestamps: true },
);
schema.index({ templeId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model("TempleRule", schema);
