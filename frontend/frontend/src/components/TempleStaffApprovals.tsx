import React, { useEffect, useMemo, useRef, useState } from "react";
import { StaffNav } from "./StaffNav";
import { AuthUser } from "../App";
import "./TempleStaffApprovals.css";

interface TempleStaffApprovalsProps {
  isLoggedIn?: boolean;
  userName?: string;
  currentUser?: AuthUser | null;
  onNavigateHome?: () => void;
  onNavigateLogin?: () => void;
  onNavigateRegister?: () => void;
  onNavigateCalendar?: () => void;
  onNavigateInventory?: () => void;
  onNavigateHistory?: () => void;
  onLogout?: () => void;
}

type Flag = "URGENT" | "NORMAL" | "OVER_CAPACITY";
type DocStatus = "VERIFIED" | "PENDING";
type Decision = "PENDING" | "APPROVED" | "REJECTED";

interface ApprovalRequest {
  id: string;
  bookingRef: string;
  submittedAt: string;
  flag: Flag;
  hostName: string;
  hostRelation: string;
  hostPhone: string;
  deceasedName: string;
  docStatus: DocStatus;
  hallName: string;
  hallCapacity: number;
  packageName: string;
  packageNote: string;
  dateRange: string;
  startISO: string; // วันเริ่มสวด (YYYY-MM-DD) ใช้กรองตามช่วงวันที่
  nights: number;
  cremationDate: string;
  guests: number;
  grandTotal: number;
  paymentNote: string;
  decision: Decision;
}

// ข้อมูลตัวอย่างสำหรับขึ้นหน้าจอ รอเชื่อม API ของเจ้าหน้าที่วัด
const MOCK_REQUESTS: ApprovalRequest[] = [
  {
    id: "1",
    bookingRef: "FOMS-2569-0045",
    submittedAt: "12 ก.ค. 09:15 น.",
    flag: "URGENT",
    hostName: "คุณศรัทธา ภักดี",
    hostRelation: "บุตรชาย",
    hostPhone: "081-892-XXXX",
    deceasedName: "คุณพ่อสมเกียรติ ภักดี",
    docStatus: "VERIFIED",
    hallName: "ศาลา 2 (เมตตาธรรม)",
    hallCapacity: 150,
    packageName: "แพ็กเกจ มาตรฐาน",
    packageNote: "หีบเย็น + ดอกไม้ขาว-เขียว",
    dateRange: "13 – 17 ก.ค. 2569",
    startISO: "2026-07-13",
    nights: 5,
    cremationDate: "18 ก.ค. 2569",
    guests: 150,
    grandTotal: 74000,
    paymentNote: "มัดจำ 30% รอชำระ",
    decision: "PENDING",
  },
  {
    id: "2",
    bookingRef: "FOMS-2569-0046",
    submittedAt: "12 ก.ค. 10:40 น.",
    flag: "NORMAL",
    hostName: "พญ. ปรียาภรณ์ ชัยสิทธิกุล",
    hostRelation: "บุตรสาว",
    hostPhone: "089-445-XXXX",
    deceasedName: "พล.อ.ท. วิสูตร ชัยสิทธิกุล",
    docStatus: "PENDING",
    hallName: "ศาลาใหญ่ 3 (สันติสุขาราม)",
    hallCapacity: 300,
    packageName: "แพ็กเกจ พรีเมียม ครบวงจร",
    packageNote: "หีบไม้สักทอง + วงปี่พาทย์นางหงส์",
    dateRange: "15 – 21 ก.ค. 2569",
    startISO: "2026-07-15",
    nights: 7,
    cremationDate: "22 ก.ค. 2569",
    guests: 300,
    grandTotal: 185000,
    paymentNote: "รออนุมัติก่อนเปิดยอด",
    decision: "PENDING",
  },
  {
    id: "3",
    bookingRef: "FOMS-2569-0047",
    submittedAt: "12 ก.ค. 11:20 น.",
    flag: "NORMAL",
    hostName: "คุณกิตติศักดิ์ เจริญวงศ์",
    hostRelation: "หลาน",
    hostPhone: "086-778-XXXX",
    deceasedName: "คุณย่าละม่อม เจริญวงศ์",
    docStatus: "VERIFIED",
    hallName: "ศาลา 1 (การุณยสถาน)",
    hallCapacity: 60,
    packageName: "แพ็กเกจ เศรษฐกิจ พอเพียง",
    packageNote: "อุปกรณ์พิธีสงฆ์ครบชุด + สัปเหร่อ",
    dateRange: "18 – 20 ก.ค. 2569",
    startISO: "2026-07-18",
    nights: 3,
    cremationDate: "21 ก.ค. 2569",
    guests: 60,
    grandTotal: 33600,
    paymentNote: "พร้อมออกใบเสร็จ",
    decision: "PENDING",
  },
  {
    id: "4",
    bookingRef: "FOMS-2569-0048",
    submittedAt: "12 ก.ค. 11:55 น.",
    flag: "OVER_CAPACITY",
    hostName: "คุณอรทัย วัฒนากุล",
    hostRelation: "ภรรยา",
    hostPhone: "082-331-XXXX",
    deceasedName: "นายอเนก วัฒนากุล",
    docStatus: "VERIFIED",
    hallName: "ศาลา 1 (การุณยสถาน)",
    hallCapacity: 80,
    packageName: "แพ็กเกจ มาตรฐาน",
    packageNote: "ระบุ 120 คน (ความจุจริง 80 คน)",
    dateRange: "19 – 23 ก.ค. 2569",
    startISO: "2026-07-19",
    nights: 5,
    cremationDate: "24 ก.ค. 2569",
    guests: 120,
    grandTotal: 63000,
    paymentNote: "แนะนำย้ายไปศาลา 2",
    decision: "PENDING",
  },
];

