// กล่องชำระเงินของเจ้าภาพ: เลือกแผน (เต็ม/ผ่อน 2 งวด) -> อัปโหลดสลิปจริงแต่ละงวด -> ดูผลตรวจจากเจ้าหน้าที่
import React, { useCallback, useEffect, useState } from "react";
import { PayStatus, PaymentList, PaymentRow, baht, errMsg, hostFetch } from "../hostApi";

const STATUS_TEXT: Record<PayStatus, string> = {
  UNPAID: "รอชำระ",
  PENDING: "รอเจ้าหน้าที่ตรวจสลิป",
  APPROVED: "ชำระแล้ว ✓",
  REJECTED: "สลิปไม่ผ่าน",
};

interface Props {
  bookingId: string;
  status: string; // สถานะงาน
  grandTotal: number;
  onChanged: () => void; // แจ้งหน้าแม่ให้โหลดสถานะงานใหม่
}

export const HostPayment: React.FC<Props> = ({ bookingId, status, grandTotal, onChanged }) => {
  const [data, setData] = useState<PaymentList | null>(null);
  const [plan, setPlan] = useState<"FULL" | "INSTALLMENT">("INSTALLMENT");
  const [changing, setChanging] = useState(false);
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ text: string; err: boolean } | null>(null);

  const approved = ["CONFIRMED", "PAID", "IN_PROGRESS", "COMPLETED"].includes(status);

  const load = useCallback(async () => {
    try {
      setData(await hostFetch<PaymentList>(`/bookings/${bookingId}/payments`));
    } catch (err) {
      setMsg({ text: errMsg(err), err: true });
    }
  }, [bookingId]);
  useEffect(() => {
    load();
  }, [load, status]);

  const deposit = Math.round((grandTotal * 30) / 100);

  const savePlan = async () => {
    setBusy("plan");
    setMsg(null);
    try {
      await hostFetch(`/bookings/${bookingId}/payment-plan`, { method: "POST", body: { plan } });
      setChanging(false);
      await load();
    } catch (err) {
      setMsg({ text: errMsg(err), err: true });
    } finally {
      setBusy("");
    }
  };

  const upload = async (p: PaymentRow) => {
    const file = files[p._id];
    if (!file) return setMsg({ text: "กรุณาเลือกไฟล์รูปสลิป (JPG หรือ PNG ไม่เกิน 5MB)", err: true });
    if (file.size > 5 * 1024 * 1024) return setMsg({ text: "ไฟล์ใหญ่เกิน 5MB", err: true });
    const form = new FormData();
    form.append("slip", file);
    form.append("paidAmount", amounts[p._id] ?? String(p.amountDue));
    setBusy(p._id);
    setMsg(null);
    try {
      await hostFetch(`/payments/${p._id}/slip`, { method: "POST", form });
      setFiles((f) => ({ ...f, [p._id]: undefined }));
      setMsg({ text: `ส่งสลิป "${p.label}" แล้ว รอเจ้าหน้าที่วัดตรวจสอบ`, err: false });
      await load();
      onChanged();
    } catch (err) {
      setMsg({ text: errMsg(err), err: true });
    } finally {
      setBusy("");
    }
  };

  if (status === "CANCELLED") return <div className="pay-note">งานนี้ถูกยกเลิกแล้ว ไม่ต้องชำระเงิน</div>;
  if (!approved)
    return (
      <div className="pay-note">
        ⏳ รอวัดอนุมัติคำขอจองก่อน จึงจะเลือกแผนและชำระเงินได้ ระบบจะเปิดให้ชำระทันทีที่เจ้าหน้าที่อนุมัติ
      </div>
    );
  if (!data) return <div className="pay-note">กำลังโหลดข้อมูลการชำระเงิน...</div>;

  const hasPlan = data.payments.length > 0;
  const locked = data.payments.some((p) => p.status === "PENDING" || p.status === "APPROVED");
  const overall = { UNPAID: "ยังไม่ชำระ", SLIP_UPLOADED: "ส่งสลิปแล้ว รอตรวจสอบ", PARTIAL: "ชำระบางส่วน", PAID: "ชำระครบแล้ว ✓" }[data.paymentStatus];

  return (
    <div className="pay-box">
      {msg && <div className={`pay-msg ${msg.err ? "err" : ""}`}>{msg.text}</div>}

      {data.bank && (
        <div className="pay-bank">
          <b>โอนเงินเข้าบัญชีวัด</b>
          <span>{data.bank.bankName} · เลขที่ {data.bank.bankAccount}</span>
        </div>
      )}

      {(!hasPlan || changing) && (
        <div className="pay-plans">
          <div className="upload-label">เลือกแผนการชำระเงิน</div>
          <label className={`pay-plan ${plan === "INSTALLMENT" ? "on" : ""}`}>
            <input type="radio" checked={plan === "INSTALLMENT"} onChange={() => setPlan("INSTALLMENT")} />
            <span>
              <b>แบ่งชำระ 2 งวด</b>
              <em>มัดจำ 30% {baht(deposit)} และยอดคงเหลือ {baht(grandTotal - deposit)}</em>
            </span>
          </label>
          <label className={`pay-plan ${plan === "FULL" ? "on" : ""}`}>
            <input type="radio" checked={plan === "FULL"} onChange={() => setPlan("FULL")} />
            <span>
              <b>ชำระเต็มจำนวน</b>
              <em>{baht(grandTotal)} ครั้งเดียว</em>
            </span>
          </label>
          <button className="btn-solid-black" disabled={busy === "plan"} onClick={savePlan}>
            {busy === "plan" ? "กำลังบันทึก..." : "ยืนยันแผนการชำระเงิน"}
          </button>
          {changing && <span className="cancel-link" onClick={() => setChanging(false)}>ยกเลิกการเปลี่ยนแผน</span>}
        </div>
      )}

      {hasPlan && !changing && (
        <>
          <div className="pay-status">สถานะการชำระ: <strong>{overall}</strong></div>
          {data.payments.map((p, i) => {
            const prevOk = i === 0 || data.payments[i - 1].status === "APPROVED";
            const canUpload = (p.status === "UNPAID" || p.status === "REJECTED") && prevOk;
            return (
              <div key={p._id} className={`pay-row ${p.status.toLowerCase()}`}>
                <div className="pay-row-head">
                  <span>
                    <b>งวดที่ {p.installmentNo}: {p.label}</b>
                    <em>{baht(p.amountDue)}</em>
                  </span>
                  <span className={`pay-badge ${p.status.toLowerCase()}`}>{STATUS_TEXT[p.status]}</span>
                </div>
                {p.status === "REJECTED" && p.rejectReason && <div className="pay-reason">เหตุผลที่ไม่ผ่าน: {p.rejectReason} กรุณาส่งสลิปใหม่</div>}
                {p.status === "PENDING" && <div className="pay-hint">ส่งสลิปแล้ว ({p.slip?.originalName || "ไฟล์สลิป"}) รอเจ้าหน้าที่ตรวจสอบ</div>}
                {!prevOk && p.status === "UNPAID" && <div className="pay-hint">ชำระได้หลังงวดที่ {p.installmentNo - 1} ผ่านการตรวจสอบ</div>}
                {canUpload && (
                  <div className="pay-upload">
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={(e) => setFiles((f) => ({ ...f, [p._id]: e.target.files?.[0] }))}
                    />
                    <label>
                      จำนวนเงินที่โอน (บาท)
                      <input
                        type="number"
                        min={1}
                        value={amounts[p._id] ?? String(p.amountDue)}
                        onChange={(e) => setAmounts((a) => ({ ...a, [p._id]: e.target.value }))}
                      />
                    </label>
                    <button className="btn-solid-black" disabled={busy === p._id || !files[p._id]} onClick={() => upload(p)}>
                      {busy === p._id ? "กำลังส่ง..." : "ส่งหลักฐานการชำระเงิน"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {!locked && <span className="cancel-link" onClick={() => setChanging(true)}>เปลี่ยนแผนการชำระเงิน</span>}
        </>
      )}
    </div>
  );
};
