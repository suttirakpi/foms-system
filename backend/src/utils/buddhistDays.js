// utils/buddhistDays.js — คำนวณ "วันพระ" (ขึ้น 8 / ขึ้น 15 / แรม 8 / แรม 15 ค่ำ)
// ขึ้น 15 = พระจันทร์เต็มดวง (full), แรม 15 = พระจันทร์มืด (new), ขึ้น/แรม 8 = quarter
// ใช้สูตรจันทรคติของ Meeus (Astronomical Algorithms บทที่ 49) — ไม่พึ่ง dependency ภายนอก
// ความคลาดเคลื่อนทั่วไปไม่เกินประมาณ 1 วันในบางปี จึงใช้ "เตือน" เท่านั้น ไม่บล็อกงาน
// (ตามกฎวัด NO_CREMATION_ON_BUDDHIST_DAY — ให้ staff ตัดสินใจเอง)

const SYNODIC = 29.530588861; // คาบจันทร์ synodic (วัน)
const EPOCH_JDE = 2451550.09766; // JDE ของ new moon (อ้างอิง 2000-01-06)
const THAI_OFFSET = 7 / 24; // เวลาไทย UTC+7
// ปฏิทินจันทรคติทางการไทยนับวันเปลี่ยนตอน "พระอาทิตย์ขึ้น" (~06:00) ไม่ใช่เที่ยงคืน
// ตัวอย่างจริง: full moon 2025-07-10 20:36 UTC = 03:36 ของ 11 ก.ค. (เวลาไทย)
//   แต่ทางการนับเป็น 10 ก.ค. เพราะยังไม่ถึงพระอาทิตย์ขึ้นของวันที่ 11 → ต้องลบ 6 ชั่วโมงก่อนอ่านวันที่
const SUNRISE_OFFSET = 6 / 24;
// 8 ค่ำ (quarter) ไม่ใช่จุดเปลี่ยน tithi — tithi ขึ้น 8 คือความยาวสัมพัทธ์ 84°–96° (กึ่งกลาง = 90°)
// วันที่ถูกต้องจึงเป็นวันที่ "sunrise ตกภายใน tithi นั้น" = หน้าต่างเลื่อนจาก ~06:00 ไป ~18:12
// (ครึ่งความกว้าง tithi = 6° ÷ อัตราเฉลี่ย 12.19°/วัน ≈ 11.8 ชม.) — ลดเคสคลาด ±1 วันได้ 4 ใน 8
const QUARTER_TITHI_HALF = 0.4922; // 6 / 12.19 (หน่วย: วัน)

const sin = (deg) => Math.sin((deg * Math.PI) / 180);
const cos = (deg) => Math.cos((deg * Math.PI) / 180);
const norm360 = (deg) => ((deg % 360) + 360) % 360;
const pad = (n) => String(n).padStart(2, "0");

// เวลา (วินาที) ที่ดาวทั้งโลกหมุนช้ากว่า (TT - UT) ประมาณการปี 2005-2050
function deltaTSeconds(year) {
  const t = year - 2000;
  if (t >= 5 && t <= 50) return 62.92 + 0.32217 * t + 0.005589 * t * t;
  return 69; // ค่ากลางสำหรับปีอื่น (คลาดไม่กี่วินาที ไม่กระทบวันที่)
}

// องค์ประกอบเฉลี่ยของดวงอาทิตย์/พระจันทร์ (Meeus ch.49) — k อาจเป็นเศษ .5 (พระจันทร์เต็มดวง)
function meanElements(k) {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;
  return {
    E: 1 - 0.002516 * T - 0.0000074 * T2,
    M: norm360(2.5534 + 29.10535670 * k - 0.0000014 * T2 - 0.00000011 * T3),
    Mp: norm360(201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4),
    F: norm360(160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4),
    Om: norm360(124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3),
  };
}

function meanPhaseJDE(k) {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;
  return (
    EPOCH_JDE +
    SYNODIC * k +
    0.00015437 * T2 -
    0.00000015 * T3 +
    0.00000000073 * T4
  );
}