type Filter = "ALL" | "URGENT" | string;


const GUIDELINES = [
  {
    no: "01",
    title: "การยืนยันและระบบชำระเงิน",
    desc: "เมื่อกดยืนยันอนุมัติคำขอ ระบบจะส่งข้อความแจ้งเตือนพร้อมลิงก์ชำระเงินมัดจำไปยังเบอร์ติดต่อเจ้าภาพโดยอัตโนมัติทันที",
  },
  {
    no: "02",
    title: "การจัดสรรพระสงฆ์และมัคนายก",
    desc: "ระบบทำการนิมนต์พระสงฆ์ 4 รูป และมอบหมายเจ้าหน้าที่มัคนายกประจำศาลาโดยอัตโนมัติตามตารางเวรศาสนกิจประจำวัน",
  },
  {
    no: "03",
    title: "ธรรมาภิบาลและการบันทึกข้อมูล",
    desc: "ทุกการอนุมัติ ปฏิเสธ หรือขอปรับเลื่อนเวลา จะถูกลงบันทึกใน Audit Ledger ประจำสำนักงานวัดอย่างถาวรและโปร่งใส",
  },
];

const baht =(n: number) => `฿${n.toLocaleString("th-TH")}`;

interface ExtraFilters {
  doc: string;
  flag: string;
  nights: string;
}

const NO_EXTRA: ExtraFilters = { doc: "ALL", flag: "ALL", nights: "ALL" };

const MONTH_PRESETS = [
  { label: "กรกฎาคม 2569", from: "2026-07-01", to: "2026-07-31" },
  { label: "สิงหาคม 2569", from: "2026-08-01", to: "2026-08-31" },
];

const thaiDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const months = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];
  return `${d} ${months[m - 1]} ${y + 543}`;
};

