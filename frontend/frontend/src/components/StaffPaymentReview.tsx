// แผงตรวจสลิปโอนเงินสำหรับเจ้าหน้าที่วัด (อยู่ในหน้า Approvals): ดูรูปสลิป อนุมัติ/ปฏิเสธพร้อมเหตุผล
import React, { useCallback, useEffect, useState } from "react";
import { API_URL } from "../config";
import { staffFetch, thaiDateTime } from "../staffApi";
import { hostFetch } from "../hostApi";

interface PendingSlip {
  id: string;
  installmentNo: number;
  label: string;
  plan: "FULL" | "INSTALLMENT";
  amountDue: number;
  paidAmount?: number;
  paidAt?: string;
  submittedAt: string;
  fileName?: string;
  booking: { id: string; ref: string; hostName: string; deceasedName: string; hallName: string; grandTotal: number };
}

const baht = (n: number) => `฿${Math.round(n).toLocaleString("th-TH")}`;

export const StaffPaymentReview: React.FC<{ onChanged?: () => void }> = ({ onChanged }) => {
  const [rows, setRows] = useState<PendingSlip[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [view, setView] = useState<{ url: string; title: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await staffFetch<PendingSlip[]>("/payments/pending"));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดสลิปรอตรวจไม่สำเร็จ");
      setRows([]);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => () => {
    if (view) URL.revokeObjectURL(view.url);
  }, [view]);

  const open = async (r: PendingSlip) => {
    setBusy(r.id);
    try {
      const res = await fetch(`${API_URL}/api/payments/${r.id}/slip`, { credentials: "include" });
      if (!res.ok) throw new Error("เปิดรูปสลิปไม่สำเร็จ");
      setView({ url: URL.createObjectURL(await res.blob()), title: `${r.booking.ref} · ${r.label}` });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "เปิดรูปสลิปไม่สำเร็จ");
    } finally {
      setBusy("");
    }
  };

  const review = async (r: PendingSlip, decision: "APPROVE" | "REJECT") => {
    let reason: string | undefined;
    if (decision === "REJECT") {
      const input = window.prompt(`เหตุผลที่ไม่ผ่านสลิป ${r.label} ของ ${r.booking.ref} (จำเป็นต้องระบุ เจ้าภาพจะเห็นข้อความนี้)`);
      if (!input || !input.trim()) return;
      reason = input.trim();
    }
    setBusy(r.id);
    setNotice("");
    try {
      await hostFetch(`/payments/${r.id}/review`, { method: "PATCH", body: { decision, reason } });
      setNotice(decision === "APPROVE" ? `อนุมัติสลิป ${r.label} ของ ${r.booking.ref} แล้ว` : `ส่งสลิป ${r.label} คืนให้เจ้าภาพแก้ไขแล้ว`);
      await load();
      onChanged?.();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "บันทึกผลตรวจไม่สำเร็จ");
      await load();
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="staff-table-card" style={{ marginTop: 24 }}>
      <div className="staff-table-head">
        <strong>สลิปโอนเงินรอตรวจสอบ ({rows ? rows.length : "…"})</strong>
        <span>งวดชำระที่เจ้าภาพส่งหลักฐานมาแล้ว ตรวจให้ตรงกับยอดแล้วกดผ่านหรือส่งกลับ</span>
      </div>
      {notice && <div className="slip-notice">{notice}</div>}
      <div className="staff-table-scroll">
        <table className="staff-table">
          <thead>
            <tr>
              <th>รหัสงาน / เจ้าภาพ</th>
              <th>ผู้วายชนม์ / ศาลา</th>
              <th>งวดชำระ</th>
              <th>ยอดที่ต้องชำระ / ที่โอนมา</th>
              <th>ส่งเมื่อ</th>
              <th className="staff-th-right">การตรวจสอบ</th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((r) => (
              <tr key={r.id}>
                <td><div className="staff-ref">{r.booking.ref}</div><div className="staff-muted">{r.booking.hostName}</div></td>
                <td><div className="staff-strong">{r.booking.deceasedName}</div><div className="staff-muted">{r.booking.hallName}</div></td>
                <td><div className="staff-strong">งวดที่ {r.installmentNo}: {r.label}</div><div className="staff-muted">{r.plan === "FULL" ? "ชำระเต็ม" : "แบ่ง 2 งวด"} จากยอด {baht(r.booking.grandTotal)}</div></td>
                <td>
                  <div className="staff-strong">{baht(r.amountDue)}</div>
                  <div className={`staff-muted ${r.paidAmount !== undefined && Math.round(r.paidAmount) !== Math.round(r.amountDue) ? "danger" : ""}`}>
                    โอนมา {r.paidAmount !== undefined ? baht(r.paidAmount) : "—"}
                    {r.paidAmount !== undefined && Math.round(r.paidAmount) !== Math.round(r.amountDue) ? " (ไม่ตรงยอด)" : ""}
                  </div>
                </td>
                <td>{thaiDateTime(r.submittedAt)}</td>
                <td className="staff-actions">
                  <button className="staff-btn-outline-sm" disabled={busy === r.id} onClick={() => open(r)}>ดูสลิป</button>
                  <button className="staff-btn-approve" disabled={busy === r.id} onClick={() => review(r, "APPROVE")}>ผ่าน</button>
                  <button className="staff-btn-reject" aria-label="ไม่ผ่านสลิป" disabled={busy === r.id} onClick={() => review(r, "REJECT")}>✕</button>
                </td>
              </tr>
            ))}
            {rows && rows.length === 0 && (
              <tr><td colSpan={6} className="staff-empty">{error || "ไม่มีสลิปที่รอตรวจสอบ"}</td></tr>
            )}
            {!rows && <tr><td colSpan={6} className="staff-empty">กำลังโหลด...</td></tr>}
          </tbody>
        </table>
      </div>

      {view && (
        <div className="slip-modal" onMouseDown={(e) => e.target === e.currentTarget && setView(null)}>
          <div className="slip-modal-box">
            <div className="slip-modal-head">
              <b>{view.title}</b>
              <button onClick={() => setView(null)} aria-label="ปิด">✕</button>
            </div>
            <img src={view.url} alt="สลิปโอนเงิน" />
          </div>
        </div>
      )}
    </section>
  );
};