// แก้ไขจาก mean phase ไปยังเวลาจริงของ phase (หน่วย: วินาที-ระดับวัน) — Meeus ch.49
// phase: "new" | "full" | "first" (ขึ้น 8 ค่ำ) | "last" (แรม 8 ค่ำ)
function phaseCorrection(k, phase) {
  const { E, M, Mp, F, Om } = meanElements(k);

  if (phase === "first" || phase === "last") {
    // ชุด correction สำหรับ first/last quarter (คนละชุดกับ new/full — ลดทศนิยมตาม Meeus)
    let quarter =
      -0.62801 * sin(Mp) +
      0.17172 * E * sin(M) +
      0.00862 * sin(2 * Mp) +
      0.00804 * sin(2 * F) +
      0.00454 * E * sin(Mp - M) -
      0.01183 * E * sin(Mp + M) + // อย่าตกหล่น — ขาดแล้วคลาด ~17 นาที
      0.00204 * E * E * sin(2 * M) -
      0.00180 * sin(Mp - 2 * F) -
      0.00070 * sin(Mp + 2 * F) -
      0.00040 * sin(3 * Mp) -
      0.00034 * E * sin(2 * Mp - M) +
      0.00032 * E * sin(M + 2 * F) +
      0.00032 * E * sin(M - 2 * F) -
      0.00028 * E * E * sin(Mp + 2 * M) +
      0.00027 * E * sin(2 * Mp + M) -
      0.00017 * sin(Om) -
      0.00005 * sin(Mp - M - 2 * F) +
      0.00004 * sin(2 * Mp + 2 * F) -
      0.00004 * sin(Mp + M + 2 * F) +
      0.00004 * sin(Mp - 2 * M) +
      0.00003 * sin(Mp + M - 2 * F) +
      0.00003 * sin(3 * M) +
      0.00002 * sin(2 * Mp - 2 * F) +
      0.00002 * sin(Mp - M + 2 * F) -
      0.00002 * sin(3 * Mp + M);
    // W แยก first (+) / last (−) — ทำให้ quarter แม่นขึ้น ~8 นาที
    const W =
      0.00306 -
      0.00038 * E * cos(M) +
      0.00026 * cos(Mp) -
      0.00002 * cos(Mp - M) +
      0.00002 * cos(Mp + M) +
      0.00002 * cos(2 * F);
    quarter += phase === "first" ? W : -W;
    return quarter + additionalCorrections(k);
  }

  const common =
    + 0.01608 * sin(2 * Mp)
    + 0.01039 * sin(2 * F)
    + 0.00739 * E * sin(Mp - M)
    - 0.00514 * E * sin(Mp + M)
    + 0.00208 * E * E * sin(2 * M)
    - 0.00111 * sin(Mp - 2 * F)
    - 0.00057 * sin(Mp + 2 * F)
    + 0.00056 * E * sin(2 * Mp + M)
    - 0.00042 * sin(3 * Mp)
    + 0.00042 * E * sin(M + 2 * F)
    + 0.00038 * E * sin(M - 2 * F)
    - 0.00024 * E * sin(2 * Mp - M)
    - 0.00017 * sin(Om)
    - 0.00007 * sin(Mp + 2 * M)
    + 0.00004 * sin(2 * Mp - 2 * F)
    + 0.00004 * sin(3 * M)
    + 0.00003 * sin(Mp + M - 2 * F)
    + 0.00003 * sin(2 * Mp + 2 * F)
    - 0.00003 * sin(Mp + M + 2 * F)
    + 0.00003 * sin(Mp - M + 2 * F)
    - 0.00002 * sin(Mp - M - 2 * F)
    - 0.00002 * sin(3 * Mp + M)
    + 0.00002 * sin(4 * Mp);

  if (phase === "new") {
    return (
      -0.40720 * sin(Mp) +
      0.17241 * E * sin(M) +
      common +
      additionalCorrections(k)
    );
  }
  return (
    0.40614 * sin(Mp) * -1 +
    0.17302 * E * sin(M) +
    common +
    additionalCorrections(k)
  );
}

