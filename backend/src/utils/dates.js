// วันที่ในระบบใช้ string "YYYY-MM-DD" เป็นหลัก คำนวณด้วย UTC ล้วน ไม่ขึ้นกับ timezone ของเครื่อง
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateStr(s) {
  if (typeof s !== "string" || !DATE_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function fmt(dt) {
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(dateStr, days) {
  if (!isValidDateStr(dateStr)) throw new Error(`วันที่ไม่ถูกต้อง: ${dateStr}`);
  const [y, m, d] = dateStr.split("-").map(Number);
  return fmt(new Date(Date.UTC(y, m - 1, d + days)));
}

// รายการวันของแต่ละคืนที่ใช้ศาลา เริ่มจากวันเริ่ม ต่อเนื่องตามจำนวนคืน
function nightDates(startDate, nights) {
  return Array.from({ length: nights }, (_, i) => addDays(startDate, i));
}

// วันนี้ตามเวลาไทย (YYYY-MM-DD)
function todayInBangkok(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// แปลง Date (ที่เก็บเป็นเที่ยงคืน UTC) กลับเป็น string
function dateToStr(date) {
  return fmt(new Date(date));
}

module.exports = {
  isValidDateStr,
  addDays,
  nightDates,
  todayInBangkok,
  dateToStr,
};
