import React, { useCallback, useEffect, useState } from "react";
import {
  ACTION_LABEL, BOOKING_STATUS_LABEL, ENTITY_LABEL, Overview, ROLE_LABEL, Role,
  adminFetch, baht, errMsg, fmtDate, fmtDateTime,
} from "../adminApi";
import { IconRefresh } from "./AdminUi";

const STATUS_ORDER = ["PENDING", "CONFIRMED", "PAID", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export const AdminOverview: React.FC<{ onOpenAudit: () => void }> = ({ onOpenAudit }) => {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await adminFetch<Overview>("/overview"));
    } catch (err) {
      setError(errMsg(err, "โหลดภาพรวมระบบไม่สำเร็จ"));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  if (error) return <div className="adm-placeholder">{error}</div>;
  if (!data) return <div className="adm-placeholder">{loading ? "กำลังโหลดภาพรวมระบบ..." : "ไม่มีข้อมูล"}</div>;

  const maxStatus = Math.max(1, ...STATUS_ORDER.map((s) => data.bookings.byStatus[s] || 0));

  return (
    <section className="adm-ov">
      <div className="adm-ov-head">
        <div>
          <h1>ภาพรวมระบบ (System Overview)</h1>
          <p>สรุปสถานะผู้ใช้ งานจอง รายได้ และการเปลี่ยนแปลงล่าสุด ณ เวลาที่โหลดหน้านี้</p>
        </div>
        <button className="adm-refresh" onClick={load} title="โหลดใหม่" aria-label="โหลดใหม่"><IconRefresh /></button>
      </div>

      <div className="adm-cards">
        <div className="adm-kpi">
          <small>ผู้ใช้ทั้งหมด</small>
          <b>{data.users.total}</b>
          <em>ใช้งานอยู่ {data.users.active} บัญชี</em>
        </div>
        <div className="adm-kpi">
          <small>งานจองทั้งหมด</small>
          <b>{data.bookings.total}</b>
          <em>รออนุมัติ {data.bookings.byStatus.PENDING || 0} งาน</em>
        </div>
        <div className="adm-kpi">
          <small>รายได้ที่ยืนยันแล้ว</small>
          <b>{baht(data.revenue.approved)}</b>
          <em>สลิปรอตรวจ {data.revenue.pendingSlips} รายการ</em>
        </div>
        <div className="adm-kpi">
          <small>วัดและศาลา</small>
          <b>{data.temples.active} <span>วัด</span></b>
          <em>ศาลา/เมรุเปิดใช้ {data.temples.hallsActive} จาก {data.temples.halls}</em>
        </div>
      </div>

      <div className="adm-ov-grid">
        <div className="adm-card">
          <h3>งานจองแยกตามสถานะ</h3>
          <div className="adm-bars">
            {STATUS_ORDER.map((s) => {
              const n = data.bookings.byStatus[s] || 0;
              return (
                <div key={s} className="adm-bar-row">
                  <span>{BOOKING_STATUS_LABEL[s]}</span>
                  <div className="adm-bar"><i style={{ width: `${(n / maxStatus) * 100}%` }} /></div>
                  <b>{n}</b>
                </div>
              );
            })}
          </div>
        </div>
        <div className="adm-card">
          <h3>ผู้ใช้แยกตามบทบาท</h3>
          <div className="adm-bars">
            {(["ADMIN", "STAFF", "OPS", "HOST"] as Role[]).map((r) => {
              const n = data.users.byRole[r] || 0;
              const max = Math.max(1, ...Object.values(data.users.byRole));
              return (
                <div key={r} className="adm-bar-row">
                  <span>{ROLE_LABEL[r]}</span>
                  <div className="adm-bar"><i style={{ width: `${(n / max) * 100}%` }} /></div>
                  <b>{n}</b>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="adm-card">
        <h3>งานจองล่าสุด</h3>
        <table className="adm-table plain">
          <thead>
            <tr><th>รหัส</th><th>เจ้าภาพ / ผู้วายชนม์</th><th>วัด / ศาลา</th><th>วันเริ่ม</th><th className="r">ยอดรวม</th><th>สถานะ</th></tr>
          </thead>
          <tbody>
            {data.recentBookings.map((b) => (
              <tr key={b._id}>
                <td className="code">{b.bookingRef}</td>
                <td><b>{b.hostName}</b><div className="desc">{b.deceasedName}</div></td>
                <td>{b.templeName}<div className="desc">{b.hallName}</div></td>
                <td>{fmtDate(b.startDate)} ({b.nights} คืน)</td>
                <td className="r">{baht(b.pricing.grandTotal)}</td>
                <td>{BOOKING_STATUS_LABEL[b.status] || b.status}</td>
              </tr>
            ))}
            {data.recentBookings.length === 0 && <tr><td colSpan={6} className="empty">ยังไม่มีงานจอง</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="adm-card">
        <div className="adm-card-head">
          <h3>การเปลี่ยนแปลงล่าสุดของระบบ</h3>
          <button className="link" onClick={onOpenAudit}>ดูทั้งหมด →</button>
        </div>
        <ul className="adm-feed">
          {data.recentAudit.map((a) => (
            <li key={a._id}>
              <time>{fmtDateTime(a.createdAt)}</time>
              <span><b>{a.actorName || "ระบบ"}</b> · {ACTION_LABEL[a.action] || a.action} {ENTITY_LABEL[a.entity] || a.entity}: {a.summary}</span>
            </li>
          ))}
          {data.recentAudit.length === 0 && <li className="empty">ยังไม่มีบันทึกการเปลี่ยนแปลง</li>}
        </ul>
      </div>
    </section>
  );
};
