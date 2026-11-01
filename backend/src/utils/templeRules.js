// utils/templeRules.js — กฎของวัดที่แอดมินตั้งได้ (เก็บใน TempleRule แบบ key/value)
// ใช้ค่าเริ่มต้นเมื่อวัดนั้นยังไม่เคยบันทึก เพื่อให้หน้าแอดมินกับระบบจองเห็นค่าตรงกันเสมอ
const TempleRule = require("../models/TempleRule");

const DEFAULT_RULES = {
  NO_CREMATION_ON_BUDDHIST_DAY: true, // งดฌาปนกิจวันพระ (ตัวสร้างกำหนดการใช้เตือน)
  CHANT_CURFEW_2030: true, // จำกัดรอบสวดไม่เกิน 20:30 น.
  MIN_MONKS_4: true, // พระสงฆ์ประจำพิธีขั้นต่ำ 4 รูป
  NO_FIREWORKS: true, // ห้ามประทัด/ดอกไม้ไฟ
  // ปิดไว้ก่อนเป็นค่าเริ่มต้น เพื่อไม่ให้พฤติกรรมการจองเดิมเปลี่ยนเอง (แอดมินเปิดเองแล้วระบบจองจะบังคับใช้จริง)
  ADVANCE_BOOKING_LIMIT_60: false, // เปิดรับจองล่วงหน้าไม่เกิน 60 วัน
  HALL_BUFFER_MINUTES: 90, // เวลาจัดเตรียมศาลาระหว่างรอบ (นาที)
};
const ADVANCE_BOOKING_DAYS = 60;
const BUFFER_CHOICES = [60, 90, 120];

async function getRules(templeId) {
  const rows = await TempleRule.find({
    templeId,
    key: { $in: Object.keys(DEFAULT_RULES) },
  }).lean();
  const rules = { ...DEFAULT_RULES };
  for (const r of rows) rules[r.key] = r.value;
  return rules;
}

module.exports = { DEFAULT_RULES, ADVANCE_BOOKING_DAYS, BUFFER_CHOICES, getRules };
