import React, { useEffect, useMemo, useState } from "react";
import { API_URL } from "../config";

// ปฏิทินเลือกวันเริ่มพิธี: วันที่ศาลาไม่ว่างครบทุกคืนที่ต้องใช้ (หรือเป็นวันที่ผ่านมาแล้ว) จะไม่แสดงให้เลือก
// ผู้ใช้จึงไม่ต้องกดไล่หาวันว่างทีละวัน

interface Props {
  hallId: string | null;
  hallName?: string;
  nights: number;
  value: string; // YYYY-MM-DD หรือ ""
  onChange: (date: string) => void;
}

const TH_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const TH_DOW = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`; // m: 0-11
const addDaysStr = (s: string, n: number) => {
  const [y, m, d] = s.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return iso(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
};

export const AvailableDatePicker: React.FC<Props> = ({ hallId, hallName, nights, value, onChange }) => {
  const [booked, setBooked] = useState<Set<string>>(new Set());
  const [minDate, setMinDate] = useState("");
  const [maxDate, setMaxDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<{ y: number; m: number } | null>(null);

  useEffect(() => {
    if (!hallId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`${API_URL}/api/halls/${hallId}/booked-dates`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load failed"))))
      .then((d) => {
        if (cancelled) return;
        setBooked(new Set<string>(d.booked || []));
        setMinDate(d.minDate);
        setMaxDate(d.maxDate || null);
        setView((v) => v ?? { y: Number(d.minDate.slice(0, 4)), m: Number(d.minDate.slice(5, 7)) - 1 });
      })
      .catch(() => !cancelled && setError("โหลดวันว่างของศาลาไม่สำเร็จ"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [hallId]);

  // วันเริ่มจองได้ ก็ต่อเมื่อทุกคืนที่ใช้ (เริ่ม ... เริ่ม+จำนวนคืน-1) ว่าง และอยู่ในช่วงที่วัดเปิดรับจอง
  const canStart = useMemo(
    () => (date: string) => {
      if (!minDate || date < minDate) return false;
      if (maxDate && date > maxDate) return false;
      for (let i = 0; i < nights; i++) if (booked.has(addDaysStr(date, i))) return false;
      return true;
    },
    [booked, minDate, maxDate, nights],
  );

  // ถ้าวันที่เลือกไว้กลายเป็นไม่ว่าง (เปลี่ยนศาลา/จำนวนคืน) ให้ล้างค่า
  useEffect(() => {
    if (value && minDate && !canStart(value)) onChange("");
  }, [value, minDate, canStart, onChange]);

  if (!hallId) return <p className="dp-note">กรุณาเลือกศาลาก่อน</p>;
  if (!view) return <p className="dp-note">{error || (loading ? "กำลังโหลดวันว่าง..." : "")}</p>;

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
      {availableCount === 0 && <p className="dp-note">เดือนนี้ไม่มีวันว่างครบ {nights} คืน ลองเดือนถัดไปหรือเลือกศาลาอื่น</p>}
      <p className="dp-note">
        แสดงเฉพาะวันที่{hallName ? ` ${hallName}` : "ศาลานี้"}ว่างครบ {nights} คืน
        {value ? ` · เลือก: ${Number(value.slice(8))} ${TH_MONTHS[Number(value.slice(5, 7)) - 1]} ${Number(value.slice(0, 4)) + 543}` : ""}
      </p>
    </div>
  );
};
