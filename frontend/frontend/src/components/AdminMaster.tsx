// แท็บ "จัดการข้อมูลกลาง": ศาลา+กฎวัด, พระ/มัคนายก, แพ็กเกจ, ตัวเลือกเสริม
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminAddon,
  AdminHall,
  AdminPackage,
  AdminPerson,
  AdminTemple,
  ApiError,
  AuditRow,
  PERSON_LABEL,
  PersonType,
  adminFetch,
  baht,
  errMsg,
  fmtDateTime,
} from "../adminApi";
import {
  Field,
  IconFlame,
  IconInfo,
  IconRefresh,
  IconSearch,
  IconShield,
  IconSliders,
  IconSnow,
  Modal,
} from "./AdminUi";

type Flash = (msg: string, error?: boolean) => void;

interface Rules {
  NO_CREMATION_ON_BUDDHIST_DAY: boolean;
  CHANT_CURFEW_2030: boolean;
  MIN_MONKS_4: boolean;
  NO_FIREWORKS: boolean;
  ADVANCE_BOOKING_LIMIT_60: boolean;
  HALL_BUFFER_MINUTES: number;
}
type BoolRuleKey = Exclude<keyof Rules, "HALL_BUFFER_MINUTES">;

// enforced = ระบบนำไปใช้จริงแล้ว, false = บันทึกเป็นระเบียบของวัด (ยังไม่มีการตรวจอัตโนมัติ)
const RULE_DEFS: {
  key: BoolRuleKey;
  title: string;
  desc: string;
  effect: string;
  enforced: boolean;
}[] = [
  {
    key: "NO_CREMATION_ON_BUDDHIST_DAY",
    title: "งดฌาปนกิจในวันพระใหญ่ (No Cremation)",
    desc: "ตัวสร้างกำหนดการจะเตือนเมื่อวันฌาปนกิจตรงกับวันพระ",
    effect: "ใช้งานจริง: เตือนในกำหนดการ",
    enforced: true,
  },
  {
    key: "CHANT_CURFEW_2030",
    title: "จำกัดรอบสวดพระอภิธรรมไม่เกิน 20:30 น.",
    desc: "เพื่อความสงบเรียบร้อยของเขตพุทธาวาสและกุฏิสงฆ์",
    effect: "บันทึกเป็นระเบียบวัด",
    enforced: false,
  },
  {
    key: "MIN_MONKS_4",
    title: "บังคับพระสงฆ์ประจำพิธีขั้นต่ำ 4 รูป",
    desc: "เป็นไปตามแบบแผนประเพณีพระธรรมทัณฑิกา",
    effect: "บันทึกเป็นระเบียบวัด",
    enforced: false,
  },
  {
    key: "NO_FIREWORKS",
    title: "ห้ามจุดประทัดหรือดอกไม้ไฟในลานวัดเด็ดขาด",
    desc: "ป้องกันเหตุอัคคีภัยและความปลอดภัยของชุมชนโดยรอบ",
    effect: "บันทึกเป็นระเบียบวัด",
    enforced: false,
  },
  {
    key: "ADVANCE_BOOKING_LIMIT_60",
    title: "เปิดรับจองล่วงหน้าไม่เกิน 60 วัน",
    desc: "ป้องกันการจองค้างและให้สิทธิ์ผู้มีความจำเป็นเร่งด่วน",
    effect: "ใช้งานจริง: ระบบจองปฏิเสธวันที่เกิน 60 วัน",
    enforced: true,
  },
];

const HALL_EMPTY = {
  name: "",
  kind: "HALL",
  capacity: "",
  pricePerNight: "",
  code: "",
  description: "",
  equipment: "",
  feeNote: "",
};
const PKG_EMPTY = {
  name: "",
  level: "Standard",
  basePrice: "",
  snackPerHead: "",
  desc: "",
  features: "",
  recommended: false,
  sortOrder: "0",
};
const ADDON_EMPTY = {
  name: "",
  price: "",
  categoryKey: "",
  categoryName: "",
  packageIds: [] as string[],
  isDefault: false,
  sortOrder: "0",
};
const PERSON_EMPTY = { type: "MONK" as PersonType, name: "", title: "" };

const SUB_TABS = [
  "ศาลาและกฎของวัด",
  "รายชื่อพระและมัคนายก",
  "แพ็กเกจและราคาฐาน",
  "ตัวเลือกย่อย",
];

const Badge: React.FC<{ on: boolean }> = ({ on }) => (
  <span className={`adm-badge ${on ? "open" : "suspended"}`}>
    {on ? "เปิดใช้งาน" : "ระงับ"}
  </span>
);

