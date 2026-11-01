const mongoose = require("mongoose");

// บันทึกการตรวจสอบ: ทุกการแก้ไขของผู้ดูแลระบบ (เพิ่ม/แก้/ระงับ) ถูกเขียนที่นี่ แก้หรือลบผ่าน API ไม่ได้
const schema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorName: { type: String, default: "" },
    actorRole: { type: String, default: "" },
    action: { type: String, required: true }, // CREATE | UPDATE | ACTIVATE | DEACTIVATE | RULES_UPDATE | PASSWORD_CHANGE
    entity: { type: String, required: true }, // USER | TEMPLE | HALL | PACKAGE | ADDON | PERSON | RULES | SYSTEM
    entityId: { type: String, default: "" },
    summary: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
schema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", schema);
