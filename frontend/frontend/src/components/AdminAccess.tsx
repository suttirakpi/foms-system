import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminTemple, AdminUser, ROLES, ROLE_LABEL, Role, adminFetch, errMsg, fmtDateTime,
} from "../adminApi";
import { Field, IconSearch, Modal } from "./AdminUi";

interface Props {
  currentUserId?: string;
  flash: (msg: string, error?: boolean) => void;
}

const EMPTY = { name: "", phone: "", email: "", password: "", role: "HOST" as Role, templeId: "" };

export const AdminAccess: React.FC<Props> = ({ currentUserId, flash }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [temples, setTemples] = useState<AdminTemple[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | Role>("ALL");
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    try {
      const [u, t] = await Promise.all([adminFetch<AdminUser[]>("/users"), adminFetch<AdminTemple[]>("/temples")]);
      setUsers(u);
      setTemples(t);
      setError("");
    } catch (err) {
      setError(errMsg(err, "โหลดรายชื่อผู้ใช้ไม่สำเร็จ"));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return users.filter(
      (u) =>
        (roleFilter === "ALL" || u.role === roleFilter) &&
        (!s || [u.name, u.phone, u.email].some((v) => v.toLowerCase().includes(s))),
    );
  }, [users, q, roleFilter]);

  const patch = async (u: AdminUser, body: Partial<{ role: Role; isActive: boolean; templeId: string | null }>, okMsg: string) => {
    setBusyId(u.id);
    try {
      const next = await adminFetch<AdminUser>(`/users/${u.id}`, { method: "PATCH", body });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? next : x)));
      flash(okMsg);
    } catch (err) {
      flash(errMsg(err), true);
      load(); // ค่าที่แสดงอาจไม่ตรงกับ DB แล้ว โหลดใหม่
    } finally {
      setBusyId("");
    }
  };

  const changeRole = (u: AdminUser, role: Role) => {
    if (role === u.role) return;
    // เจ้าหน้าที่วัดต้องมีวัดสังกัด: ถ้ายังไม่มี ใช้วัดแรกเป็นค่าตั้งต้น แล้วให้แอดมินเปลี่ยนในคอลัมน์ "วัดที่สังกัด"
    if (role === "STAFF" && !u.templeId) {
      const first = temples[0];
      if (!first) return flash("ยังไม่มีวัดในระบบ กรุณาเพิ่มวัดก่อน", true);
      patch(u, { role, templeId: first._id }, `เปลี่ยน ${u.name} เป็นเจ้าหน้าที่วัด สังกัด ${first.name} (เปลี่ยนวัดได้ที่คอลัมน์ "วัดที่สังกัด")`);
      return;
    }
    patch(u, { role }, `เปลี่ยนบทบาทของ ${u.name} เป็น ${ROLE_LABEL[role]} แล้ว`);
  };

  const toggleActive = (u: AdminUser) => {
    if (u.isActive && !window.confirm(`ระงับบัญชีของ ${u.name} ใช่หรือไม่? ผู้ใช้จะเข้าสู่ระบบไม่ได้ทันที`)) return;
    patch(u, { isActive: !u.isActive }, u.isActive ? `ระงับบัญชี ${u.name} แล้ว` : `เปิดใช้งานบัญชี ${u.name} แล้ว`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || saving) return;
    setSaving(true);
    try {
      const body = { ...form, templeId: form.templeId || undefined, email: form.email || undefined };
      const created = await adminFetch<AdminUser>("/users", { method: "POST", body });
      setUsers((prev) => [...prev, created]);
      setForm(null);
      flash(`สร้างบัญชี ${created.name} เรียบร้อย`);
    } catch (err) {
      flash(errMsg(err), true);
    } finally {
      setSaving(false);
    }
  };

  const needTemple = form && (form.role === "STAFF" || form.role === "OPS");

  return (
    <section className="adm-access">
      <h1>บัญชีผู้ใช้และสิทธิ์การเข้าถึง (Access Control)</h1>
      <p>กำหนดบทบาท 4 กลุ่ม: Super Admin, Temple Staff, Operations Team, Host ทุกการเปลี่ยนแปลงถูกบันทึกในบันทึกการตรวจสอบ</p>

      <div className="adm-card">
        <div className="adm-toolbar">
          <label className="adm-search">
            <span className="ic"><IconSearch /></span>
            <input placeholder="ค้นหาชื่อ เบอร์โทร หรืออีเมล..." value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label className="adm-filter">
            บทบาท:
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as "ALL" | Role)}>
              <option value="ALL">ทั้งหมด ({users.length})</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]} ({users.filter((u) => u.role === r).length})</option>
              ))}
            </select>
          </label>
          <button className="adm-btn-black sm adm-push" onClick={() => setForm({ ...EMPTY })}>+ เพิ่มผู้ใช้</button>
        </div>

        <table className="adm-table plain">
          <thead>
            <tr>
              <th>ชื่อผู้ใช้</th><th>ช่องทางติดต่อ</th><th>บทบาท</th><th>วัดที่สังกัด</th><th>สถานะ</th><th>เข้าสู่ระบบล่าสุด</th><th className="r">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((u) => {
              const self = u.id === currentUserId;
              return (
                <tr key={u.id} className={u.isActive ? "" : "off"}>
                  <td><b>{u.name}</b>{self && <span className="adm-tag">คุณ</span>}</td>
                  <td>{u.phone}<div className="desc">{u.email}</div></td>
                  <td>
                    <select
                      value={u.role}
                      disabled={self || busyId === u.id}
                      onChange={(e) => changeRole(u, e.target.value as Role)}
                      title={self ? "เปลี่ยนบทบาทของตัวเองไม่ได้" : undefined}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </select>
                  </td>
                  <td>
                    {u.role === "STAFF" || u.role === "OPS" ? (
                      <select
                        value={u.templeId}
                        disabled={busyId === u.id}
                        onChange={(e) => patch(u, { templeId: e.target.value || null }, `ย้ายวัดของ ${u.name} แล้ว`)}
                      >
                        {u.role !== "STAFF" && <option value="">— ไม่ระบุ —</option>}
                        {u.role === "STAFF" && !u.templeId && <option value="">— เลือกวัด —</option>}
                        {temples.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                      </select>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td><span className={`adm-badge ${u.isActive ? "open" : "suspended"}`}>{u.isActive ? "ใช้งาน" : "ระงับ"}</span></td>
                  <td>{fmtDateTime(u.lastLoginAt)}</td>
                  <td className="r actions">
                    <button onClick={() => toggleActive(u)} disabled={self || busyId === u.id} title={self ? "ระงับบัญชีของตัวเองไม่ได้" : undefined}>
                      {u.isActive ? "ระงับ" : "เปิดใช้งาน"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr><td colSpan={7} className="empty">{loading ? "กำลังโหลด..." : error || "ไม่พบผู้ใช้ตามเงื่อนไข"}</td></tr>
            )}
          </tbody>
        </table>
        <div className="adm-table-foot"><span>แสดง {visible.length} จากทั้งหมด {users.length} บัญชี</span></div>
      </div>

      {form && (
        <Modal title="เพิ่มผู้ใช้ใหม่" onClose={() => setForm(null)}>
          <form className="adm-form" onSubmit={submit}>
            <Field label="ชื่อ-นามสกุล"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <div className="adm-form-row">
              <Field label="เบอร์โทรศัพท์" hint="ใช้เป็นชื่อผู้ใช้สำหรับเข้าสู่ระบบ">
                <input required inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <Field label="อีเมล (ไม่บังคับ)"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            </div>
            <Field label="รหัสผ่านเริ่มต้น" hint="อย่างน้อย 8 ตัวอักษร แจ้งผู้ใช้ให้เปลี่ยนหลังเข้าสู่ระบบครั้งแรก">
              <input required type="password" minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <div className="adm-form-row">
              <Field label="บทบาท">
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
              </Field>
              <Field label={needTemple ? "วัดที่สังกัด" : "วัดที่สังกัด (ไม่ต้องระบุ)"}>
                <select disabled={!needTemple} required={form.role === "STAFF"} value={form.templeId} onChange={(e) => setForm({ ...form, templeId: e.target.value })}>
                  <option value="">— เลือกวัด —</option>
                  {temples.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </Field>
            </div>
            <div className="adm-form-actions">
              <button type="button" onClick={() => setForm(null)}>ยกเลิก</button>
              <button type="submit" className="adm-btn-black sm" disabled={saving}>{saving ? "กำลังบันทึก..." : "สร้างบัญชี"}</button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
};
