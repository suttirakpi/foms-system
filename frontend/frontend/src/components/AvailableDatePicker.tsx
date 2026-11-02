import React, { useEffect, useMemo, useState } from "react";
import { API_URL } from "../config";

// ปฏิทินเลือกวันเริ่มพิธี: แสดงเฉพาะวันที่มีศาลาในวัดนั้นว่างครบทุกคืนที่ต้องใช้อย่างน้อย 1 หลัง
// (วันที่ผ่านมาแล้วหรือทุกศาลาเต็มจะไม่แสดง) ผู้ใช้จึงไม่ต้องกดไล่หาวันว่างทีละวัน
// พอเลือกวันแล้ว หน้าจองจะซ่อนศาลาที่เต็มในวันนั้นด้วย (ใช้ hallFree)

export interface Availability {
  byHall: Record<string, string[]>; // hallId -> วันที่ถูกจองแล้ว
  minDate: string;
  maxDate: string | null;
}

const addDaysStr = (s: string, n: number) => {
  const [y, m, d] = s.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
};

// ศาลานี้ว่างครบทุกคืน (เริ่ม ... เริ่ม+จำนวนคืน-1) หรือไม่
export const hallFree = (av: Availability | null, hallId: string, date: string, nights: number) => {
  if (!av) return true;
  const taken = av.byHall[hallId];
  if (!taken) return true;
  for (let i = 0; i < nights; i++) if (taken.includes(addDaysStr(date, i))) return false;
  return true;
};

// โหลดวันว่างของทุกศาลาในวัดที่เลือก
export const useTempleAvailability = (templeId: string) => {
  const [av, setAv] = useState<Availability | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!templeId) return;
    let cancelled = false;
    setAv(null);
    setError("");
    fetch(`${API_URL}/api/temples/${templeId}/availability`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load failed"))))
      .then((d) => !cancelled && setAv(d))
      .catch(() => !cancelled && setError("โหลดวันว่างไม่สำเร็จ"));
    return () => {
      cancelled = true;
    };
  }, [templeId]);
  return { av, error };
};

interface Props {
  availability: Availability | null;
  error?: string;
  hallIds: string[]; // ศาลาทั้งหมดของวัดที่เลือก
  nights: number;
  value: string; // YYYY-MM-DD หรือ ""
  onChange: (date: string) => void;
}

const TH_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const TH_DOW = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`; // m: 0-11

export const AvailableDatePicker: React.FC<Props> = ({ availability, error, hallIds, nights, value, onChange }) => {
  const [view, setView] = useState<{ y: number; m: number } | null>(null);
  const minDate = availability?.minDate ?? "";
  const maxDate = availability?.maxDate ?? null;

  useEffect(() => {
    if (availability) setView((v) => v ?? { y: Number(availability.minDate.slice(0, 4)), m: Number(availability.minDate.slice(5, 7)) - 1 });
  }, [availability]);

  // วันเริ่มจองได้ ก็ต่อเมื่ออยู่ในช่วงที่วัดเปิดรับจอง และมีศาลาอย่างน้อย 1 หลังว่างครบทุกคืน
  const canStart = useMemo(
    () => (date: string) => {
      if (!availability || date < minDate) return false;
      if (maxDate && date > maxDate) return false;
      return hallIds.some((id) => hallFree(availability, id, date, nights));
    },
    [availability, hallIds, minDate, maxDate, nights],
  );

  // ถ้าวันที่เลือกไว้กลายเป็นไม่ว่าง (เปลี่ยนวัด/จำนวนคืน) ให้ล้างค่า
  useEffect(() => {
    if (value && availability && !canStart(value)) onChange("");
  }, [value, availability, canStart, onChange]);

  if (!view) return <p className="dp-note">{error || "กำลังโหลดวันว่าง..."}</p>;

  const { y, m } = view;
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const firstDow = new Date(Date.UTC(y, m, 1)).getUTCDay();
  const minY = Number(minDate.slice(0, 4));
  const minM = Number(minDate.slice(5, 7)) - 1;
  const atMin = y === minY && m === minM;
  const atMax = maxDate ? y === Number(maxDate.slice(0, 4)) && m === Number(maxDate.slice(5, 7)) - 1 : false;
  const goMonth = (delta: number) => {
    const t = new Date(Date.UTC(y, m + delta, 1));
    setView({ y: t.getUTCFullYear(), m: t.getUTCMonth() });
  };

  const cells: (number | null)[] = [...Array(firstDow).fill(null)];
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const availableCount = cells.filter((d) => d && canStart(iso(y, m, d))).length;

  return (
    <div className="dp">
      <div className="dp-head">
        <button type="button" onClick={() => goMonth(-1)} disabled={atMin} aria-label="เดือนก่อนหน้า">
          ‹
        </button>
        <b>
          {TH_MONTHS[m]} {y + 543}
        </b>
        <button type="button" onClick={() => goMonth(1)} disabled={atMax} aria-label="เดือนถัดไป">
          ›
        </button>
      </div>
      <div className="dp-grid">
        {TH_DOW.map((w) => (
          <span key={w} className="dp-dow">
            {w}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const date = iso(y, m, d);
          // วันที่ไม่ว่างไม่แสดง (ช่องว่าง) เพื่อให้ผู้ใช้เห็นแต่วันที่เลือกได้จริง
          if (!canStart(date)) return <span key={i} className="dp-gone" aria-hidden="true" />;
          return (
            <button key={i} type="button" className={`dp-day ${value === date ? "selected" : ""}`} onClick={() => onChange(date)}>
              {d}
            </button>
          );
        })}
      </div>
      {availableCount === 0 && <p className="dp-note">เดือนนี้ไม่มีวันว่างครบ {nights} คืน ลองเดือนถัดไป</p>}
      <p className="dp-note">
        แสดงเฉพาะวันที่มีศาลาว่างครบ {nights} คืน
        {value ? ` · เลือก: ${Number(value.slice(8))} ${TH_MONTHS[Number(value.slice(5, 7)) - 1]} ${Number(value.slice(0, 4)) + 543}` : ""}
      </p>
    </div>
  );
};