export const AdminMaster: React.FC<{
  adminName: string;
  flash: Flash;
  onOpenAudit: () => void;
}> = ({ adminName, flash, onOpenAudit }) => {
  const [temples, setTemples] = useState<AdminTemple[]>([]);
  const [templeId, setTempleId] = useState("");
  const [subTab, setSubTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastEdit, setLastEdit] = useState<AuditRow | null>(null);
  const [templeForm, setTempleForm] = useState<{
    id?: string;
    name: string;
    province: string;
    address: string;
    bankName: string;
    bankAccount: string;
  } | null>(null);
  const [rulesTick, setRulesTick] = useState(0);

  const loadTemples = useCallback(async () => {
    try {
      const list = await adminFetch<AdminTemple[]>("/temples");
      setTemples(list);
      setTempleId((cur) =>
        list.some((t) => t._id === cur) ? cur : list[0]?._id || "",
      );
      setError("");
      const a = await adminFetch<AuditRow[]>("/audit?limit=1");
      setLastEdit(a[0] || null);
    } catch (err) {
      setError(errMsg(err, "โหลดข้อมูลวัดไม่สำเร็จ"));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadTemples();
  }, [loadTemples]);

  const temple = temples.find((t) => t._id === templeId);
  const afterChange = () => loadTemples();

  const saveTemple = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templeForm) return;
    try {
      const { id, ...body } = templeForm;
      const saved = id
        ? await adminFetch<AdminTemple>(`/temples/${id}`, {
            method: "PATCH",
            body,
          })
        : await adminFetch<AdminTemple>("/temples", { method: "POST", body });
      setTempleForm(null);
      if (!id) setTempleId(saved._id);
      flash(id ? "แก้ไขข้อมูลวัดแล้ว" : `เพิ่มวัด ${saved.name} แล้ว`);
      await loadTemples();
    } catch (err) {
      flash(errMsg(err), true);
    }
  };

  if (loading)
    return <div className="adm-placeholder">กำลังโหลดข้อมูลกลาง...</div>;
  if (error) return <div className="adm-placeholder">{error}</div>;

  const halls = temple?.halls || [];
  const openHalls = halls.filter((h) => h.isActive !== false);
  const avgFee = openHalls.length
    ? Math.round(
        openHalls.reduce((s, h) => s + h.pricePerNight, 0) / openHalls.length,
      )
    : 0;

  return (
    <>
      <div className="adm-eyebrow">
        <i className="adm-sq" />
        เลือกวัดที่ต้องการจัดการ
      </div>
      <div className="adm-temple-bar">
        <select
          value={templeId}
          onChange={(e) => setTempleId(e.target.value)}
          aria-label="เลือกวัด"
        >
          {temples.map((t) => (
            <option key={t._id} value={t._id}>
              {t.name}
              {t.isActive === false ? " (ปิด)" : ""}
            </option>
          ))}
        </select>
        {temple && (
          <button
            className="adm-ghost"
            onClick={() =>
              setTempleForm({
                id: temple._id,
                name: temple.name,
                province: temple.province || "",
                address: temple.address || "",
                bankName: temple.bankName || "",
                bankAccount: temple.bankAccount || "",
              })
            }
          >
            แก้ไขข้อมูลวัด
          </button>
        )}
        <button
          className="adm-ghost"
          onClick={() =>
            setTempleForm({
              name: "",
              province: "",
              address: "",
              bankName: "",
              bankAccount: "",
            })
          }
        >
          + เพิ่มวัด
        </button>
      </div>

      <section className="adm-hero">
        <div className="adm-hero-text">
          <h1>จัดการข้อมูลกลางและกำหนดค่าวัด </h1>
          <p>
            ควบคุมฐานข้อมูลสถานที่ อัตราค่าบำรุงศาลา แพ็กเกจ รายชื่อพระ
            และกฎเกณฑ์ของวัด ข้อมูลที่แก้ไขมีผลต่อหน้าจองของเจ้าภาพทันที
          </p>
        </div>
        <div className="adm-stats">
          <div className="adm-stat">
            <small>ศาลาและเมรุ</small>
            <b>
              {halls.length} <em>หลัง (เปิดใช้ {openHalls.length})</em>
            </b>
          </div>
          <div className="adm-stat">
            <small>ค่าบำรุงเฉลี่ย</small>
            <b>
              {baht(avgFee)} <em>/ คืน</em>
            </b>
          </div>
          <div className="adm-stat">
            <small>กฎเกณฑ์ของวัด</small>
            <b>
              <i className="adm-sq" />
              {RULE_DEFS.length} <em>ข้อปฏิบัติ</em>
            </b>
          </div>
          <div className="adm-stat adm-stat-grey">
            <small>แก้ไขล่าสุด</small>
            <span>
              {lastEdit
                ? `${fmtDateTime(lastEdit.createdAt)} · ${lastEdit.actorName || adminName}`
                : "ยังไม่มีการแก้ไข"}
            </span>
          </div>
        </div>
      </section>

      <div className="adm-subtabs">
        {SUB_TABS.map((s, i) => (
          <button
            key={s}
            className={subTab === i ? "active" : ""}
            onClick={() => setSubTab(i)}
          >
            <span className="num">{String(i + 1).padStart(2, "0")}</span> {s}
          </button>
        ))}
      </div>

      {subTab === 0 && temple && (
        <div className="adm-grid">
          <HallsPanel temple={temple} flash={flash} onChanged={afterChange} />
          <RulesPanel
            temple={temple}
            flash={flash}
            tick={rulesTick}
            onSaved={() => {
              setRulesTick((n) => n + 1);
              loadTemples();
            }}
          />
        </div>
      )}
      {subTab === 0 && !temple && (
        <div className="adm-placeholder">
          ยังไม่มีวัดในระบบ กด "+ เพิ่มวัด" เพื่อเริ่มต้น
        </div>
      )}
      {subTab === 1 && temple && (
        <PersonsPanel temple={temple} flash={flash} onChanged={afterChange} />
      )}
      {subTab === 2 && <PackagesPanel flash={flash} onChanged={afterChange} />}
      {subTab === 3 && <AddonsPanel flash={flash} onChanged={afterChange} />}

      <section className="adm-compliance">
        <span className="shield">
          <IconShield />
        </span>
        <div>
          <b>มาตรฐานการกำกับดูแลข้อมูลกลาง FOMS (AUDIT COMPLIANCE)</b>
          <p>
            การแก้ไขอัตราค่าบำรุง แพ็กเกจ
            และกฎเกณฑ์ทุกรายการถูกบันทึกในบันทึกการตรวจสอบพร้อมชื่อผู้ดำเนินการและเวลา
            แก้ไขหรือลบย้อนหลังไม่ได้
          </p>
        </div>
        <button className="link" onClick={onOpenAudit}>
          ดูประวัติการแก้ไขระบบ →
        </button>
      </section>

      {templeForm && (
        <Modal
          title={templeForm.id ? "แก้ไขข้อมูลวัด" : "เพิ่มวัดใหม่"}
          onClose={() => setTempleForm(null)}
        >
          <form className="adm-form" onSubmit={saveTemple}>
            <Field label="ชื่อวัด">
              <input
                required
                value={templeForm.name}
                onChange={(e) =>
                  setTempleForm({ ...templeForm, name: e.target.value })
                }
              />
            </Field>
            <div className="adm-form-row">
              <Field label="จังหวัด">
                <input
                  value={templeForm.province}
                  onChange={(e) =>
                    setTempleForm({ ...templeForm, province: e.target.value })
                  }
                />
              </Field>
              <Field label="ที่อยู่">
                <input
                  value={templeForm.address}
                  onChange={(e) =>
                    setTempleForm({ ...templeForm, address: e.target.value })
                  }
                />
              </Field>
            </div>
            <div className="adm-form-row">
              <Field label="ธนาคาร (สำหรับรับโอน)">
                <input
                  value={templeForm.bankName}
                  onChange={(e) =>
                    setTempleForm({ ...templeForm, bankName: e.target.value })
                  }
                />
              </Field>
              <Field label="เลขที่บัญชี">
                <input
                  value={templeForm.bankAccount}
                  onChange={(e) =>
                    setTempleForm({
                      ...templeForm,
                      bankAccount: e.target.value,
                    })
                  }
                />
              </Field>
            </div>
            <div className="adm-form-actions">
              <button type="button" onClick={() => setTempleForm(null)}>
                ยกเลิก
              </button>
              <button type="submit" className="adm-btn-black sm">
                บันทึก
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};

// ------------------------------------------------------------------ ศาลา
const HallsPanel: React.FC<{
  temple: AdminTemple;
  flash: Flash;
  onChanged: () => void;
}> = ({ temple, flash, onChanged }) => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "open" | "suspended">("all");
  const [form, setForm] = useState<
    (typeof HALL_EMPTY & { id?: string }) | null
  >(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return temple.halls.filter(
      (h) =>
        (status === "all" || (status === "open") === (h.isActive !== false)) &&
        (!q ||
          (h.code || "").toLowerCase().includes(q) ||
          h.name.toLowerCase().includes(q)),
    );
  }, [temple, search, status]);

  const openEdit = (h: AdminHall) =>
    setForm({
      id: h._id,
      name: h.name,
      kind: h.kind || "HALL",
      capacity: String(h.capacity),
      pricePerNight: String(h.pricePerNight),
      code: h.code || "",
      description: h.description || "",
      equipment: h.equipment || "",
      feeNote: h.feeNote || "",
    });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || saving) return;
    setSaving(true);
    const { id, ...f } = form;
    const body = {
      ...f,
      capacity: Number(f.capacity),
      pricePerNight: Number(f.pricePerNight),
      code: f.code || undefined,
    };
    try {
      await adminFetch(
        id
          ? `/temples/${temple._id}/halls/${id}`
          : `/temples/${temple._id}/halls`,
        { method: id ? "PATCH" : "POST", body },
      );
      setForm(null);
      flash(id ? "แก้ไขข้อมูลศาลาแล้ว" : "เพิ่มศาลาแล้ว");
      onChanged();
    } catch (err) {
      flash(errMsg(err), true);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (h: AdminHall) => {
    const next = h.isActive === false;
    const path = `/temples/${temple._id}/halls/${h._id}`;
    try {
      try {
        await adminFetch(path, { method: "PATCH", body: { isActive: next } });
      } catch (err) {
        // ศาลาที่ยังมีงานค้าง: ถามยืนยันก่อนระงับ
        if (err instanceof ApiError && err.code === "HALL_HAS_BOOKINGS") {
          if (
            !window.confirm(
              `${err.message}\nการระงับจะไม่ยกเลิกงานเดิม แต่เจ้าภาพรายใหม่จะจองศาลานี้ไม่ได้ ยืนยันระงับหรือไม่?`,
            )
          )
            return;
          await adminFetch(path, {
            method: "PATCH",
            body: { isActive: false, force: true },
          });
        } else throw err;
      }
      flash(next ? `เปิดใช้งาน ${h.name} แล้ว` : `ระงับ ${h.name} แล้ว`);
      onChanged();
    } catch (err) {
      flash(errMsg(err), true);
    }
  };

  return (
    <section className="adm-halls">
      <div className="adm-halls-head">
        <div>
          <h2>รายชื่อศาลาและสถานที่ประกอบพิธี ({temple.halls.length} แห่ง)</h2>
          <p>ข้อมูลจำเพาะเชิงกายภาพและอัตราค่าบำรุงศาสนสมบัติต่อรอบวัน</p>
        </div>
        <button
          className="adm-btn-black"
          onClick={() => setForm({ ...HALL_EMPTY })}
        >
          + เพิ่มข้อมูลศาลา (Add New Hall)
        </button>
      </div>

      <div className="adm-toolbar">
        <label className="adm-search">
          <span className="ic">
            <IconSearch />
          </span>
          <input
            placeholder="ค้นหาตามรหัส หรือชื่อศาลา..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="adm-filter">
          กรองสถานะ:
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as "all" | "open" | "suspended")
            }
          >
            <option value="all">ทั้งหมด ({temple.halls.length} แห่ง)</option>
            <option value="open">เปิดใช้งาน</option>
            <option value="suspended">ระงับ</option>
          </select>
        </label>
        <button
          className="adm-refresh"
          onClick={() => {
            setSearch("");
            setStatus("all");
          }}
          title="รีเซ็ต"
          aria-label="รีเซ็ต"
        >
          <IconRefresh />
        </button>
      </div>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>รหัส</th>
              <th>ชื่อศาลา / สถานที่</th>
              <th className="r">ความจุ</th>
              <th className="r">ค่าบำรุง / คืน</th>
              <th>
                อุปกรณ์
                <br />
                ประจำศาลา
              </th>
              <th className="c">สถานะ:</th>
              <th className="r">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((h) => (
              <tr key={h._id} className={h.isActive === false ? "off" : ""}>
                <td className="code">{h.code || "—"}</td>
                <td>
                  <b>{h.name}</b>
                  {h.kind === "CREMATORIUM" && (
                    <span className="adm-tag">CREMATORIUM</span>
                  )}
                  <div className="desc">{h.description}</div>
                </td>
                <td className="r">{h.capacity} ท่าน</td>
                <td className="r">
                  <b>{baht(h.pricePerNight)}</b>
                  {h.feeNote && <div className="note">{h.feeNote}</div>}
                </td>
                <td className="equip">
                  <span className="eq-icon">
                    {h.kind === "CREMATORIUM" ? <IconFlame /> : <IconSnow />}
                  </span>
                  <span>{h.equipment || "—"}</span>
                </td>
                <td className="c">
                  <Badge on={h.isActive !== false} />
                </td>
                <td className="r actions">
                  <button className="edit" onClick={() => openEdit(h)}>
                    แก้ไข
                  </button>
                  <button onClick={() => toggle(h)}>
                    {h.isActive === false ? "เปิด" : "ระงับ"}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">
                  ไม่พบข้อมูล
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="adm-table-foot">
          <span>
            <i className="adm-sq dark" />
            แสดง {filtered.length} รายการจากทั้งหมด {temple.halls.length} รายการ
          </span>
          <span>เชื่อมโยงกับระบบจองและปฏิทินตรวจเช็คความว่างทันที</span>
        </div>
      </div>

      <div className="adm-note">
        <span className="adm-info">
          <IconInfo />
        </span>
        <p>
          <b>หมายเหตุกำหนดอัตราค่าบำรุง:</b>{" "}
          อัตราค่าบำรุงศาลาจะถูกนำไปคำนวณอัตโนมัติตามจำนวนคืนที่เจ้าภาพเลือกในใบคำขอจอง
          การแก้ราคามีผลกับงานจองใหม่เท่านั้น งานที่จองไปแล้วคงราคาเดิม
        </p>
      </div>

      {form && (
        <Modal
          title={form.id ? "แก้ไขข้อมูลศาลา" : "เพิ่มศาลาใหม่"}
          onClose={() => setForm(null)}
        >
          <form className="adm-form" onSubmit={save}>
            <div className="adm-form-row">
              <Field label="ชื่อศาลา / สถานที่">
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="ประเภท">
                <select
                  value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value })}
                >
                  <option value="HALL">ศาลาบำเพ็ญกุศล</option>
                  <option value="CREMATORIUM">เมรุ</option>
                </select>
              </Field>
            </div>
            <div className="adm-form-row">
              <Field label="ความจุ (ท่าน)">
                <input
                  required
                  type="number"
                  min={1}
                  step={1}
                  value={form.capacity}
                  onChange={(e) =>
                    setForm({ ...form, capacity: e.target.value })
                  }
                />
              </Field>
              <Field label="ค่าบำรุง / คืน (บาท)">
                <input
                  required
                  type="number"
                  min={0}
                  step={1}
                  value={form.pricePerNight}
                  onChange={(e) =>
                    setForm({ ...form, pricePerNight: e.target.value })
                  }
                />
              </Field>
            </div>
            <div className="adm-form-row">
              <Field
                label="รหัส"
                hint="เว้นว่างเพื่อให้ระบบสร้างให้ เช่น HAL-01"
              >
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </Field>
              <Field label="หมายเหตุค่าบำรุง">
                <input
                  value={form.feeNote}
                  onChange={(e) =>
                    setForm({ ...form, feeNote: e.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="คำอธิบาย">
              <input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Field>
            <Field label="อุปกรณ์ประจำศาลา">
              <input
                value={form.equipment}
                onChange={(e) =>
                  setForm({ ...form, equipment: e.target.value })
                }
              />
            </Field>
            <div className="adm-form-actions">
              <button type="button" onClick={() => setForm(null)}>
                ยกเลิก
              </button>
              <button
                type="submit"
                className="adm-btn-black sm"
                disabled={saving}
              >
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
};

// ------------------------------------------------------------------ กฎวัด
const RulesPanel: React.FC<{
  temple: AdminTemple;
  flash: Flash;
  tick: number;
  onSaved: () => void;
}> = ({ temple, flash, onSaved }) => {
  const [saved, setSaved] = useState<Rules | null>(null);
  const [draft, setDraft] = useState<Rules | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSaved(null);
    adminFetch<Rules>(`/rules?templeId=${temple._id}`)
      .then((r) => {
        if (cancelled) return;
        setSaved(r);
        setDraft(r);
      })
      .catch((err) => !cancelled && flash(errMsg(err), true));
    return () => {
      cancelled = true;
    };
  }, [temple._id, flash]);

  if (!draft || !saved)
    return (
      <aside className="adm-rules">
        <p className="muted">กำลังโหลดกฎเกณฑ์...</p>
      </aside>
    );
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const save = async () => {
    setSaving(true);
    try {
      const next = await adminFetch<Rules>("/rules", {
        method: "PUT",
        body: { templeId: temple._id, rules: draft },
      });
      setSaved(next);
      setDraft(next);
      flash("บันทึกการตั้งค่ากฎเกณฑ์แล้ว มีผลกับคำขอจองใหม่ทันที");
      onSaved();
    } catch (err) {
      flash(errMsg(err), true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="adm-rules">
      <small className="eyebrow">ระเบียบสงฆ์ &amp; ข้อห้าม</small>
      <h3>กฎและเงื่อนไขการใช้งาน (Ceremonial Rules)</h3>
      <p className="lead">
        การตั้งค่านี้เป็นของ {temple.name}{" "}
        แต่ละข้อระบุว่าระบบนำไปใช้จริงหรือบันทึกเป็นระเบียบ
      </p>
      <hr />
      {RULE_DEFS.map((r) => (
        <label key={r.key} className="adm-rule">
          <input
            type="checkbox"
            checked={draft[r.key]}
            onChange={(e) => setDraft({ ...draft, [r.key]: e.target.checked })}
          />
          <span>
            <b>{r.title}</b>
            <em>{r.desc}</em>
            <em className={r.enforced ? "enforced" : ""}>{r.effect}</em>
          </span>
        </label>
      ))}
      <label className="adm-rule disabled">
        <input type="checkbox" disabled />
        <span>
          <b>อนุญาตนำเครื่องดื่มแอลกอฮอล์เข้ามาในศาลา</b>
          <em className="red">ผิดมติมหาเถรสมาคม (ระบบปิดการใช้งานถาวร)</em>
        </span>
      </label>
      <hr />
      <label className="adm-buffer">
        <b>ระยะเวลาจัดเตรียมศาลาระหว่างรอบ (Buffer Time)</b>
        <select
          value={draft.HALL_BUFFER_MINUTES}
          onChange={(e) =>
            setDraft({ ...draft, HALL_BUFFER_MINUTES: Number(e.target.value) })
          }
        >
          <option value={60}>1 ชั่วโมง</option>
          <option value={90}>1 ชั่วโมง 30 นาที</option>
          <option value={120}>2 ชั่วโมง</option>
        </select>
        <small>
          บันทึกเป็นระเบียบวัด สำหรับเจ้าหน้าที่ใช้วางแผนจัดเตรียมศาลา
        </small>
      </label>
      <div className="adm-save">
        <button onClick={save} disabled={!dirty || saving}>
          <IconSliders />{" "}
          {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่ากฎเกณฑ์ (Save Config)"}
        </button>
        <small>
          {dirty
            ? "มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก"
            : "ข้อมูลตรงกับที่บันทึกไว้"}
        </small>
      </div>
    </aside>
  );
};

// ------------------------------------------------------------------ พระ / มัคนายก / พิธีกร
const PersonsPanel: React.FC<{
  temple: AdminTemple;
  flash: Flash;
  onChanged: () => void;
}> = ({ temple, flash }) => {
  const [rows, setRows] = useState<AdminPerson[]>([]);
  const [type, setType] = useState<"ALL" | PersonType>("ALL");
  const [form, setForm] = useState<
    (typeof PERSON_EMPTY & { id?: string }) | null
  >(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setRows(
        await adminFetch<AdminPerson[]>(`/persons?templeId=${temple._id}`),
      );
    } catch (err) {
      flash(errMsg(err), true);
    } finally {
      setLoading(false);
    }
  }, [temple._id, flash]);
  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const visible = rows.filter((p) => type === "ALL" || p.type === type);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    try {
      if (form.id)
        await adminFetch(`/persons/${form.id}`, {
          method: "PATCH",
          body: { name: form.name, title: form.title },
        });
      else
        await adminFetch("/persons", {
          method: "POST",
          body: {
            templeId: temple._id,
            type: form.type,
            name: form.name,
            title: form.title,
          },
        });
      setForm(null);
      flash(form.id ? "แก้ไขรายชื่อแล้ว" : "เพิ่มรายชื่อแล้ว");
      load();
    } catch (err) {
      flash(errMsg(err), true);
    }
  };
  const toggle = async (p: AdminPerson) => {
    try {
      await adminFetch(`/persons/${p._id}`, {
        method: "PATCH",
        body: { isActive: !p.isActive },
      });
      flash(p.isActive ? `ระงับ ${p.name} แล้ว` : `เปิดใช้งาน ${p.name} แล้ว`);
      load();
    } catch (err) {
      flash(errMsg(err), true);
    }
  };

  return (
    <section className="adm-halls adm-wide">
      <div className="adm-halls-head">
        <div>
          <h2>พระสงฆ์ มัคนายก และพิธีกร ({rows.length} ท่าน)</h2>
          <p>
            รายชื่อบุคลากรประจำ {temple.name} สำหรับจัดเข้ากำหนดการพิธีรายคืน
          </p>
        </div>
        <button
          className="adm-btn-black"
          onClick={() => setForm({ ...PERSON_EMPTY })}
        >
          + เพิ่มรายชื่อ
        </button>
      </div>
      <div className="adm-chips">
        {(["ALL", "MONK", "DEACON", "MC"] as const).map((t) => (
          <button
            key={t}
            className={type === t ? "active" : ""}
            onClick={() => setType(t)}
          >
            {t === "ALL" ? "ทั้งหมด" : PERSON_LABEL[t]} (
            {t === "ALL"
              ? rows.length
              : rows.filter((p) => p.type === t).length}
            )
          </button>
        ))}
      </div>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>ชื่อ</th>
              <th>สมณศักดิ์ / ตำแหน่ง</th>
              <th>ประเภท</th>
              <th className="c">สถานะ:</th>
              <th className="r">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <tr key={p._id} className={p.isActive ? "" : "off"}>
                <td>
                  <b>{p.name}</b>
                </td>
                <td>{p.title || "—"}</td>
                <td>{PERSON_LABEL[p.type]}</td>
                <td className="c">
                  <Badge on={p.isActive} />
                </td>
                <td className="r actions">
                  <button
                    className="edit"
                    onClick={() =>
                      setForm({
                        id: p._id,
                        type: p.type,
                        name: p.name,
                        title: p.title || "",
                      })
                    }
                  >
                    แก้ไข
                  </button>
                  <button onClick={() => toggle(p)}>
                    {p.isActive ? "ระงับ" : "เปิด"}
                  </button>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  {loading ? "กำลังโหลด..." : "ยังไม่มีรายชื่อ"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {form && (
        <Modal
          title={form.id ? "แก้ไขรายชื่อ" : "เพิ่มรายชื่อ"}
          onClose={() => setForm(null)}
        >
          <form className="adm-form" onSubmit={save}>
            <Field label="ประเภท">
              <select
                disabled={!!form.id}
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as PersonType })
                }
              >
                {(Object.keys(PERSON_LABEL) as PersonType[]).map((t) => (
                  <option key={t} value={t}>
                    {PERSON_LABEL[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="ชื่อ">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="สมณศักดิ์ / ตำแหน่ง (ไม่บังคับ)">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <div className="adm-form-actions">
              <button type="button" onClick={() => setForm(null)}>
                ยกเลิก
              </button>
              <button type="submit" className="adm-btn-black sm">
                บันทึก
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
};

// ------------------------------------------------------------------ แพ็กเกจ
const PackagesPanel: React.FC<{ flash: Flash; onChanged: () => void }> = ({
  flash,
  onChanged,
}) => {
  const [rows, setRows] = useState<AdminPackage[]>([]);
  const [form, setForm] = useState<(typeof PKG_EMPTY & { id?: string }) | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setRows(await adminFetch<AdminPackage[]>("/packages"));
    } catch (err) {
      flash(errMsg(err), true);
    } finally {
      setLoading(false);
    }
  }, [flash]);
  useEffect(() => {
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const { id, ...f } = form;
    const body = {
      ...f,
      basePrice: Number(f.basePrice),
      snackPerHead: Number(f.snackPerHead),
      sortOrder: Number(f.sortOrder) || 0,
    };
    try {
      await adminFetch(id ? `/packages/${id}` : "/packages", {
        method: id ? "PATCH" : "POST",
        body,
      });
      setForm(null);
      flash(id ? "แก้ไขแพ็กเกจแล้ว" : "เพิ่มแพ็กเกจแล้ว");
      load();
      onChanged();
    } catch (err) {
      flash(errMsg(err), true);
    }
  };
  const toggle = async (p: AdminPackage) => {
    try {
      await adminFetch(`/packages/${p._id}`, {
        method: "PATCH",
        body: { isActive: p.isActive === false },
      });
      flash(
        p.isActive === false
          ? `เปิดใช้งาน ${p.name} แล้ว`
          : `ระงับ ${p.name} แล้ว (เจ้าภาพจะไม่เห็นแพ็กเกจนี้)`,
      );
      load();
      onChanged();
    } catch (err) {
      flash(errMsg(err), true);
    }
  };

  return (
    <section className="adm-halls adm-wide">
      <div className="adm-halls-head">
        <div>
          <h2>แพ็กเกจและราคาฐาน ({rows.length} แพ็กเกจ)</h2>
          <p>ใช้ร่วมกันทุกวัด ราคาที่แก้มีผลกับงานจองใหม่เท่านั้น</p>
        </div>
        <button
          className="adm-btn-black"
          onClick={() => setForm({ ...PKG_EMPTY })}
        >
          + เพิ่มแพ็กเกจ
        </button>
      </div>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>ระดับ</th>
              <th>ชื่อ / รายละเอียด</th>
              <th className="r">ราคาฐาน</th>
              <th className="r">ค่าบริการ / หัว / คืน</th>
              <th className="c">สถานะ:</th>
              <th className="r">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p._id} className={p.isActive === false ? "off" : ""}>
                <td className="code">{p.level}</td>
                <td>
                  <b>{p.name}</b>
                  {p.recommended && <span className="adm-tag">แนะนำ</span>}
                  <div className="desc">{p.desc}</div>
                  {p.features && p.features.length > 0 && (
                    <div className="note">{p.features.join(" · ")}</div>
                  )}
                </td>
                <td className="r">
                  <b>{baht(p.basePrice)}</b>
                </td>
                <td className="r">{baht(p.snackPerHead)}</td>
                <td className="c">
                  <Badge on={p.isActive !== false} />
                </td>
                <td className="r actions">
                  <button
                    className="edit"
                    onClick={() =>
                      setForm({
                        id: p._id,
                        name: p.name,
                        level: p.level,
                        basePrice: String(p.basePrice),
                        snackPerHead: String(p.snackPerHead),
                        desc: p.desc,
                        features: (p.features || []).join("\n"),
                        recommended: !!p.recommended,
                        sortOrder: String(p.sortOrder ?? 0),
                      })
                    }
                  >
                    แก้ไข
                  </button>
                  <button onClick={() => toggle(p)}>
                    {p.isActive === false ? "เปิด" : "ระงับ"}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  {loading ? "กำลังโหลด..." : "ยังไม่มีแพ็กเกจ"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {form && (
        <Modal
          title={form.id ? "แก้ไขแพ็กเกจ" : "เพิ่มแพ็กเกจ"}
          onClose={() => setForm(null)}
        >
          <form className="adm-form" onSubmit={save}>
            <div className="adm-form-row">
              <Field label="ชื่อแพ็กเกจ">
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="ระดับ">
                <select
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value })}
                >
                  <option>Economy</option>
                  <option>Standard</option>
                  <option>Premium</option>
                </select>
              </Field>
            </div>
            <div className="adm-form-row">
              <Field label="ราคาฐาน (บาท)">
                <input
                  required
                  type="number"
                  min={0}
                  value={form.basePrice}
                  onChange={(e) =>
                    setForm({ ...form, basePrice: e.target.value })
                  }
                />
              </Field>
              <Field label="ค่าบริการต่อหัวต่อคืน (บาท)">
                <input
                  required
                  type="number"
                  min={0}
                  value={form.snackPerHead}
                  onChange={(e) =>
                    setForm({ ...form, snackPerHead: e.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="คำอธิบาย">
              <input
                required
                value={form.desc}
                onChange={(e) => setForm({ ...form, desc: e.target.value })}
              />
            </Field>
            <Field label="จุดเด่น (บรรทัดละข้อ)">
              <textarea
                rows={3}
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
              />
            </Field>
            <div className="adm-form-row">
              <Field label="ลำดับแสดงผล">
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({ ...form, sortOrder: e.target.value })
                  }
                />
              </Field>
              <label className="adm-check">
                <input
                  type="checkbox"
                  checked={form.recommended}
                  onChange={(e) =>
                    setForm({ ...form, recommended: e.target.checked })
                  }
                />{" "}
                แสดงเป็นแพ็กเกจแนะนำ
              </label>
            </div>
            <div className="adm-form-actions">
              <button type="button" onClick={() => setForm(null)}>
                ยกเลิก
              </button>
              <button type="submit" className="adm-btn-black sm">
                บันทึก
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
};

// ------------------------------------------------------------------ ตัวเลือกเสริม
const AddonsPanel: React.FC<{ flash: Flash; onChanged: () => void }> = ({
  flash,
  onChanged,
}) => {
  const [rows, setRows] = useState<AdminAddon[]>([]);
  const [packages, setPackages] = useState<AdminPackage[]>([]);
  const [form, setForm] = useState<
    (typeof ADDON_EMPTY & { id?: string }) | null
  >(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [a, p] = await Promise.all([
        adminFetch<AdminAddon[]>("/addons"),
        adminFetch<AdminPackage[]>("/packages"),
      ]);
      setRows(a);
      setPackages(p);
    } catch (err) {
      flash(errMsg(err), true);
    } finally {
      setLoading(false);
    }
  }, [flash]);
  useEffect(() => {
    load();
  }, [load]);

  const pkgName = (id: string) =>
    packages.find((p) => p._id === id)?.name || "—";

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const { id, ...f } = form;
    const body = {
      ...f,
      price: Number(f.price),
      sortOrder: Number(f.sortOrder) || 0,
    };
    try {
      await adminFetch(id ? `/addons/${id}` : "/addons", {
        method: id ? "PATCH" : "POST",
        body,
      });
      setForm(null);
      flash(id ? "แก้ไขตัวเลือกแล้ว" : "เพิ่มตัวเลือกแล้ว");
      load();
      onChanged();
    } catch (err) {
      flash(errMsg(err), true);
    }
  };
  const toggle = async (a: AdminAddon) => {
    try {
      await adminFetch(`/addons/${a._id}`, {
        method: "PATCH",
        body: { isActive: a.isActive === false },
      });
      flash(
        a.isActive === false
          ? `เปิดใช้งาน ${a.name} แล้ว`
          : `ระงับ ${a.name} แล้ว`,
      );
      load();
      onChanged();
    } catch (err) {
      flash(errMsg(err), true);
    }
  };

  return (
    <section className="adm-halls adm-wide">
      <div className="adm-halls-head">
        <div>
          <h2>ตัวเลือกย่อยและบริการเสริม ({rows.length} รายการ)</h2>
          <p>
            ราคาเป็นส่วนต่าง (0 = รวมอยู่ในแพ็กเกจ) ตัวเลือกที่มีหมวดเดียวกัน
            เจ้าภาพเลือกได้ 1 ตัว
          </p>
        </div>
        <button
          className="adm-btn-black"
          onClick={() => setForm({ ...ADDON_EMPTY })}
        >
          + เพิ่มตัวเลือก
        </button>
      </div>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>หมวด</th>
              <th>ชื่อตัวเลือก</th>
              <th className="r">ราคา / ส่วนต่าง</th>
              <th>ใช้กับแพ็กเกจ</th>
              <th className="c">สถานะ:</th>
              <th className="r">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a._id} className={a.isActive === false ? "off" : ""}>
                <td>
                  {a.categoryName ? (
                    <>
                      <b>{a.categoryName}</b>
                      <div className="note">{a.categoryKey}</div>
                    </>
                  ) : (
                    <span className="muted">บริการเสริมทั่วไป</span>
                  )}
                </td>
                <td>
                  <b>{a.name}</b>
                  {a.isDefault && <span className="adm-tag">ค่าเริ่มต้น</span>}
                </td>
                <td className="r">
                  <b>{a.price === 0 ? "รวมในแพ็กเกจ" : `+${baht(a.price)}`}</b>
                </td>
                <td>
                  {a.packageIds && a.packageIds.length
                    ? a.packageIds.map(pkgName).join(", ")
                    : "ทุกแพ็กเกจ"}
                </td>
                <td className="c">
                  <Badge on={a.isActive !== false} />
                </td>
                <td className="r actions">
                  <button
                    className="edit"
                    onClick={() =>
                      setForm({
                        id: a._id,
                        name: a.name,
                        price: String(a.price),
                        categoryKey: a.categoryKey || "",
                        categoryName: a.categoryName || "",
                        packageIds: a.packageIds || [],
                        isDefault: !!a.isDefault,
                        sortOrder: String(a.sortOrder ?? 0),
                      })
                    }
                  >
                    แก้ไข
                  </button>
                  <button onClick={() => toggle(a)}>
                    {a.isActive === false ? "เปิด" : "ระงับ"}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  {loading ? "กำลังโหลด..." : "ยังไม่มีตัวเลือก"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {form && (
        <Modal
          title={form.id ? "แก้ไขตัวเลือก" : "เพิ่มตัวเลือก"}
          onClose={() => setForm(null)}
        >
          <form className="adm-form" onSubmit={save}>
            <div className="adm-form-row">
              <Field label="ชื่อตัวเลือก">
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="ราคา / ส่วนต่าง (บาท)">
                <input
                  required
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </Field>
            </div>
            <div className="adm-form-row">
              <Field
                label="รหัสหมวด"
                hint="เว้นว่าง = บริการเสริมทั่วไป (เลือกได้หลายอย่าง)"
              >
                <input
                  value={form.categoryKey}
                  onChange={(e) =>
                    setForm({ ...form, categoryKey: e.target.value })
                  }
                />
              </Field>
              <Field label="ชื่อหมวดที่แสดง">
                <input
                  value={form.categoryName}
                  onChange={(e) =>
                    setForm({ ...form, categoryName: e.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="ใช้กับแพ็กเกจ" hint="ไม่เลือกเลย = ใช้ได้ทุกแพ็กเกจ">
              <div className="adm-checks">
                {packages.map((p) => (
                  <label key={p._id}>
                    <input
                      type="checkbox"
                      checked={form.packageIds.includes(p._id)}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          packageIds: e.target.checked
                            ? [...form.packageIds, p._id]
                            : form.packageIds.filter((x) => x !== p._id),
                        })
                      }
                    />{" "}
                    {p.name}
                  </label>
                ))}
              </div>
            </Field>
            <div className="adm-form-row">
              <Field label="ลำดับแสดงผล">
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({ ...form, sortOrder: e.target.value })
                  }
                />
              </Field>
              <label className="adm-check">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) =>
                    setForm({ ...form, isDefault: e.target.checked })
                  }
                />{" "}
                เป็นค่าเริ่มต้นของหมวด
              </label>
            </div>
            <div className="adm-form-actions">
              <button type="button" onClick={() => setForm(null)}>
                ยกเลิก
              </button>
              <button type="submit" className="adm-btn-black sm">
                บันทึก
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
};
