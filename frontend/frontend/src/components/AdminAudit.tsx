import React, { useCallback, useEffect, useState } from "react";
import { ACTION_LABEL, AuditRow, ENTITY_LABEL, adminFetch, errMsg, fmtDateTime } from "../adminApi";
import { IconRefresh, IconSearch } from "./AdminUi";

export const AdminAudit: React.FC = () => {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [q, setQ] = useState("");
  const [entity, setEntity] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (q.trim()) params.set("q", q.trim());
      if (entity) params.set("entity", entity);
      setRows(await adminFetch<AuditRow[]>(`/audit?${params.toString()}`));
      setError("");
    } catch (err) {
      setError(errMsg(err, "โหลดบันทึกการตรวจสอบไม่สำเร็จ"));
    } finally {
      setLoading(false);
    }
  }, [q, entity]);

  // ค้นหาแบบหน่วงเวลาเล็กน้อย กันยิง API ทุกตัวอักษร
  useEffect(() => {
    const t = window.setTimeout(load, 250);
    return () => window.clearTimeout(t);
  }, [load]);

  return (
    <section className="adm-access">
      <h1>บันทึกการตรวจสอบ (Audit Trail / Logs)</h1>
      <p>ทุกการเพิ่ม แก้ไข ระงับ และตั้งค่ากฎโดยผู้ดูแลระบบ ถูกบันทึกถาวร ไม่มีช่องทางแก้ไขหรือลบผ่านระบบ แสดงล่าสุด 200 รายการ</p>
      <div className="adm-card">
        <div className="adm-toolbar">
          <label className="adm-search">
            <span className="ic"><IconSearch /></span>
            <input placeholder="ค้นหาจากรายละเอียดหรือชื่อผู้ดำเนินการ..." value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label className="adm-filter">
            ประเภท:
            <select value={entity} onChange={(e) => setEntity(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {Object.entries(ENTITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <button className="adm-refresh" onClick={load} title="โหลดใหม่" aria-label="โหลดใหม่"><IconRefresh /></button>
        </div>
        <table className="adm-table plain">
          <thead>
            <tr><th>เวลา</th><th>ผู้ดำเนินการ</th><th>การกระทำ</th><th>ประเภท</th><th>รายละเอียด</th></tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a._id}>
                <td className="nowrap">{fmtDateTime(a.createdAt)}</td>
                <td><b>{a.actorName || "ระบบ"}</b><div className="desc">{a.actorRole}</div></td>
                <td><span className={`adm-badge act-${a.action.toLowerCase()}`}>{ACTION_LABEL[a.action] || a.action}</span></td>
                <td>{ENTITY_LABEL[a.entity] || a.entity}</td>
                <td>{a.summary}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="empty">{loading ? "กำลังโหลด..." : error || "ไม่พบบันทึกตามเงื่อนไข"}</td></tr>
            )}
          </tbody>
        </table>
        <div className="adm-table-foot"><span>แสดง {rows.length} รายการ</span></div>
      </div>
    </section>
  );
};
