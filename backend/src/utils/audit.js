// utils/audit.js — เขียนบันทึกการตรวจสอบ (ถ้าเขียนไม่สำเร็จ ไม่ทำให้คำสั่งหลักล้ม แค่แจ้งใน log)
const AuditLog = require("../models/AuditLog");

async function logAudit(req, { action, entity, entityId, summary }) {
  try {
    await AuditLog.create({
      actorId: req.user && req.user._id,
      actorName: (req.user && req.user.name) || "",
      actorRole: (req.user && req.user.role) || "",
      action,
      entity,
      entityId: entityId ? String(entityId) : "",
      summary: summary || "",
    });
  } catch (err) {
    console.error("[AUDIT] บันทึกไม่สำเร็จ:", err.message);
  }
}

module.exports = { logAudit };