const describeRange = (from: string, to: string) => {
  const preset = MONTH_PRESETS.find((m) => m.from === from && m.to === to);
  if (preset) return preset.label;
  if (!from && !to) return "ทุกช่วงเวลา";
  if (from && to) return `${thaiDate(from)} – ${thaiDate(to)}`;
  return from ? `ตั้งแต่ ${thaiDate(from)}` : `ถึง ${thaiDate(to)}`;
};

const FLAG_LABEL: Record<Flag, string> = {
  URGENT: "ด่วน: สวดพรุ่งนี้",
  NORMAL: "ลำดับปกติ",
  OVER_CAPACITY: "แจ้งเตือน: เกินความจุศาลา",
};

export const TempleStaffApprovals: React.FC<TempleStaffApprovalsProps> = ({
  currentUser,
  onNavigateHome,
  onNavigateCalendar,
  onNavigateInventory,
  onNavigateHistory,
  onLogout,
}) => {
  const [requests, setRequests] = useState<ApprovalRequest[]>(MOCK_REQUESTS);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");

  const [openPanel, setOpenPanel] = useState<"date" | "extra" | null>(null);
  const [dateFrom, setDateFrom] = useState(MONTH_PRESETS[0].from);
  const [dateTo, setDateTo] = useState(MONTH_PRESETS[0].to);
  const [extra, setExtra] = useState<ExtraFilters>(NO_EXTRA);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // คลิกนอกแผงตัวกรองแล้วปิดแผง
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!toolbarRef.current?.contains(e.target as Node)) setOpenPanel(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const extraCount = Object.values(extra).filter((v) => v !== "ALL").length;
  const dateLabel = describeRange(dateFrom, dateTo);

  const pending = useMemo(
    () => requests.filter((r) => r.decision === "PENDING"),
    [requests],
  );

  const hallFilters = useMemo(
    () => Array.from(new Set(pending.map((r) => r.hallName.split(" (")[0]))),
    [pending],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pending.filter((r) => {
      if (filter === "URGENT" && r.flag !== "URGENT") return false;
      if (
        filter !== "ALL" &&
        filter !== "URGENT" &&
        r.hallName.split(" (")[0] !== filter
      )
        return false;
      if (dateFrom && r.startISO < dateFrom) return false;
      if (dateTo && r.startISO > dateTo) return false;
      if (extra.doc !== "ALL" && r.docStatus !== extra.doc) return false;
      if (extra.flag !== "ALL" && r.flag !== extra.flag) return false;
      if (extra.nights !== "ALL" && String(r.nights) !== extra.nights)
        return false;
      if (!q) return true;
      return [r.bookingRef, r.hostName, r.deceasedName].some((v) =>
        v.toLowerCase().includes(q),
      );
    });
  }, [pending, search, filter, dateFrom, dateTo, extra]);

  const decide = (id: string, decision: Decision) =>
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, decision } : r)),
    );

  const urgentCount = pending.filter((r) => r.flag === "URGENT").length;

  return (
    <div className="staff-wrapper">
      <StaffNav
        active="approvals"
        userName={currentUser?.name}
        onNavigateHome={onNavigateHome}
        onNavigateCalendar={onNavigateCalendar}
        onNavigateInventory={onNavigateInventory}
        onNavigateHistory={onNavigateHistory}
        onLogout={onLogout}
      />

      <header className="staff-header">
        <div className="staff-breadcrumb">
          <span className="staff-breadcrumb-link" onClick={onNavigateHome}>
            หน้าหลัก
          </span>
          <span className="staff-breadcrumb-sep">/</span>
          <span>เจ้าหน้าที่วัด</span>
          <span className="staff-breadcrumb-sep">/</span>
          <span className="staff-breadcrumb-current">คำขออนุมัติ</span>
        </div>
        <span className="staff-pretitle">TEMPLE STAFF APPROVAL BOARD</span>
        <div className="staff-title-row">
          <h1 className="staff-title">
            คำขอจองศาลาและพิธีการรออนุมัติ (Pending Approvals)
          </h1>
          <span className="staff-updated">
            อัปเดตล่าสุด: 12 ก.ค. 2569 · 12:05 น.
          </span>
        </div>
        <p className="staff-subtitle">
          ตรวจสอบความพร้อมของศาลา ตรวจสอบเอกสารใบมรณบัตร
          และยืนยันการจัดคิวพระสงฆ์ตามวันเวลาที่เจ้าภาพระบุ
        </p>
      </header>

      <main className="staff-container">
        <section className="staff-stats">
          <div className="staff-stat">
            <span className="staff-stat-label">01 · คำขอรอตรวจสอบ</span>
            <div className="staff-stat-value">
              {pending.length} <small>รายการ</small>
            </div>
            <div className="staff-stat-note">
              ต้องการการพิจารณาด่วน {urgentCount} รายการ
            </div>
          </div>
          <div className="staff-stat">
            <span className="staff-stat-label">02 · ศาลาว่างวันนี้</span>
            <div className="staff-stat-value">
              2 / 3 <small>หลัง</small>
            </div>
            <div className="staff-stat-note">ศาลา 1 ว่าง, ศาลา 3 ว่าง</div>
          </div>
          <div className="staff-stat">
            <span className="staff-stat-label">03 · ยืนยันคิวพระสงฆ์แล้ว</span>
            <div className="staff-stat-value">
              12 <small>รูป / 3 งาน</small>
            </div>
            <div className="staff-stat-note">คิวสวดพระอภิธรรมประจำคืนนี้</div>
          </div>
          <div className="staff-stat">
            <span className="staff-stat-label">04 · งานพิธีสวดคืนนี้</span>
            <div className="staff-stat-value">
              1 <small>งาน</small>
            </div>
            <div className="staff-stat-note">
              ศาลา 2 เมตตาธรรม (สวดคืนที่ 3)
            </div>
          </div>
        </section>

        <section className="staff-toolbar" ref={toolbarRef}>
          <div className="staff-search-row">
            <input
              className="staff-search"
              type="search"
              placeholder="ค้นหารหัสอ้างอิง ชื่อเจ้าภาพ หรือชื่อผู้วายชนม์..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="staff-pop-anchor">
              <button
                className={`staff-tool-btn ${openPanel === "date" ? "open" : ""}`}
                type="button"
                onClick={() => setOpenPanel(openPanel === "date" ? null : "date")}
              >
                ช่วงวันที่: {dateLabel} ▾
              </button>
              {openPanel === "date" && (
                <div className="staff-pop">
                  <div className="staff-pop-title">เลือกช่วงวันที่เริ่มสวด</div>
                  <div className="staff-pop-presets">
                    {MONTH_PRESETS.map((m) => (
                      <button
                        key={m.label}
                        type="button"
                        className={`staff-chip ${dateFrom === m.from && dateTo === m.to ? "active" : ""}`}
                        onClick={() => {
                          setDateFrom(m.from);
                          setDateTo(m.to);
                        }}
                      >
                        {m.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={`staff-chip ${!dateFrom && !dateTo ? "active" : ""}`}
                      onClick={() => {
                        setDateFrom("");
                        setDateTo("");
                      }}
                    >
                      ทุกช่วงเวลา
                    </button>
                  </div>
                  <label className="staff-pop-field">
                    ตั้งแต่วันที่
                    <input
                      type="date"
                      value={dateFrom}
                      max={dateTo || undefined}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </label>
                  <label className="staff-pop-field">
                    ถึงวันที่
                    <input
                      type="date"
                      value={dateTo}
                      min={dateFrom || undefined}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </label>
                  <div className="staff-pop-foot">
                    <button
                      type="button"
                      className="staff-pop-done"
                      onClick={() => setOpenPanel(null)}
                    >
                      ตกลง
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="staff-pop-anchor">
              <button
                className={`staff-tool-btn ${extraCount > 0 || openPanel === "extra" ? "open" : ""}`}
                type="button"
                onClick={() =>
                  setOpenPanel(openPanel === "extra" ? null : "extra")
                }
              >
                ตัวกรองเพิ่มเติม{extraCount > 0 ? ` (${extraCount})` : ""}
              </button>
              {openPanel === "extra" && (
                <div className="staff-pop staff-pop-right">
                  <div className="staff-pop-title">ตัวกรองเพิ่มเติม</div>
                  <label className="staff-pop-field">
                    สถานะใบมรณบัตร
                    <select
                      value={extra.doc}
                      onChange={(e) =>
                        setExtra({ ...extra, doc: e.target.value })
                      }
                    >
                      <option value="ALL">ทั้งหมด</option>
                      <option value="VERIFIED">ตรวจสอบแล้ว</option>
                      <option value="PENDING">รอตรวจสอบ</option>
                    </select>
                  </label>
                  <label className="staff-pop-field">
                    ความเร่งด่วน / แจ้งเตือน
                    <select
                      value={extra.flag}
                      onChange={(e) =>
                        setExtra({ ...extra, flag: e.target.value })
                      }
                    >
                      <option value="ALL">ทั้งหมด</option>
                      <option value="URGENT">ด่วน</option>
                      <option value="NORMAL">ลำดับปกติ</option>
                      <option value="OVER_CAPACITY">เกินความจุศาลา</option>
                    </select>
                  </label>
                  <label className="staff-pop-field">
                    จำนวนคืนที่สวด
                    <select
                      value={extra.nights}
                      onChange={(e) =>
                        setExtra({ ...extra, nights: e.target.value })
                      }
                    >
                      <option value="ALL">ทั้งหมด</option>
                      <option value="1">1 คืน</option>
                      <option value="3">3 คืน</option>
                      <option value="5">5 คืน</option>
                      <option value="7">7 คืน</option>
                    </select>
                  </label>
                  <div className="staff-pop-foot">
                    <button
                      type="button"
                      className="staff-pop-reset"
                      onClick={() => setExtra(NO_EXTRA)}
                    >
                      ล้างตัวกรอง
                    </button>
                    <button
                      type="button"
                      className="staff-pop-done"
                      onClick={() => setOpenPanel(null)}
                    >
                      ตกลง
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="staff-chips">
            <button
              className={`staff-chip ${filter === "ALL" ? "active" : ""}`}
              onClick={() => setFilter("ALL")}
            >
              ทั้งหมด ({pending.length})
            </button>
            <button
              className={`staff-chip urgent ${filter === "URGENT" ? "active" : ""}`}
              onClick={() => setFilter("URGENT")}
            >
              ด่วนพิเศษ ({urgentCount})
            </button>
            {hallFilters.map((h) => (
              <button
                key={h}
                className={`staff-chip ${filter === h ? "active" : ""}`}
                onClick={() => setFilter(h)}
              >
                {h} (
                {
                  pending.filter((r) => r.hallName.split(" (")[0] === h)
                    .length
                }
                )
              </button>
            ))}
          </div>
        </section>

        <section className="staff-table-card">
          <div className="staff-table-head">
            <strong>บัญชีคำขอจองพื้นที่และพิธี</strong>
            <span>เรียงตามลำดับความเร่งด่วนและกำหนดการ</span>
          </div>

          <div className="staff-table-scroll">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>รหัสคำขอ / วันที่ยื่น</th>
                  <th>เจ้าภาพ / ผู้ติดต่อ</th>
                  <th>ผู้วายชนม์ / เอกสาร</th>
                  <th>ศาลา / รูปแบบพิธี</th>
                  <th>กำหนดการสวดและฌาปนกิจ</th>
                  <th>ประมาณการแขก / ยอดรวม</th>
                  <th className="staff-th-right">การพิจารณา</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="staff-ref">{r.bookingRef}</div>
                      <span className={`staff-flag ${r.flag.toLowerCase()}`}>
                        {FLAG_LABEL[r.flag]}
                      </span>
                      <div className="staff-muted">ยื่น: {r.submittedAt}</div>
                    </td>
                    <td>
                      <div className="staff-strong">{r.hostName}</div>
                      <div className="staff-muted">{r.hostRelation}</div>
                      <div className="staff-small">โทร. {r.hostPhone}</div>
                    </td>
                    <td>
                      <div className="staff-strong">{r.deceasedName}</div>
                      <div
                        className={`staff-doc ${r.docStatus === "VERIFIED" ? "ok" : "wait"}`}
                      >
                        {r.docStatus === "VERIFIED"
                          ? "ใบมรณบัตร: ตรวจสอบแล้ว"
                          : "ใบมรณบัตร: รอตรวจสอบ"}
                      </div>
                    </td>
                    <td>
                      <div className="staff-strong">{r.hallName}</div>
                      <div className="staff-muted">{r.packageName}</div>
                      <div
                        className={`staff-small ${r.flag === "OVER_CAPACITY" ? "danger" : ""}`}
                      >
                        {r.packageNote}
                      </div>
                    </td>
                    <td>
                      <div className="staff-strong">
                        {r.dateRange}{" "}
                        <span className="staff-gold">({r.nights} คืน)</span>
                      </div>
                      <div className="staff-muted">
                        ฌาปนกิจ: {r.cremationDate}
                      </div>
                    </td>
                    <td>
                      <div className="staff-strong">{baht(r.grandTotal)}</div>
                      <div
                        className={`staff-muted ${r.flag === "OVER_CAPACITY" ? "danger" : ""}`}
                      >
                        {r.guests} คน / คืน
                      </div>
                      <div className="staff-small gold">{r.paymentNote}</div>
                    </td>
                    <td className="staff-actions">
                      <button
                        className="staff-btn-approve"
                        onClick={() => decide(r.id, "APPROVED")}
                      >
                        อนุมัติคำขอ
                      </button>
                      <button
                        className="staff-btn-reject"
                        aria-label="ปฏิเสธคำขอ"
                        onClick={() => decide(r.id, "REJECTED")}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={7} className="staff-empty">
                      ไม่มีคำขอที่รออนุมัติ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="staff-table-foot">
            แสดง {visible.length} จากทั้งหมด {pending.length} รายการ
          </div>
        </section>

        <section className="staff-guide">
          <h2 className="staff-guide-title">
            แนวทางปฏิบัติการอนุมัติของสำนักงานศาสนสมบัติ วัดศรีสุคต พระอารามหลวง
          </h2>
          <div className="staff-guide-grid">
            {GUIDELINES.map((g) => (
              <div key={g.no} className="staff-guide-item">
                <span className="staff-guide-no">{g.no}</span>
                <div>
                  <strong>{g.title}</strong>
                  <p>{g.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="staff-footer">
        <div className="staff-footer-inner">
          <div className="staff-footer-top">
            <div>
              <strong>FOMS TEMPLE OPERATIONS NETWORK</strong>
              <p>
                ระบบบริหารจัดการพิธีศพและการใช้พื้นที่ศาสนสถาน
                สำนักงานศาสนสมบัติ วัดศรีสุคต พระอารามหลวง
              </p>
            </div>
            <div className="staff-footer-contact">
              <span className="staff-gold">สายด่วนประสานงานศาสนพิธีฉุกเฉิน</span>
              <p>โทร. 02-456-7890 ต่อ 101 (ตลอด 24 ชั่วโมง)</p>
            </div>
          </div>
          <div className="staff-footer-bottom">
            <div className="staff-footer-links">
              <span>ระเบียบปฏิบัติศาสนสถาน</span>
              <span>นโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA)</span>
              <span>ระเบียบข้อบังคับการฌาปนกิจ</span>
            </div>
            <span>© 2025 FOMS Temple Operations. สงวนลิขสิทธิ์ทุกประการ.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
