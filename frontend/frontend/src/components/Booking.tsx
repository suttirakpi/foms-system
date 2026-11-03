import React, { useState, useEffect, useMemo } from "react";
import { Navbar } from "./Navbar";
import { AuthUser } from "../App";
import {
  AvailableDatePicker,
  hallFree,
  useTempleAvailability,
} from "./AvailableDatePicker";
import "./Booking.css";
import { API_URL } from "../config";

interface BookingProps {
  isLoggedIn?: boolean;
  userName?: string;
  currentUser?: AuthUser | null;
  onNavigateHome: () => void;
  onNavigateLogin: () => void;
  onNavigateRegister: () => void;
  onNavigateDashboard?: () => void;
  onLogout?: () => void;
}

interface HallData {
  isActive?: boolean;
  _id: string;
  name: string;
  capacity: number;
  pricePerNight: number;
  hasAircon?: boolean; // ถ้ามีใน DB จะใช้เป็นเกณฑ์ "ติดแอร์" โดยตรง
  description?: string;
  equipment?: string;
}

interface TempleData {
  _id: string;
  name: string;
  halls: HallData[];
}

interface PackageData {
  _id: string;
  name: string;
  basePrice: number;
  snackPerHead: number;
  desc: string;
  features?: string[];
  level?: string;
}

interface AddonData {
  _id: string;
  name: string;
  price: number;
}

/* ============================================================
 * MCDA / Weighted Sum Method (WSM)  —  S_i = Σ (w_j × r_ij)
 *   r_i1 = งบประมาณประหยัด      (ยอดรวมทั้งงาน: ค่าศาลา+แพ็กเกจ+ค่ารับรอง+บริการเสริม, ถูกสุด = 1)
 *   r_i2 = รองรับแขกพอดี ไม่แออัด (ใช้พื้นที่ ~80% = คะแนนเต็ม)
 *   r_i3 = ความสะดวกสบาย/ติดแอร์  (ติดแอร์ = 1, ไม่ติด = 0)
 *   ทุก r_ij อยู่ในช่วง 0–1 และ Σ w_j = 100% จึงได้ S_i เป็น 0–100%
 * ============================================================ */
type Weights = [number, number, number];

const MCDA_CRITERIA = [
  { label: "งบประมาณประหยัด", sym: "w₁" },
  { label: "รองรับแขกพอดี ไม่แออัด", sym: "w₂" },
  { label: "ความสะดวกสบาย/ติดแอร์", sym: "w₃" },
];

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// ปรับน้ำหนักเกณฑ์ที่ถูกลาก แล้วกระจายส่วนที่เหลือให้อีก 2 เกณฑ์ตามสัดส่วนเดิม (รวม 100 เสมอ)
function rebalanceWeights(w: Weights, idx: number, value: number): Weights {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const [a, b] = [0, 1, 2].filter((i) => i !== idx);
  const rest = 100 - v;
  const sumOthers = w[a] + w[b];
  const next: Weights = [0, 0, 0];
  next[idx] = v;
  if (sumOthers === 0) {
    next[a] = Math.round(rest / 2);
  } else {
    next[a] = Math.round((w[a] * rest) / sumOthers);
  }
  next[b] = rest - next[a];
  return next;
}

interface HallScore {
  hall: HallData;
  score: number; // 0–100 (%)
}

function computeHallScores(
  halls: HallData[],
  guests: number,
  nights: number,
  fixedCost: number, // แพ็กเกจ + ค่ารับรอง + บริการเสริม (เท่ากันทุกศาลา)
  w: Weights,
): HallScore[] {
  if (halls.length === 0) return [];

  // ค่าใช้จ่ายรวมทั้งงานของแต่ละศาลา = ค่าศาลา + ต้นทุนส่วนที่เหลือ (ตรงกับยอดในสรุปรายการ)
  const totals = halls.map((h) => h.pricePerNight * nights + fixedCost);
  const minTotal = Math.min(...totals);

  const prices = halls.map((h) => h.pricePerNight);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const flatPrice = maxP === minP;

  const hasAir = (h: HallData) =>
    h.hasAircon ??
    /แอร์|ปรับอากาศ|air/i.test(
      `${h.name} ${h.description ?? ""} ${h.equipment ?? ""}`,
    );
  const anyAir = halls.some(hasAir);

  return halls.map((h, i) => {
    // r1: อัตราส่วนยอดรวมที่ถูกที่สุด ÷ ยอดรวมของศาลานี้ (ถูกสุด = 1)
    //     ใช้อัตราส่วนแทน min-max เพื่อให้ต้นทุนคงที่ (แพ็กเกจ/ค่ารับรอง) ทำให้ส่วนต่างราคาศาลา
    //     มีน้ำหนักน้อยลงตามความเป็นจริงของงบทั้งงาน
    const r1 = totals[i] > 0 ? minTotal / totals[i] : 1;

    // r2: สัดส่วนการใช้พื้นที่ u = แขก/ความจุ  (เหมาะสุด ~0.8, เกินความจุโดนหักหนัก)
    const u = guests / h.capacity;
    const r2 =
      u <= 1
        ? clamp01(1 - Math.abs(u - 0.8) / 0.8)
        : clamp01(0.75 - (u - 1) * 1.5);

    // r3: ติดแอร์ = 1 / ไม่ติด = 0
    //     ถ้าข้อมูลไม่ระบุแอร์เลย ใช้ราคาศาลาเป็นตัวแทนระดับสิ่งอำนวยความสะดวก (แพงกว่า = สะดวกกว่า)
    const r3 = anyAir
      ? hasAir(h)
        ? 1
        : 0
      : flatPrice
        ? 1
        : (h.pricePerNight - minP) / (maxP - minP);

    const score = (w[0] * r1 + w[1] * r2 + w[2] * r3) / 100; // Σ w_j = 100
    return { hall: h, score: Math.round(score * 100) };
  });
}

