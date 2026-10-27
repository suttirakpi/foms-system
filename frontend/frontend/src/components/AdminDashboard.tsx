import React, { useMemo, useState } from "react";
import type { AuthUser } from "../App";
import "./AdminDashboard.css";

interface AdminDashboardProps {
  currentUser: AuthUser | null;
  onNavigateHome: () => void;
  onLogout: () => void;
}

type MainTab = "overview" | "master" | "access" | "audit" | "settings";
type HallStatus = "open" | "suspended";

interface Hall {
  code: string;
  name: string;
  tag?: string;
  desc: string;
  capacity: string;
  fee: number;
  feeNote?: string;
  equipment: string;
  status: HallStatus;
}

const INITIAL_HALLS: Hall[] = [
  {
    code: "HAL-01",
    name: "ศาลา 1 (การุณยสถาน)",
    desc: "ศาลาปรับอากาศขนาดกะทัดรัด สำหรับพิธีเรียบง่าย",
    capacity: "80 ท่าน",
    fee: 2500,
    equipment: "เครื่องปรับอากาศ 2 ตัว, ชุดโต๊ะหมู่",
    status: "open",
  },
  {
    code: "HAL-02",
    name: "ศาลา 2 (เมตตาธรรม)",
    desc: "ศาลาปรับอากาศขนาดกลาง พร้อมห้องรับรองพระเถระ",
    capacity: "150 ท่าน",
    fee: 4500,
    equipment: "แอร์ 4 ตัว + จอ LED ถ่ายทอดภาพ",
    status: "open",
  },
  {
    code: "HAL-03",
    name: "ศาลา 3 (สันติสุขาราม)",
    desc: "ศาลาหลังใหญ่สำหรับพิธีพระราชทานเพลิงหรือเจ้าภาพใหญ่",
    capacity: "300 ท่าน",
    fee: 8500,
    equipment: "แอร์ 6 ตัว + ระบบเสียงรอบทิศทาง",
    status: "open",
  },
  {
    code: "MER-01",
    name: "เมรุหลวง (สุคตาลัย)",
    tag: "CREMATORIUM",
    desc: "เตาเผาพลังไร้ควันมาตรฐาน 2 เตา พร้อมลานทอดผ้าบังสุกุล",
    capacity: "400 ท่าน (ลานพิธี)",
    fee: 12000,
    feeNote: "รวมค่าแก๊สและพิธีเผา",
    equipment: "เตาเผาดิจิทัลคู่, ระบบดักฝุ่น PM2.5",
    status: "open",
  },
];

const RULES = [
  {
    id: "no-cremation",
    title: "งดฌาปนกิจในวันพระใหญ่ (No Cremation)",
    desc: "ระบบจะบล็อกวัน ๘ ค่ำ และ ๑๕ ค่ำ ในปฏิทินจองโดยอัตโนมัติ",
  },
  {
    id: "chant-limit",
    title: "จำกัดรอบสวดพระอภิธรรมไม่เกิน 20:30 น.",
    desc: "เพื่อความสงบเรียบร้อยของเขตพุทธาวาสและกุฏิสงฆ์",
  },
  {
    id: "monks-min",
    title: "บังคับพระสงฆ์ประจำพิธีขั้นต่ำ 4 รูป",
    desc: "เป็นไปตามแบบแผนประเพณีพระธรรมทัณฑิกา",
  },
  {
    id: "no-fireworks",
    title: "ห้ามจุดประทัดหรือดอกไม้ไฟในลานวัดเด็ดขาด",
    desc: "ป้องกันเหตุอัคคีภัยและความปลอดภัยของชุมชนโดยรอบ",
  },
  {
    id: "advance-60",
    title: "เปิดรับจองล่วงหน้าไม่เกิน 60 วัน",
    desc: "ป้องกันการจองค้างและให้สิทธิ์ผู้มีความจำเป็นเร่งด่วน",
  },
];

const USERS = [
  { id: "U-001", name: "พระมหาธีรพัฒน์", contact: "admin@watsri.ac.th", role: "Super Admin", active: true, last: "วันนี้ 09:30 น." },
  { id: "U-002", name: "นายจิราพันธ์ เด่นพันธ์", contact: "08x-xxx-2074", role: "Temple Staff", active: true, last: "วันนี้ 08:15 น." },
  { id: "U-003", name: "นายธนุส คำพิทักษ์", contact: "08x-xxx-2325", role: "Operations Team", active: true, last: "เมื่อวาน 17:40 น." },
  { id: "U-004", name: "คุณตูน สุทธิรักษ์", contact: "08x-xxx-2783", role: "Host", active: true, last: "วันนี้ 10:45 น." },
  { id: "U-005", name: "นายธัชพล แก้ววิลัย", contact: "08x-xxx-2341", role: "Temple Staff", active: false, last: "3 วันที่แล้ว" },
];