// เงื่อนไขเพิ่มเติม A1–A14 (Meeus 49.A ท้ายตาราง) ใช้กับทุก phase ~ไม่เกิน 2 นาที
function additionalCorrections(k) {
  const T = k / 1236.85;
  const A = [
    299.77 + 0.107408 * k - 0.009173 * T * T,
    251.88 + 0.016321 * k,
    251.83 + 26.651886 * k,
    349.42 + 36.412478 * k,
    84.66 + 18.206239 * k,
    141.74 + 53.303771 * k,
    207.14 + 2.453732 * k,
    154.84 + 7.30686 * k,
    34.52 + 27.261239 * k,
    207.19 + 0.121824 * k,
    291.34 + 1.844379 * k,
    161.72 + 24.198154 * k,
    239.56 + 25.513099 * k,
    331.55 + 3.592518 * k,
  ];
  const C = [
    0.000325, 0.000165, 0.000164, 0.000126, 0.00011, 0.000062, 0.00006,
    0.000056, 0.000047, 0.000042, 0.00004, 0.000037, 0.000035, 0.000023,
  ];
  let sum = 0;
  for (let i = 0; i < 14; i++) sum += C[i] * sin(A[i]);
  return sum;
}

// แปลง JD (TT) เป็นวันที่แบบไทย YYYY-MM-DD — extraOffset ใช้เลื่อนหน้าต่างอ่านวัน (หน่วย วัน)
function jdeToThaiDateStr(jde, refYear, extraOffset = 0) {
  const jdUt = jde - deltaTSeconds(refYear) / 86400;
  const jd = jdUt + THAI_OFFSET - SUNRISE_OFFSET + extraOffset; // นับวันเปลี่ยนที่พระอาทิตย์ขึ้น (~06:00 ICT)
  const jd0 = jd + 0.5;
  const Z = Math.floor(jd0);
  const Fr = jd0 - Z;
  let A = Z;
  if (Z >= 2299161) {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);
  const dayF = B - D - Math.floor(30.6001 * E) + Fr;
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;
  const day = Math.floor(dayF);
  return `${year}-${pad(month)}-${pad(day)}`;
}

// แปลง "YYYY-MM-DD" เป็น JD โดยประมาณ (ใช้เลือกช่วง k เฉยๆ คลาดได้ ไม่เป็นไร)
function approxJD(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86400000 + 2440587.5;
}

// phase: "new" (แรม 15 ค่ำ), "full" (ขึ้น 15), "first" (ขึ้น 8), "last" (แรม 8)
// k = จำนวนเต็ม (new) หรือเต็ม + .25/.5/.75 ตาม phase
function phaseDateStr(k, phase) {
  const jde = meanPhaseJDE(k) + phaseCorrection(k, phase);
  const refYear = 2000 + (jde - 2451550.1) / 365.25;
  const isQuarter = phase === "first" || phase === "last";
  return jdeToThaiDateStr(jde, refYear, isQuarter ? QUARTER_TITHI_HALF : 0);
}

// วันพระของวันที่ระบุ (YYYY-MM-DD) — true/false
// วันพระ = ขึ้น 8 ค่ำ, ขึ้น 15 ค่ำ (วันเพ็ญ), แรม 8 ค่ำ, แรม 15 ค่ำ
// (เดือนขาด/คี่ ปฏิทินทางการถือแรม 14 ค่ำ = วันพระด้วย — แต่เพราะเดือนขาดคือวันที่
//  new moon ตกพอดี ระบบจะได้วันที่จาก phase "new" อยู่แล้ว)
function isBuddhistDay(dateStr) {
  const jd = approxJD(dateStr);
  const kBase = Math.floor((jd - EPOCH_JDE) / SYNODIC);
  for (let i = -2; i <= 2; i++) {
    const k = kBase + i;
    if (phaseDateStr(k + 0.75, "last") === dateStr) return true; // แรม 8 ค่ำ
    if (phaseDateStr(k + 0.5, "full") === dateStr) return true; // ขึ้น 15 ค่ำ
    if (phaseDateStr(k + 0.25, "first") === dateStr) return true; // ขึ้น 8 ค่ำ
    if (phaseDateStr(k, "new") === dateStr) return true; // แรม 15/14 ค่ำ
  }
  return false;
}

module.exports = { isBuddhistDay, phaseDateStr };