/* ============================================================
 * MCDA สำหรับ "แพ็กเกจ" (ชุดเกณฑ์แยกจากศาลา) — S_i = Σ (w_j × r_ij)
 *   r_i1 = งบประมาณประหยัด   (ยอดรวมแพ็กเกจ = ราคาฐาน + ค่ารับรอง × แขก × คืน, ถูกสุด = 1)
 *   r_i2 = พิธีครบถ้วน       (ใช้ราคาฐานแพ็กเกจเป็นตัวแทนขอบเขตบริการ, min-max)
 *   r_i3 = รับรองแขกอย่างดี   (ค่ารับรองต่อหัว, min-max)
 * ============================================================ */
const PKG_CRITERIA = [
  { label: "งบประมาณประหยัด", sym: "w₁" },
  { label: "พิธีครบถ้วน สมเกียรติ", sym: "w₂" },
  { label: "รับรองแขกอย่างดี", sym: "w₃" },
];

interface PackageScore {
  pkg: PackageData;
  score: number; // 0–100 (%)
}

function computePackageScores(
  pkgs: PackageData[],
  guests: number,
  nights: number,
  w: Weights,
): PackageScore[] {
  if (pkgs.length === 0) return [];
  const totals = pkgs.map(
    (p) => p.basePrice + p.snackPerHead * guests * nights,
  );
  const bases = pkgs.map((p) => p.basePrice);
  const snacks = pkgs.map((p) => p.snackPerHead);
  const mm = (v: number, arr: number[]) => {
    const lo = Math.min(...arr);
    const hi = Math.max(...arr);
    return hi === lo ? 1 : (v - lo) / (hi - lo);
  };
  return pkgs.map((p, i) => {
    // ถูกสุด = 1, แพงสุด = 0 (ถ้าราคาเท่ากันหมด = 1)
    const hiT = Math.max(...totals);
    const loT = Math.min(...totals);
    const r1 = hiT === loT ? 1 : (hiT - totals[i]) / (hiT - loT);
    const r2 = mm(p.basePrice, bases);
    const r3 = mm(p.snackPerHead, snacks);
    const score = (w[0] * r1 + w[1] * r2 + w[2] * r3) / 100;
    return { pkg: p, score: Math.round(score * 100) };
  });
}

/* ============================================================
 * Wizard + ตัวช่วยแสดงผล
 * ============================================================ */
const STEPS = [
  "ผู้วายชนม์และวัด",
  "วันและจำนวนคืน",
  "แขกและศาลา",
  "แพ็กเกจ",
  "บริการเสริมและยืนยัน",
];

const fmtDate = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

interface Preset {
  label: string;
  w: Weights;
}

const HALL_PRESETS: Preset[] = [
  { label: "ประหยัดที่สุด", w: [70, 20, 10] },
  { label: "พอดีกับแขก", w: [20, 60, 20] },
  { label: "สะดวกสบาย", w: [20, 20, 60] },
  { label: "สมดุล", w: [40, 40, 20] },
];

const PKG_PRESETS: Preset[] = [
  { label: "ประหยัดที่สุด", w: [70, 15, 15] },
  { label: "พิธีครบครัน", w: [15, 70, 15] },
  { label: "รับรองแขกดี", w: [15, 15, 70] },
  { label: "สมดุล", w: [40, 30, 30] },
];

interface MCDAPanelProps {
  title: string;
  intro: string;
  lead: string; // ข้อความนำของแบนเนอร์ เช่น "สำหรับงบและจำนวนแขกของคุณ"
  criteria: { label: string; sym: string }[];
  presets: Preset[];
  weights: Weights;
  onChange: (w: Weights) => void;
  bestName?: string;
  bestScore?: number;
  isCurrentBest: boolean;
  onApply: () => void;
  applyLabel: string;
}