const ROLES = ["Super Admin", "Temple Staff", "Operations Team", "Host"];

const TABS: { key: MainTab; th: string; en: string }[] = [
  { key: "overview", th: "ภาพรวมระบบ", en: "System Overview" },
  { key: "master", th: "จัดการข้อมูลกลาง", en: "Master Data" },
  { key: "access", th: "บัญชีผู้ใช้และสิทธิ์", en: "Access Control" },
  { key: "audit", th: "บันทึกการตรวจสอบ", en: "Audit Trail / Logs" },
  { key: "settings", th: "การตั้งค่าระบบ", en: "Settings" },
];

const SUB_TABS = [
  "ศาลาและกฎของวัด (Temple Halls & Rules)",
  "รายชื่อพระและมัคนายก (Monks & Master of Ceremonies)",
  "แพ็กเกจและราคาฐาน (Packages & Base Rates)",
  "ตัวเลือกย่อย",
];

const Svg: React.FC<{ size?: number; children: React.ReactNode }> = ({ size = 16, children }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ display: "block", flexShrink: 0 }}
  >
    {children}
  </svg>
);

const IconSnow = () => (
  <Svg><line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" /><path d="m20 16-4-4 4-4" /><path d="m4 8 4 4-4 4" /><path d="m16 4-4 4-4-4" /><path d="m8 20 4-4 4 4" /></Svg>
);
const IconMonitor = () => (
  <Svg><rect width="20" height="14" x="2" y="3" rx="2" /><line x1="8" x2="16" y1="21" y2="21" /><line x1="12" x2="12" y1="17" y2="21" /></Svg>
);
const IconSpeaker = () => (
  <Svg><rect width="16" height="20" x="4" y="2" rx="2" /><circle cx="12" cy="14" r="4" /><line x1="12" x2="12.01" y1="6" y2="6" /></Svg>
);
const IconFlame = () => (
  <Svg><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></Svg>
);
const IconSearch = () => (
  <Svg size={18}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></Svg>
);
const IconRefresh = () => (
  <Svg size={16}><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></Svg>
);
const IconInfo = () => (
  <Svg size={18}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></Svg>
);
const IconShield = () => (
  <Svg size={18}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></Svg>
);
const IconSliders = () => (
  <Svg size={16}><line x1="21" x2="14" y1="4" y2="4" /><line x1="10" x2="3" y1="4" y2="4" /><line x1="21" x2="12" y1="12" y2="12" /><line x1="8" x2="3" y1="12" y2="12" /><line x1="21" x2="16" y1="20" y2="20" /><line x1="12" x2="3" y1="20" y2="20" /><line x1="14" x2="14" y1="2" y2="6" /><line x1="8" x2="8" y1="10" y2="14" /><line x1="16" x2="16" y1="18" y2="22" /></Svg>
);

const EQUIP_ICONS: Record<string, React.ReactNode> = {
  "HAL-01": <IconSnow />,
  "HAL-02": <IconMonitor />,
  "HAL-03": <IconSpeaker />,
  "MER-01": <IconFlame />,
};

