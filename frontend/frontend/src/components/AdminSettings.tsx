import React, { useCallback, useEffect, useState } from "react";
import { SystemInfo, adminFetch, errMsg, fmtDateTime } from "../adminApi";
import { Field, IconRefresh } from "./AdminUi";

const fmtUptime = (s: number) => {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d ? d + " วัน " : ""}${h ? h + " ชม. " : ""}${m} นาที`;
};

export const AdminSettings: React.FC<{ flash: (msg: string, error?: boolean) => void }> = ({ flash }) => {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [error, setError] = useState("");
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setInfo(await adminFetch<SystemInfo>("/system"));
      setError("");
    } catch (err) {
      setError(errMsg(err, "โหลดข้อมูลระบบไม่สำเร็จ"));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (pw.newPassword !== pw.confirm) return flash("รหัสผ่านใหม่และการยืนยันไม่ตรงกัน", true);
    setSaving(true);
    try {
      await adminFetch("/me/password", {
        method: "POST",
        body: { currentPassword: pw.currentPassword, newPassword: pw.newPassword },
      });
      setPw({ currentPassword: "", newPassword: "", confirm: "" });
      flash("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว");
    } catch (err) {
      flash(errMsg(err), true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="adm-access">
      <h1>การตั้งค่าระบบ (Settings)</h1>
      <p>ความปลอดภัยของบัญชีผู้ดูแล และสถานะการทำงานของระบบ</p>
      <div className="adm-ov-grid">
        <div className="adm-card">
          <h3>เปลี่ยนรหัสผ่านของฉัน</h3>
          <form className="adm-form" onSubmit={submit}>
            <Field label="รหัสผ่านปัจจุบัน">
              <input required type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
            </Field>
            <Field label="รหัสผ่านใหม่" hint="อย่างน้อย 8 ตัวอักษร">
              <input required type="password" minLength={8} autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
            </Field>
            <Field label="ยืนยันรหัสผ่านใหม่">
              <input required type="password" minLength={8} autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
            </Field>
            <div className="adm-form-actions">
              <button type="submit" className="adm-btn-black sm" disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}</button>
            </div>
          </form>
        </div>

        <div className="adm-card">
          <div className="adm-card-head">
            <h3>สถานะระบบ</h3>
            <button className="adm-refresh" onClick={load} title="โหลดใหม่" aria-label="โหลดใหม่"><IconRefresh /></button>
          </div>
          {info ? (
            <dl className="adm-dl">
              <dt>ฐานข้อมูล</dt>
              <dd><span className={`adm-badge ${info.database.state === "connected" ? "open" : "suspended"}`}>{info.database.state === "connected" ? "เชื่อมต่อแล้ว" : info.database.state}</span> {info.database.name}</dd>
              <dt>เวลาเซิร์ฟเวอร์</dt><dd>{fmtDateTime(info.serverTime)}</dd>
              <dt>เปิดทำงานมาแล้ว</dt><dd>{fmtUptime(info.uptimeSeconds)}</dd>
              <dt>เวอร์ชันระบบ</dt><dd>{info.appName} {info.appVersion} · Node {info.nodeVersion}</dd>
              <dt>สภาพแวดล้อม</dt><dd>{info.environment}</dd>
              <dt>ข้อมูลในระบบ</dt>
              <dd>ผู้ใช้ {info.counts.users} · งานจอง {info.counts.bookings} · วัด {info.counts.temples} · บันทึกตรวจสอบ {info.counts.audit}</dd>
            </dl>
          ) : (
            <p className="muted">{error || "กำลังโหลด..."}</p>
          )}
        </div>
      </div>
    </section>
  );
};