// กล่องแนะนำ MCDA แบบกะทัดรัด: เลือก "สิ่งที่สำคัญ" ด้วยปุ่มเดียว / ปรับละเอียดได้ถ้าต้องการ
const MCDAPanel: React.FC<MCDAPanelProps> = ({
  title,
  intro,
  lead,
  criteria,
  presets,
  weights,
  onChange,
  bestName,
  bestScore,
  isCurrentBest,
  onApply,
  applyLabel,
}) => {
  const [open, setOpen] = useState(false);
  const same = (a: Weights, b: Weights) => a.every((v, i) => v === b[i]);
  return (
    <div className="mcda-box">
      <div className="mcda-header">
        <div>
          <span className="mcda-badge">MCDA · WSM</span>
          <h4>{title}</h4>
        </div>
        <div className="mcda-formula">Sᵢ = Σ (wⱼ × rᵢⱼ)</div>
      </div>
      <p className="mcda-desc">{intro}</p>

      <div
        className="mcda-presets"
        role="radiogroup"
        aria-label="สิ่งที่สำคัญที่สุด"
      >
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            role="radio"
            aria-checked={same(weights, p.w)}
            className={`mcda-preset ${same(weights, p.w) ? "active" : ""}`}
            onClick={() => onChange(p.w)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="mcda-toggle"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "ซ่อนการปรับละเอียด ▲" : "ปรับน้ำหนักเกณฑ์เอง (รวม 100%) ▼"}
      </button>

      {open && (
        <div className="mcda-sliders">
          {criteria.map((c, i) => (
            <div className="mcda-slider-item" key={c.sym}>
              <div className="mcda-slider-label">
                <span>
                  {c.label} ({c.sym})
                </span>
                <strong>{weights[i]}%</strong>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={weights[i]}
                onChange={(e) =>
                  onChange(rebalanceWeights(weights, i, Number(e.target.value)))
                }
                className="guest-slider"
              />
            </div>
          ))}
        </div>
      )}

      {bestName && (
        <div className="mcda-recommendation-banner">
          <div className="mcda-rec-text">
            ⭐ {lead} <strong>{bestName}</strong> ได้คะแนนความเหมาะสมสูงสุด{" "}
            <strong>{bestScore}%</strong>
          </div>
          {!isCurrentBest && (
            <button type="button" className="btn-apply-mcda" onClick={onApply}>
              {applyLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const Booking: React.FC<BookingProps> = ({
  isLoggedIn,
  userName,
  currentUser,
  onNavigateHome,
  onNavigateLogin,
  onNavigateRegister,
  onNavigateDashboard,
  onLogout,
}) => {
  // States สำหรับข้อมูลจาก Database
  const [temples, setTemples] = useState<TempleData[]>([]);
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [addons, setAddons] = useState<AddonData[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // States สำหรับฟอร์มการจอง
  const [deceasedName, setDeceasedName] = useState("");
  const [selectedTempleId, setSelectedTempleId] = useState("");
  const [hall, setHall] = useState<HallData | null>(null);
  const [startDate, setStartDate] = useState("");
  const [nights, setNights] = useState(3);
  const [guests, setGuests] = useState(100);
  const [pkg, setPkg] = useState<PackageData | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // น้ำหนักเกณฑ์ MCDA [งบประหยัด, แขกพอดี, สะดวกสบาย] รวม 100%
  const [weights, setWeights] = useState<Weights>([40, 40, 20]);
  // น้ำหนักเกณฑ์ MCDA ของแพ็กเกจ [ประหยัด, พิธีครบถ้วน, รับรองแขก]
  const [pkgWeights, setPkgWeights] = useState<Weights>([40, 30, 30]);
  // Wizard: ขั้นปัจจุบัน และขั้นไกลสุดที่เคยไปถึง (กดย้อนกลับ/ข้ามไปดูได้)
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);

  // 1. ดึงข้อมูลวัด ศาลา แพ็กเกจ บริการเสริมจาก Database
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        setLoadingData(true);
        const res = await fetch(`${API_URL}/api/master-data`);
        if (!res.ok) throw new Error("ไม่สามารถเชื่อมต่อฐานข้อมูลได้");
        const data = await res.json();

        setTemples(data.temples || []);
        setPackages(data.packages || []);
        setAddons(data.addons || []);

        if (data.temples?.length > 0) {
          setSelectedTempleId(data.temples[0]._id);
          setHall((data.temples[0].halls || []).find((h: HallData) => h.isActive !== false) || null);
        }
        if (data.packages?.length > 0) {
          // เลือกแพ็กเกจมาตรฐานเป็นค่าเริ่มต้น
          setPkg(data.packages[1] || data.packages[0]);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "เกิดข้อผิดพลาดในการดึงข้อมูล");
      } finally {
        setLoadingData(false);
      }
    };

    fetchMasterData();
  }, []);

  const currentTemple = temples.find((t) => t._id === selectedTempleId);
  // ศาลาที่แอดมินปิดใช้งาน (isActive=false) ไม่แสดงให้เลือก และไม่นับเป็นศาลาว่างในปฏิทิน
  const allHalls = currentTemple ? currentTemple.halls.filter((h) => h.isActive !== false) : [];
  const { av, error: availError } = useTempleAvailability(selectedTempleId);
  // เลือกวันแล้ว: ซ่อนศาลาที่เต็มในช่วงวันนั้น (ยังไม่เลือกวัน แสดงทุกศาลา)
  const availableHalls = startDate
    ? allHalls.filter((h) => hallFree(av, h._id, startDate, nights))
    : allHalls;
  const hallIdsKey = availableHalls.map((h) => h._id).join(",");
  useEffect(() => {
    // ศาลาที่เลือกไว้ถูกซ่อน (เต็ม) ให้เลือกหลังแรกที่ว่างแทน
    if (
      availableHalls.length > 0 &&
      !availableHalls.some((h) => h._id === hall?._id)
    )
      setHall(availableHalls[0]);
  }, [hallIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // อัปเดตศาลาเมื่อเปลี่ยนวัด
  const handleTempleChange = (templeId: string) => {
    setSelectedTempleId(templeId);
    const foundTemple = temples.find((t) => t._id === templeId);
    const openHalls = foundTemple ? foundTemple.halls.filter((h) => h.isActive !== false) : [];
    if (foundTemple && openHalls.length > 0) {
      setHall(openHalls[0]);
    } else {
      setHall(null);
    }
  };

  const handleAddonToggle = (id: string) => {
    setSelectedAddons((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  // คำนวณราคาแบบเรียลไทม์จากข้อมูลจริงใน DB
  const hallTotal = (hall?.pricePerNight || 0) * nights;
  const snackTotal = (pkg?.snackPerHead || 0) * guests * nights;
  const addonsTotal = selectedAddons.reduce((sum, addonId) => {
    const found = addons.find((a) => a._id === addonId);
    return sum + (found ? found.price : 0);
  }, 0);
  const grandTotal =
    hallTotal + (pkg?.basePrice || 0) + snackTotal + addonsTotal;

  const isOverCapacity = hall ? guests > hall.capacity : false;

  // MCDA: คำนวณคะแนน S_i ของทุกศาลาที่ว่าง แล้วหาศาลาที่คะแนนสูงสุด
  const hallScores = useMemo(
    () =>
      computeHallScores(
        availableHalls,
        guests,
        nights,
        (pkg?.basePrice || 0) + snackTotal + addonsTotal,
        weights,
      ),
    [
      hallIdsKey,
      guests,
      nights,
      pkg,
      snackTotal,
      addonsTotal,
      weights,
      allHalls,
    ], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const scoreOf = (id: string) =>
    hallScores.find((s) => s.hall._id === id)?.score;
  const bestHall = hallScores.reduce<HallScore | null>(
    (best, s) => (!best || s.score > best.score ? s : best),
    null,
  );

  // MCDA แพ็กเกจ: คิดจากจำนวนแขกและจำนวนคืนที่ผู้ใช้กรอกไว้
  const pkgScores = useMemo(
    () => computePackageScores(packages, guests, nights, pkgWeights),
    [packages, guests, nights, pkgWeights],
  );
  const scoreOfPkg = (id: string) =>
    pkgScores.find((x) => x.pkg._id === id)?.score;
  const bestPkg = pkgScores.reduce<PackageScore | null>(
    (best, x) => (!best || x.score > best.score ? x : best),
    null,
  );

  // Wizard: ตรวจความครบถ้วนทีละขั้น (คืนข้อความบอกว่าขาดอะไร ถ้าครบคืน "")
  const stepError = (st: number): string => {
    if (st === 0) {
      if (!deceasedName.trim()) return "กรุณาระบุชื่อ-นามสกุลของผู้วายชนม์";
      if (!selectedTempleId) return "กรุณาเลือกวัด";
    }
    if (st === 1 && !startDate) return "กรุณาเลือกวันที่เริ่มพิธี";
    if (st === 2) {
      if (availableHalls.length === 0)
        return "ไม่มีศาลาว่างในช่วงวันที่เลือก กรุณาย้อนกลับไปเลือกวันอื่น";
      if (!hall || !availableHalls.some((h) => h._id === hall._id))
        return "กรุณาเลือกศาลา";
    }
    if (st === 3 && !pkg) return "กรุณาเลือกแพ็กเกจ";
    return "";
  };
  const currentError = stepError(step);
  const isLastStep = step === STEPS.length - 1;
  const goNext = () => {
    if (currentError || isLastStep) return;
    setStep(step + 1);
    setMaxStep((m) => Math.max(m, step + 1));
  };
  const goBack = () => setStep((st) => Math.max(0, st - 1));

  // เปลี่ยนขั้นแล้วกลับขึ้นบนสุด ผู้ใช้จะได้เห็นหัวข้อของขั้นใหม่ทันที
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // สรุปสิ่งที่เลือกไว้แล้ว (กดเพื่อกลับไปแก้ได้)
  const recap: { label: string; value: string; go: number }[] = [];
  if (step > 0 && step < 4) {
    recap.push({ label: "ผู้วายชนม์", value: deceasedName, go: 0 });
    recap.push({ label: "วัด", value: currentTemple?.name || "-", go: 0 });
  }
  if (step > 1 && step < 4)
    recap.push({
      label: "วันที่",
      value: `${startDate ? fmtDate(startDate) : "-"} · ${nights} คืน`,
      go: 1,
    });
  if (step > 2 && step < 4)
    recap.push({ label: "ศาลา", value: hall?.name || "-", go: 2 });

  // 2. ส่งข้อมูลการจองไปบันทึกลง MongoDB
  const handleConfirmBooking = async () => {
    if (!deceasedName.trim()) {
      alert("กรุณาระบุชื่อ-นามสกุลของผู้วายชนม์");
      return;
    }
    if (!startDate) {
      alert("กรุณาระบุวันที่เริ่มต้นพิธีการ");
      return;
    }
    if (!hall || !pkg) {
      alert("กรุณาเลือกศาลาและแพ็กเกจ");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          hostId: currentUser?._id || currentUser?.id,
          hostName: currentUser?.name || "เจ้าภาพทั่วไป",
          deceasedName: deceasedName.trim(),
          templeId: selectedTempleId,
          hallId: hall._id,
          startDate,
          nights,
          guests,
          packageId: pkg._id,
          addonIds: selectedAddons,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "ไม่สามารถบันทึกการจองได้");
      }

      alert(
        `✅ บันทึกคำขอจองลงฐานข้อมูลสำเร็จ!\nรหัสอ้างอิง: ${data.bookingRef}\nสถานะปัจจุบัน: ${data.status}`,
      );

      if (onNavigateDashboard) {
        onNavigateDashboard();
      } else {
        onNavigateHome();
      }
    } catch (err: any) {
      alert(`❌ ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // สรุปรายการเปิดเผยทีละส่วนตามขั้นที่ผู้ใช้ไปถึงแล้ว (ไม่โชว์ค่าเริ่มต้นที่ยังไม่ได้เลือก)
  const showSchedule = maxStep >= 2; // ผ่านขั้นวัน/คืนแล้ว → โชว์วันที่ คืน ศาลา แขก
  const showPkgCost = maxStep >= 3; // ผ่านขั้นศาลาแล้ว → โชว์แพ็กเกจและค่ารับรอง
  const showAddonCost = maxStep >= 4; // ถึงขั้นสุดท้าย → รวมบริการเสริม
  const hasTotal = maxStep >= 2;
  const shownTotal =
    hallTotal +
    (showPkgCost ? (pkg?.basePrice || 0) + snackTotal : 0) +
    (showAddonCost ? addonsTotal : 0);
  const totalText = hasTotal ? `฿${shownTotal.toLocaleString()}` : "—";

  // Sensitivity / What-If: คำนวณด้วยสูตรเดียวกับยอดรวม และรวมเฉพาะส่วนที่แสดงในสรุปแล้ว
  const costFor = (n: number, g: number) =>
    (hall?.pricePerNight || 0) * n +
    (showPkgCost
      ? (pkg?.basePrice || 0) + (pkg?.snackPerHead || 0) * g * n
      : 0) +
    (showAddonCost ? addonsTotal : 0);
  const NIGHT_OPTIONS = [1, 3, 5, 7];
  const lowerNights = [...NIGHT_OPTIONS].reverse().find((n) => n < nights);
  // ถ้าอยู่ที่ 1 คืนแล้ว (ลดไม่ได้) ให้โชว์ผลของการเพิ่ม โดยเสนอเฉพาะจำนวนคืนที่ศาลายังว่าง
  const higherNights = NIGHT_OPTIONS.find(
    (n) =>
      n > nights &&
      (!startDate || !hall || hallFree(av, hall._id, startDate, n)),
  );
  const nightsDelta =
    lowerNights !== undefined
      ? costFor(nights, guests) - costFor(lowerNights, guests)
      : higherNights !== undefined
        ? costFor(higherNights, guests) - costFor(nights, guests)
        : 0;
  const guestStepPerNight = (pkg?.snackPerHead || 0) * 20;
  const showWhatIf = hasTotal && !!hall;

  return (
    <div className="booking-wrapper">
      <Navbar
        currentView="booking"
        isLoggedIn={isLoggedIn}
        userName={userName}
        onNavigateHome={onNavigateHome}
        onNavigateLogin={onNavigateLogin}
        onNavigateRegister={onNavigateRegister}
        onNavigateBooking={() => {}}
        onNavigateDashboard={onNavigateDashboard}
        onLogout={onLogout}
      />

      <div className="booking-header">
        <div className="booking-header-inner">
          <h1>กำหนดพิธีการและจัดเตรียมศาลา</h1>
          <p>
            ระบบประเมินทรัพยากรและค่าใช้จ่ายตามสเกลงานจริง
            พร้อมตรวจสอบคิวว่างจากฐานข้อมูลแบบ Real-time
          </p>
        </div>
      </div>

      {loadingData ? (
        <div style={{ textAlign: "center", padding: "4rem" }}>
          กำลังดึงข้อมูลวัด ศาลา และแพ็กเกจจากฐานข้อมูล...
        </div>
      ) : errorMsg ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#ba1a1a" }}>
          {errorMsg}
        </div>
      ) : (
        <>
          <div className="booking-container">
            <div className="booking-main">
              <nav className="stepper" aria-label="ขั้นตอนการจอง">
                <ol>
                  {STEPS.map((label, i) => (
                    <li
                      key={label}
                      className={`stepper-item ${i === step ? "current" : ""} ${i < step ? "done" : ""}`}
                    >
                      <button
                        type="button"
                        disabled={i > maxStep}
                        aria-current={i === step ? "step" : undefined}
                        onClick={() => setStep(i)}
                      >
                        <span className="stepper-dot">
                          {i < step ? "✓" : i + 1}
                        </span>
                        <span className="stepper-label">{label}</span>
                      </button>
                    </li>
                  ))}
                </ol>
                <div className="stepper-count">
                  ขั้นที่ {step + 1} จาก {STEPS.length}: {STEPS[step]}
                </div>
              </nav>

              {recap.length > 0 && (
                <div className="recap">
                  {recap.map((r) => (
                    <button
                      key={r.label}
                      type="button"
                      className="recap-chip"
                      title="กดเพื่อแก้ไข"
                      onClick={() => setStep(r.go)}
                    >
                      {r.label}: <b>{r.value}</b> ✎
                    </button>
                  ))}
                </div>
              )}

              {step === 0 && (
                <section className="form-section">
                  <div className="section-title">
                    <span className="step-num">01</span>
                    <h2>ข้อมูลผู้วายชนม์และวัด</h2>
                  </div>
                  <div
                    className="input-group"
                    style={{ marginBottom: "1.25rem" }}
                  >
                    <label>
                      ชื่อ-นามสกุล ผู้วายชนม์ (สำหรับออกกำหนดการและ E-Card) *
                    </label>
                    <input
                      type="text"
                      className="clean-input"
                      placeholder="เช่น คุณพ่อสมเกียรติ ภักดี"
                      value={deceasedName}
                      onChange={(e) => setDeceasedName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="input-group">
                    <label>เลือกวัด</label>
                    <select
                      value={selectedTempleId}
                      onChange={(e) => handleTempleChange(e.target.value)}
                      className="clean-input"
                    >
                      {temples.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </section>
              )}

              {step === 1 && (
                <section className="form-section">
                  <div className="section-title">
                    <span className="step-num">02</span>
                    <h2>วันเริ่มพิธีและจำนวนคืน</h2>
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>วันที่เริ่มต้นพิธี (รดน้ำศพ/สวดคืนแรก)</label>
                      <AvailableDatePicker
                        availability={av}
                        error={availError}
                        hallIds={allHalls.map((h) => h._id)}
                        nights={nights}
                        value={startDate}
                        onChange={setStartDate}
                      />
                    </div>
                    <div className="input-group">
                      <label>จำนวนคืนสวดอภิธรรม</label>
                      <div className="radio-group">
                        {[1, 3, 5, 7].map((n) => (
                          <button
                            key={n}
                            type="button"
                            className={`btn-radio ${nights === n ? "active" : ""}`}
                            onClick={() => setNights(n)}
                          >
                            {n} คืน
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {step === 2 && (
                <section className="form-section">
                  <div className="section-title">
                    <span className="step-num">03</span>
                    <h2>จำนวนแขกและศาลา</h2>
                  </div>

                  <div className="slider-container">
                    <div className="slider-header">
                      <span>จำนวนแขกเฉลี่ยต่อคืน</span>
                      <span className="guest-value">{guests} ท่าน</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="500"
                      step="10"
                      value={guests}
                      onChange={(e) => setGuests(Number(e.target.value))}
                      className="guest-slider"
                    />
                    <div className="slider-labels">
                      <span>10</span>
                      <span>250</span>
                      <span>500+</span>
                    </div>
                  </div>

                  {availableHalls.length === 0 ? (
                    <div className="capacity-warning">
                      ⚠️ ไม่มีศาลาว่างในช่วงวันที่เลือก
                      กรุณาย้อนกลับไปเลือกวันหรือจำนวนคืนใหม่
                    </div>
                  ) : (
                    <>
                      <MCDAPanel
                        title="ระบบแนะนำศาลาที่เหมาะสม"
                        intro="เลือกสิ่งที่สำคัญที่สุดสำหรับคุณ ระบบจะจัดอันดับศาลาให้ทันที"
                        lead="สำหรับงบและจำนวนแขกของคุณ"
                        criteria={MCDA_CRITERIA}
                        presets={HALL_PRESETS}
                        weights={weights}
                        onChange={setWeights}
                        bestName={bestHall?.hall.name}
                        bestScore={bestHall?.score}
                        isCurrentBest={hall?._id === bestHall?.hall._id}
                        onApply={() => bestHall && setHall(bestHall.hall)}
                        applyLabel="เลือกศาลานี้"
                      />

                      <label className="section-subtitle">
                        เลือกศาลาประกอบพิธี
                      </label>
                      <div className="hall-grid">
                        {availableHalls.map((h) => (
                          <div
                            key={h._id}
                            className={`hall-card ${hall?._id === h._id ? "selected" : ""} ${
                              bestHall?.hall._id === h._id
                                ? "recommended-hall"
                                : ""
                            }`}
                            onClick={() => setHall(h)}
                          >
                            <div className="hall-card-top">
                              {bestHall?.hall._id === h._id ? (
                                <span className="hall-rec-star">⭐ แนะนำ</span>
                              ) : (
                                <span />
                              )}
                              <span className="hall-score-pill">
                                เหมาะสม {scoreOf(h._id) ?? 0}%
                              </span>
                            </div>
                            <div className="hall-name">{h.name}</div>
                            <div className="hall-detail">
                              ความจุ: {h.capacity} ท่าน
                            </div>
                            <div className="hall-price">
                              ฿{h.pricePerNight.toLocaleString()} / คืน
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {isOverCapacity && hall && (
                    <div className="capacity-warning">
                      ⚠️ <strong>ระบบแจ้งเตือนความจุ:</strong>{" "}
                      ศาลาที่ท่านเลือกจุได้ {hall.capacity} ท่าน
                      ระบบจะส่งรายงานให้ทีมงานพิจารณาเพิ่มเต็นท์และเก้าอี้เสริมพื้นที่ด้านนอก
                    </div>
                  )}
                </section>
              )}

              {step === 3 && (
                <section className="form-section">
                  <div className="section-title">
                    <span className="step-num">04</span>
                    <h2>แพ็กเกจพิธีสวดและบริการ</h2>
                  </div>

                  <MCDAPanel
                    title="ระบบแนะนำแพ็กเกจที่เหมาะสม"
                    intro={`คำนวณจากแขก ${guests} ท่าน × ${nights} คืน เลือกสิ่งที่สำคัญที่สุดสำหรับคุณ`}
                    lead="สำหรับจำนวนแขกและความต้องการของคุณ"
                    criteria={PKG_CRITERIA}
                    presets={PKG_PRESETS}
                    weights={pkgWeights}
                    onChange={setPkgWeights}
                    bestName={bestPkg?.pkg.name}
                    bestScore={bestPkg?.score}
                    isCurrentBest={pkg?._id === bestPkg?.pkg._id}
                    onApply={() => bestPkg && setPkg(bestPkg.pkg)}
                    applyLabel="เลือกแพ็กเกจนี้"
                  />

                  <div
                    className="pkg-grid-form"
                    style={{ marginTop: "1.5rem" }}
                  >
                    {packages.map((p) => (
                      <div
                        key={p._id}
                        className={`pkg-card-form ${pkg?._id === p._id ? "selected" : ""} ${
                          bestPkg?.pkg._id === p._id ? "recommended-hall" : ""
                        }`}
                        onClick={() => setPkg(p)}
                      >
                        <div className="hall-card-top">
                          {bestPkg?.pkg._id === p._id ? (
                            <span className="hall-rec-star">⭐ แนะนำ</span>
                          ) : (
                            <span />
                          )}
                          <span className="hall-score-pill">
                            เหมาะสม {scoreOfPkg(p._id) ?? 0}%
                          </span>
                        </div>
                        <div className="pkg-name">{p.name}</div>
                        <div className="pkg-base-price">
                          ราคาฐาน ฿{p.basePrice.toLocaleString()}
                        </div>
                        <p>{p.desc}</p>
                        <div className="pkg-snack-rate">
                          + ค่ารับรอง ฿{p.snackPerHead}/ท่าน/คืน
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {step === 4 && (
                <section className="form-section">
                  <div className="section-title">
                    <span className="step-num">05</span>
                    <h2>บริการเสริมพิเศษ (ไม่บังคับ)</h2>
                  </div>
                  <div className="addons-list">
                    {addons.map((addon) => (
                      <label key={addon._id} className="addon-item">
                        <div className="addon-left">
                          <input
                            type="checkbox"
                            checked={selectedAddons.includes(addon._id)}
                            onChange={() => handleAddonToggle(addon._id)}
                          />
                          <span>{addon.name}</span>
                        </div>
                        <div className="addon-price">
                          +฿{addon.price.toLocaleString()}
                        </div>
                      </label>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* สรุปรายการ: เดสก์ท็อปเห็นตลอด / มือถือเห็นเฉพาะขั้นสุดท้าย */}
            <div
              className={`booking-sidebar ${isLastStep ? "" : "hide-mobile"}`}
            >
              <div className="ledger-card">
                <h3>สรุปรายการการจองพิธี</h3>

                <div className="ledger-section">
                  <h4>สถานที่และกำหนดการ</h4>
                  <div className="ledger-row">
                    <span>ผู้วายชนม์:</span>
                    <span className="text-right">{deceasedName || "-"}</span>
                  </div>
                  <div className="ledger-row">
                    <span>วัด:</span>
                    <span className="text-right">{currentTemple?.name}</span>
                  </div>
                  {showSchedule && (
                    <>
                      <div className="ledger-row">
                        <span>วันที่เริ่มพิธี:</span>
                        <span className="text-right">
                          {startDate ? fmtDate(startDate) : "-"}
                        </span>
                      </div>
                      <div className="ledger-row">
                        <span>ศาลา:</span>
                        <span className="text-right">{hall?.name}</span>
                      </div>
                      <div className="ledger-row">
                        <span>ระยะเวลา:</span>
                        <span className="text-right">{nights} คืน</span>
                      </div>
                      <div className="ledger-row">
                        <span>จำนวนแขกเฉลี่ย:</span>
                        <span
                          className={`text-right ${isOverCapacity ? "text-warning" : ""}`}
                        >
                          {guests} ท่าน/คืน
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {hasTotal ? (
                  <div className="ledger-section">
                    <h4>รายละเอียดค่าใช้จ่าย (ประเมิน)</h4>
                    <div className="ledger-row">
                      <span>ค่าบำรุงศาลา ({nights} คืน)</span>
                      <span>฿{hallTotal.toLocaleString()}</span>
                    </div>
                    {showPkgCost && (
                      <>
                        <div className="ledger-row">
                          <span>แพ็กเกจ: {pkg?.name}</span>
                          <span>฿{(pkg?.basePrice || 0).toLocaleString()}</span>
                        </div>
                        <div className="ledger-row sub-row">
                          <span>
                            ↳ ค่ารับรอง (฿{pkg?.snackPerHead} × {guests}คน ×{" "}
                            {nights}
                            คืน)
                          </span>
                          <span>฿{snackTotal.toLocaleString()}</span>
                        </div>
                      </>
                    )}

                    {showAddonCost && selectedAddons.length > 0 && (
                      <>
                        <div className="ledger-divider" />
                        {selectedAddons.map((id) => {
                          const a = addons.find((x) => x._id === id);
                          return a ? (
                            <div className="ledger-row" key={id}>
                              <span>{a.name}</span>
                              <span>฿{a.price.toLocaleString()}</span>
                            </div>
                          ) : null;
                        })}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="ledger-empty">
                    รายละเอียดค่าใช้จ่ายจะแสดงเมื่อคุณเลือกศาลา และแพ็กเกจ
                  </div>
                )}

                <div
                  className="ledger-total"
                  style={{ marginBottom: showWhatIf ? "1.5rem" : 0 }}
                >
                  <div className="total-label">ยอดประเมินราคาเบื้องต้น</div>
                  <div className="total-amount">{totalText}</div>
                  <div className="total-note">
                    *ระบบจะตรวจสอบคิวศาลาซ้อนทับในฐานข้อมูลทันทีเมื่อกดยืนยัน
                  </div>
                </div>

                {showWhatIf && (
                  <div className="whatif-box">
                    <h4>Sensitivity / What-If Insights</h4>
                    <ul>
                      {lowerNights !== undefined ? (
                        <li>
                          หากลดจำนวนคืนสวดจาก {nights} คืน เหลือ {lowerNights}{" "}
                          คืน ท่านจะประหยัดงบได้{" "}
                          <strong>฿{nightsDelta.toLocaleString()}</strong>{" "}
                          <button
                            type="button"
                            className="whatif-apply"
                            onClick={() => setNights(lowerNights)}
                          >
                            ปรับเป็น {lowerNights} คืน
                          </button>
                        </li>
                      ) : higherNights !== undefined ? (
                        <li>
                          หากเพิ่มจำนวนคืนสวดจาก {nights} คืน เป็น{" "}
                          {higherNights} คืน ค่าใช้จ่ายจะเพิ่มขึ้น{" "}
                          <strong>฿{nightsDelta.toLocaleString()}</strong>
                        </li>
                      ) : null}
                      {showPkgCost && (
                        <li>
                          หากมีแขกเพิ่มขึ้นทุกๆ 20 ท่าน
                          ค่ารับรองเฉลี่ยจะเพิ่มขึ้นคืนละ{" "}
                          <strong>฿{guestStepPerNight.toLocaleString()}</strong>{" "}
                          (รวม ฿{(guestStepPerNight * nights).toLocaleString()}{" "}
                          ตลอด {nights} คืน)
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* แถบปุ่มนำทางติดขอบล่างจอ: เห็นยอดรวมและปุ่มหลักตลอดเวลา ไม่ต้องเลื่อนหา */}
          <div className="wizard-bar">
            <div className="wizard-bar-inner">
              {currentError && (
                <div className="wizard-hint" role="status">
                  {currentError}
                </div>
              )}
              <div className="wizard-bar-total">
                <span>ยอดประเมินเบื้องต้น</span>
                <strong>{totalText}</strong>
              </div>
              <div className="wizard-bar-actions">
                {step > 0 && (
                  <button
                    type="button"
                    className="btn-wizard-back"
                    onClick={goBack}
                  >
                    ← ย้อนกลับ
                  </button>
                )}
                {isLastStep ? (
                  <button
                    type="button"
                    className="btn-wizard-next"
                    onClick={handleConfirmBooking}
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? "⏳ กำลังตรวจสอบคิวและบันทึกข้อมูล..."
                      : "ส่งคำขอจองศาลา (PENDING) ➔"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-wizard-next"
                    onClick={goNext}
                    disabled={!!currentError}
                  >
                    ถัดไป ➔
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