const baht = (n: number) => `฿${n.toLocaleString("en-US")}`;

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onNavigateHome,
  onLogout,
}) => {
  const [tab, setTab] = useState<MainTab>("master");
  const [subTab, setSubTab] = useState(0);
  const [halls, setHalls] = useState<Hall[]>(INITIAL_HALLS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | HallStatus>("all");
  const [rules, setRules] = useState<Record<string, boolean>>(
    Object.fromEntries(RULES.map((r) => [r.id, true])),
  );
  const [buffer, setBuffer] = useState("90");

  const adminName = currentUser?.name ?? "ผู้ดูแลระบบ";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return halls.filter(
      (h) =>
        (statusFilter === "all" || h.status === statusFilter) &&
        (!q || h.code.toLowerCase().includes(q) || h.name.toLowerCase().includes(q)),
    );
  }, [halls, search, statusFilter]);

  const openCount = halls.filter((h) => h.status === "open").length;
  const avgFee = Math.round(halls.reduce((s, h) => s + h.fee, 0) / halls.length);

  const toggleStatus = (code: string) =>
    setHalls((prev) =>
      prev.map((h) =>
        h.code === code ? { ...h, status: h.status === "open" ? "suspended" : "open" } : h,
      ),
    );

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  const activeTab = TABS.find((t) => t.key === tab)!;

  return (
    <div className="adm">
      {/* ===== Top bar ===== */}
      <header className="adm-top">
        <nav className="adm-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`adm-tab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              <span>{t.th}</span>
              <span>({t.en})</span>
            </button>
          ))}
        </nav>
        <div className="adm-top-right">
          <div className="adm-portal">
            <span>SYSTEM</span>
            <span><i className="adm-dot" />ADMIN</span>
            <span>PORTAL</span>
          </div>
          <div className="adm-user">
            <strong>{adminName}</strong>
            <span>ผู้ดูแลระบบกลาง (Super Admin)</span>
          </div>
          <button className="adm-logout" onClick={onLogout} title="ออกจากระบบ" aria-label="ออกจากระบบ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </button>
        </div>
      </header>

      <main className="adm-main">
        {/* ===== Breadcrumb ===== */}
        <div className="adm-crumb">
          <button onClick={onNavigateHome}>หน้าหลัก</button>
          <span>/</span>
          <span>ผู้ดูแลระบบกลาง (SYSTEM ADMIN)</span>
          <span>/</span>
          <strong>{activeTab.th} ({activeTab.en.toUpperCase()})</strong>
        </div>

        {tab === "master" && (
          <>
            <div className="adm-eyebrow"><i className="adm-sq" />วัดศรีสุคต พระอารามหลวง · พระนคร</div>

            <section className="adm-hero">
              <div className="adm-hero-text">
                <h1>จัดการข้อมูลกลางและกำหนดค่าวัด (Master Data &amp; System Configuration)</h1>
                <p>
                  ควบคุมฐานข้อมูลสถานที่ อัตราค่าบำรุงศาลา และกฎเกณฑ์พิธีการของวัดศรีสุคต
                  เพื่อให้ระบบการจองและการบริหารงานหน้างานทำงานได้อย่างถูกต้องและสอดคล้องตามพระธรรมวินัย
                </p>
              </div>
              <div className="adm-stats">
                <div className="adm-stat">
                  <small>ศาลาและเมรุ</small>
                  <b>{halls.length} <em>หลัง (เปิดใช้ {openCount})</em></b>
                </div>
                <div className="adm-stat">
                  <small>ค่าบำรุงเฉลี่ย</small>
                  <b>{baht(avgFee)} <em>/ คืน</em></b>
                </div>
                <div className="adm-stat">
                  <small>กฎเกณฑ์บังคับใช้</small>
                  <b><i className="adm-sq" />6 ข้อปฏิบัติ</b>
                </div>
                <div className="adm-stat adm-stat-grey">
                  <small>แก้ไขล่าสุด</small>
                  <span>09:30 น. วันนี้ · {adminName}</span>
                </div>
              </div>
            </section>

            {/* ===== Sub tabs ===== */}
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

            {subTab !== 0 ? (
              <div className="adm-placeholder">ส่วนนี้ยังไม่ได้ทำ ({SUB_TABS[subTab]})</div>
            ) : (
              <div className="adm-grid">
                {/* ===== Halls ===== */}
                <section className="adm-halls">
                  <div className="adm-halls-head">
                    <div>
                      <h2>รายชื่อศาลาและสถานที่ประกอบพิธี ({halls.length} แห่ง)</h2>
                      <p>ข้อมูลจำเพาะเชิงกายภาพและอัตราค่าบำรุงศาสนสมบัติต่อรอบวัน</p>
                    </div>
                    <button className="adm-btn-black" onClick={() => alert("ยังไม่เชื่อมระบบ")}>
                      + เพิ่มข้อมูลศาลา (Add New Hall)
                    </button>
                  </div>

                  <div className="adm-toolbar">
                    <label className="adm-search">
                      <span className="ic"><IconSearch /></span>
                      <input
                        placeholder="ค้นหาตามรหัส หรือชื่อศาลา..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                    <label className="adm-filter">
                      กรองสถานะ:
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as "all" | HallStatus)}
                      >
                        <option value="all">ทั้งหมด ({halls.length} แห่ง)</option>
                        <option value="open">เปิดใช้งาน</option>
                        <option value="suspended">ระงับ</option>
                      </select>
                    </label>
                    <button className="adm-refresh" onClick={resetFilters} title="รีเซ็ต"><IconRefresh /></button>
                  </div>

                  <div className="adm-table-wrap">
                    <table className="adm-table">
                      <thead>
                        <tr>
                          <th>รหัส</th>
                          <th>ชื่อศาลา / สถานที่</th>
                          <th className="r">ความจุ</th>
                          <th className="r">ค่าบำรุง / คืน</th>
                          <th>อุปกรณ์<br />ประจำศาลา</th>
                          <th className="c">สถานะ:</th>
                          <th className="r">การจัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((h) => (
                          <tr key={h.code} className={h.status === "suspended" ? "off" : ""}>
                            <td className="code">{h.code}</td>
                            <td>
                              <b>{h.name}</b>
                              {h.tag && <span className="adm-tag">{h.tag}</span>}
                              <div className="desc">{h.desc}</div>
                            </td>
                            <td className="r">{h.capacity}</td>
                            <td className="r">
                              <b>{baht(h.fee)}</b>
                              {h.feeNote && <div className="note">{h.feeNote}</div>}
                            </td>
                            <td className="equip"><span className="eq-icon">{EQUIP_ICONS[h.code]}</span><span>{h.equipment}</span></td>
                            <td className="c">
                              <span className={`adm-badge ${h.status}`}>
                                {h.status === "open" ? "เปิดใช้งาน" : "ระงับ"}
                              </span>
                            </td>
                            <td className="r actions">
                              <button className="edit" onClick={() => alert(`แก้ไข ${h.code} (ยังไม่เชื่อมระบบ)`)}>แก้ไข</button>
                              <button onClick={() => toggleStatus(h.code)}>
                                {h.status === "open" ? "ระงับ" : "เปิด"}
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filtered.length === 0 && (
                          <tr><td colSpan={7} className="empty">ไม่พบข้อมูล</td></tr>
                        )}
                      </tbody>
                    </table>
                    <div className="adm-table-foot">
                      <span><i className="adm-sq dark" />แสดง {filtered.length} รายการจากทั้งหมด {halls.length} รายการ</span>
                      <span>เชื่อมโยงกับระบบจอง Real-time และปฏิทินตรวจเช็คความว่าง</span>
                    </div>
                  </div>

                  <div className="adm-note">
                    <span className="adm-info"><IconInfo /></span>
                    <p>
                      <b>หมายเหตุกำหนดอัตราค่าบำรุง:</b> อัตราค่าบำรุงศาลา 1–3
                      จะถูกนำไปคิดคำนวณอัตโนมัติตามจำนวนคืนที่เจ้าภาพเลือกในใบคำขอจอง
                      ส่วนอัตราของเมรุหลวง (สุคตาลัย)
                      จะถูกบันทึกเป็นค่าธรรมเนียมฌาปนกิจแบบคงที่รอบเดียวต่อ 1 งานพิธี
                    </p>
                  </div>
                </section>

                {/* ===== Rules ===== */}
                <aside className="adm-rules">
                  <small className="eyebrow">ระเบียบสงฆ์ &amp; ข้อห้าม</small>
                  <h3>กฎและเงื่อนไขการใช้งาน (Ceremonial Rules)</h3>
                  <p className="lead">การตั้งค่านี้จะมีผลต่อปฏิทินการจองของเจ้าภาพและการจัดคิวสงฆ์โดยอัตโนมัติ</p>
                  <hr />
                  {RULES.map((r) => (
                    <label key={r.id} className="adm-rule">
                      <input
                        type="checkbox"
                        checked={rules[r.id]}
                        onChange={(e) => setRules({ ...rules, [r.id]: e.target.checked })}
                      />
                      <span><b>{r.title}</b><em>{r.desc}</em></span>
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
                    <select value={buffer} onChange={(e) => setBuffer(e.target.value)}>
                      <option value="60">1 ชั่วโมง (ก่อนเริ่มพิธี 17:00 น.)</option>
                      <option value="90">1 ชั่วโมง 30 นาที (ก่อนเริ่มพิธี 17:00 น.)</option>
                      <option value="120">2 ชั่วโมง (ก่อนเริ่มพิธี 17:00 น.)</option>
                    </select>
                    <small>ระบบจะกันเวลาว่างระหว่างเจ้าภาพเพื่อความสะอาดและจัดอาสน์สงฆ์</small>
                  </label>
                  <div className="adm-save">
                    <button onClick={() => alert("บันทึกแล้ว (ยังไม่เชื่อมระบบ)")}>
                      <IconSliders /> บันทึกการตั้งค่ากฎเกณฑ์ (Save Config)
                    </button>
                    <small>การเปลี่ยนแปลงจะมีผลบังคับใช้กับคำขอจองใหม่ทันที</small>
                  </div>
                </aside>
              </div>
            )}

            {/* ===== Compliance ===== */}
            <section className="adm-compliance">
              <span className="shield"><IconShield /></span>
              <div>
                <b>มาตรฐานการกำกับดูแลข้อมูลกลาง FOMS (AUDIT COMPLIANCE)</b>
                <span className="muted"> · มติมหาเถรสมาคม &amp; พ.ร.บ. คณะสงฆ์</span>
                <p>
                  การแก้ไขอัตราค่าบำรุงและกฎเกณฑ์ทุกรายการจะถูกบันทึกเป็นรหัสธุรกรรม (Audit Block Hash)
                  และส่งรายงานแจ้งเตือนไปยังเจ้าอาวาสและไวยาวัจกรตามระเบียบ พ.ศ. 2562 โดยอัตโนมัติ
                  เพื่อความโปร่งใสสูงสุดของศาสนสถาน
                </p>
              </div>
              <button className="link" onClick={() => setTab("audit")}>ดูประวัติการแก้ไขระบบ →</button>
            </section>
          </>
        )}

        {tab === "access" && (
          <section className="adm-access">
            <h1>บัญชีผู้ใช้และสิทธิ์การเข้าถึง (Access Control)</h1>
            <p>กำหนดบทบาท 5 กลุ่ม: Super Admin, Temple Staff, Operations Team, Host</p>
            <div className="adm-card">
              <button className="adm-btn-black sm" onClick={() => alert("ยังไม่เชื่อมระบบ")}>+ เชิญผู้ใช้</button>
              <table className="adm-table plain">
                <thead>
                  <tr><th>รหัส</th><th>ชื่อผู้ใช้</th><th>ช่องทางติดต่อ</th><th>บทบาท</th><th>สถานะ</th><th>เข้าสู่ระบบล่าสุด</th></tr>
                </thead>
                <tbody>
                  {USERS.map((u) => (
                    <tr key={u.id}>
                      <td className="code">{u.id}</td>
                      <td>{u.name}</td>
                      <td>{u.contact}</td>
                      <td>
                        <select defaultValue={u.role}>
                          {ROLES.map((r) => <option key={r}>{r}</option>)}
                        </select>
                      </td>
                      <td>{u.active ? "ใช้งาน" : "ระงับ"}</td>
                      <td>{u.last}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {(tab === "overview" || tab === "audit" || tab === "settings") && (
          <div className="adm-placeholder">ส่วน “{activeTab.th}” ยังไม่ได้ทำ</div>
        )}
      </main>

      {/* ===== Footer ===== */}
      <footer className="adm-footer">
        <div className="adm-footer-row">
          <div>
            <h4>FOMS <span>|</span> สถาปัตยกรรมระบบบริหารจัดการงานพิธีและศาสนสมบัติ</h4>
            <p>
              ระบบปฏิบัติการกลางสำหรับการกำกับดูแล ธรรมาภิบาล และการบริหารจัดการลำดับพิธีการทางศาสนา
              ภายใต้การควบคุมและรักษาความปลอดภัยของสำนักงานศาสนสมบัติส่วนกลาง
            </p>
          </div>
          <div className="right">
            <b>ฝ่ายบริหารระบบเทคโนโลยีสารสนเทศ</b>
            <span>โทร. 02-000-0000 ต่อ 8100 · admin.support@foms.go.th</span>
          </div>
        </div>
        <div className="adm-footer-bottom">
          <span>© 2025 FOMS Ceremonial Governance &amp; Audit Compliance. สงวนลิขสิทธิ์ตามพระราชบัญญัติข้อมูลข่าวสารและสารสนเทศภาครัฐ</span>
          <span>นโยบายความปลอดภัยสารสนเทศ &nbsp;·&nbsp; ข้อกำหนดการใช้งานและจริยธรรมข้อมูล</span>
        </div>
      </footer>
    </div>
  );
};

export default AdminDashboard;