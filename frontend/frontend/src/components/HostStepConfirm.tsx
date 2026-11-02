import React, { useCallback, useEffect, useState } from "react";
import { errMsg, hostFetch } from "../hostApi";

// กล่องแจ้งเตือนฝั่งเจ้าภาพ: ทีมจัดงานติ๊กว่าขั้นตอนไหนเสร็จ เจ้าภาพต้องกดยืนยันว่าเสร็จจริง จึงนับเป็นเสร็จสมบูรณ์

interface PendingStep {
  id: string;
  date: string;
  n: number;
  time: string;
  title: string;
  desc: string;
  doneByName: string;
  doneAt?: string;
  disputeNote?: string;
}
interface StepConfirmations {
  pending: PendingStep[];
  disputed: PendingStep[];
  confirmed: number;
  total: number;
}

const POLL_MS = 8000;
const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const thShort = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${TH_MONTHS[m - 1]} ${y + 543}`;
};
const hhmm = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "");

export const HostStepConfirm: React.FC<{ bookingId: string; onChanged?: () => void }> = ({ bookingId, onChanged }) => {
  const [data, setData] = useState<StepConfirmations | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await hostFetch<StepConfirmations>(`/bookings/${bookingId}/step-confirmations`));
    } catch {
      /* ปล่อยผ่าน: รอบถัดไปจะลองใหม่ */
    }
  }, [bookingId]);

  useEffect(() => {
    setData(null);
    load();
    const t = window.setInterval(load, POLL_MS); // เด้งขึ้นเองเมื่อทีมจัดงานติ๊กเสร็จ ไม่ต้องรีเฟรช
    return () => window.clearInterval(t);
  }, [load]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setMsg("");
    try {
      await fn();
      setMsg(ok);
      await load();
      onChanged?.();
    } catch (err) {
      setMsg(errMsg(err));
    } finally {
      setBusy(false);
    }
  };
  const confirm = (s: PendingStep) =>
    run(() => hostFetch(`/run-steps/${s.id}/confirm`, { method: "PATCH", body: { decision: "CONFIRM" } }), `ยืนยันแล้ว: ${s.title}`);
  const dispute = (s: PendingStep) => {
    const note = window.prompt(`ขั้นตอน "${s.title}" ยังไม่เสร็จเรียบร้อยเพราะอะไร? (ทีมจัดงานจะเห็นเหตุผลนี้)`);
    if (!note || !note.trim()) return;
    run(() => hostFetch(`/run-steps/${s.id}/confirm`, { method: "PATCH", body: { decision: "DISPUTE", note: note.trim() } }), "แจ้งทีมจัดงานแล้วว่ายังไม่เสร็จ");
  };
  const confirmAll = () =>
    run(() => hostFetch(`/bookings/${bookingId}/step-confirmations/confirm-all`, { method: "PATCH" }), "ยืนยันทุกขั้นตอนแล้ว");

  if (!data || data.total === 0) return null;
  const waiting = data.pending.length;

  return (
    <div className={`step-confirm ${waiting > 0 ? "alert" : ""}`}>
      <div className="step-confirm-head">
        <div>
          <b>{waiting > 0 ? `🔔 มี ${waiting} ขั้นตอนรอคุณยืนยันว่าเสร็จจริง` : "การยืนยันขั้นตอนพิธี"}</b>
          <small>
            {" "}
            ยืนยันแล้ว {data.confirmed} / {data.total} ขั้นตอน
          </small>
        </div>
        {waiting > 1 && (
          <button type="button" className="step-confirm-all" disabled={busy} onClick={confirmAll}>
            ยืนยันทั้งหมด
          </button>
        )}
      </div>

      {data.pending.map((s) => (
        <div key={s.id} className="step-confirm-row">
          <div>
            <b>{s.title}</b>
            <p>
              {thShort(s.date)} · {s.time} · ทีมจัดงาน ({s.doneByName}) แจ้งว่าเสร็จเมื่อ {hhmm(s.doneAt)} น.
            </p>
          </div>
          <div className="step-confirm-actions">
            <button type="button" className="ok" disabled={busy} onClick={() => confirm(s)}>
              ✓ เสร็จจริง
            </button>
            <button type="button" className="no" disabled={busy} onClick={() => dispute(s)}>
              ยังไม่เสร็จ
            </button>
          </div>
        </div>
      ))}

      {data.disputed.map((s) => (
        <div key={s.id} className="step-confirm-row disputed">
          <div>
            <b>{s.title}</b>
            <p>คุณแจ้งว่ายังไม่เสร็จ: {s.disputeNote} · รอทีมจัดงานดำเนินการและแจ้งใหม่</p>
          </div>
        </div>
      ))}

      {msg && <p className="step-confirm-msg">{msg}</p>}
    </div>
  );
};
