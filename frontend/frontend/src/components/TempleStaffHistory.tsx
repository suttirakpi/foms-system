import React, { useMemo, useState } from "react";
import { StaffNav } from "./StaffNav";
import { AuthUser } from "../App";
import "./TempleStaffHistory.css";

interface TempleStaffHistoryProps {
  currentUser?: AuthUser | null;
  onNavigateHome?: () => void;
  onNavigateApprovals?: () => void;
  onNavigateCalendar?: () => void;
  onNavigateInventory?: () => void;
  onLogout?: () => void;
}

type HistStatus = "COMPLETED" | "CANCELLED";

interface HistoryRecord {
  ref: string;
  bookedAt: string;
  host: string;
  hostPhone: string;
  hostRelation: string;
  deceased: string;
  deceasedNote: string;
  hall: "ศาลา 1" | "ศาลา 2" | "ศาลา 3";
  hallFull: string;
  venue: string;
  startISO: string; // ใช้กรองตามช่วงเวลา
  dateRange: string;
  tag: string;
  pkg: string;
  price: string;
  pkgNote: string;
  status: HistStatus;
}

const STATUS_LABEL: Record<HistStatus, string> = {
  COMPLETED: "เสร็จสิ้นสมบูรณ์",
  CANCELLED: "ยกเลิกคำขอ",
};

const TOTAL_ITEMS = 148;
const TOTAL_PAGES = 22;
const PAGE_SIZE = 7;

const EXPORT_NOTE = "ข้อมูลจำลอง ยังไม่เชื่อมระบบ";

// ข้อมูลตัวอย่างสำหรับขึ้นหน้าจอ รอเชื่อม API ประวัติของเจ้าหน้าที่วัด
const RECORDS: HistoryRecord[] = [
  {
    ref: "FOMS-2569-0148",
    bookedAt: "จองเมื่อ 04 ก.พ. 69",
    host: "นพ.กิตติศักดิ์ ภักดีดำรงกุล",
    hostPhone: "โทร 081-444-9921",
    hostRelation: "บุตร",
    deceased: "คุณพ่อสมเกียรติ ภักดีดำรงกุล",
    deceasedNote: "อายุ 84 ปี (สวด 5 คืน)",
    hall: "ศาลา 2",
    hallFull: "ศาลา 2 (เมตตาธรรม)",
    venue: "เมรุหลวง (สุคตาลัย)",
    startISO: "2026-02-10",
    dateRange: "10 – 14 ก.พ. 2569",
    tag: "5 คืน · พระราชทานเพลิง",
    pkg: "Premium ครบวงจร",
    price: "฿84,000 (ชำระแล้ว)",
    pkgNote: "",
    status: "COMPLETED",
  },
  {
    ref: "FOMS-2569-0147",
    bookedAt: "จองเมื่อ 04 ก.พ. 69",
    host: "คุณหญิงประภาศรี รัตนเวทิน",
    hostPhone: "โทร 089-112-3344",
    hostRelation: "ภริยา",
    deceased: "พล.อ.ต. วิสูตร รัตนเวทิน",
    deceasedNote: "อายุ 79 ปี (สวด 3 คืน)",
    hall: "ศาลา 1",
    hallFull: "ศาลา 1 (การุณยสถาน)",
    venue: "เมรุหลวง (สุคตาลัย)",
    startISO: "2026-02-07",
    dateRange: "07 – 09 ก.พ. 2569",
    tag: "3 คืน · ฌาปนกิจเสร็จสิ้น",
    pkg: "Standard สมเกียรติ",
    price: "฿52,000 (ชำระแล้ว)",
    pkgNote: "",
    status: "COMPLETED",
  },
  {
    ref: "FOMS-2569-0146",
    bookedAt: "จองเมื่อ 03 ก.พ. 69",
    host: "นายธนภัทร สิริวรพงศ์",
    hostPhone: "โทร 084-991-0023",
    hostRelation: "หลาน",
    deceased: "นางนภาลัย สิริวรพงศ์",
    deceasedNote: "ย้ายไปจัดที่วัดประจำจังหวัด",
    hall: "ศาลา 3",
    hallFull: "ศาลา 3 (สันติสุขาราม)",
    venue: "ปล่อยคิวว่างสู่ระบบ",
    startISO: "2026-02-05",
    dateRange: "05 – 07 ก.พ. 2569",
    tag: "ยกเลิกล่วงหน้า 48 ชม.",
    pkg: "พอเพียง / ศาสนกิจ",
    price: "",
    pkgNote: "คืนเงินมัดจำเรียบร้อย",
    status: "CANCELLED",
  },
  {
    ref: "FOMS-2569-0145",
    bookedAt: "จองเมื่อ 01 ก.พ. 69",
    host: "อาจารย์สุนีย์ บวรวงศ์ไทย",
    hostPhone: "โทร 086-443-4410",
    hostRelation: "บุตรสาว",
    deceased: "คุณแม่จันทร์เพ็ญ บวรวงศ์ไทย",
    deceasedNote: "อายุ 91 ปี (สวด 7 คืน)",
    hall: "ศาลา 2",
    hallFull: "ศาลา 2 (เมตตาธรรม)",
    venue: "เมรุหลวง (สุคตาลัย)",
    startISO: "2026-02-02",
    dateRange: "02 – 08 ก.พ. 2569",
    tag: "7 คืน · ลอยอังคารปากอ่าว",
    pkg: "Premium ครบวงจร",
    price: "฿93,000 (ชำระแล้ว)",
    pkgNote: "",
    status: "COMPLETED",
  },
  {
    ref: "FOMS-2569-0144",
    bookedAt: "จองเมื่อ 28 ม.ค. 69",
    host: "นายอภิวัฒน์ พิทยาภรณ์",
    hostPhone: "โทร 081-308-7722",
    hostRelation: "พี่ชาย",
    deceased: "นายชัยวัฒน์ พิทยาภรณ์",
    deceasedNote: "อายุ 52 ปี (สวด 3 คืน)",
    hall: "ศาลา 1",
    hallFull: "ศาลา 1 (การุณยสถาน)",
    venue: "เมรุหลวง (สุคตาลัย)",
    startISO: "2026-01-30",
    dateRange: "30 ม.ค. – 01 ก.พ. 2569",
    tag: "3 คืน · ฌาปนกิจเสร็จสิ้น",
    pkg: "Standard สมเกียรติ",
    price: "฿44,500 (ชำระแล้ว)",
    pkgNote: "",
    status: "COMPLETED",
  },
  {
    ref: "FOMS-2569-0143",
    bookedAt: "จองเมื่อ 24 ม.ค. 69",
    host: "นางสาววราภรณ์ วงศ์สว่าง",
    hostPhone: "โทร 091-334-4678",
    hostRelation: "หลานสาว",
    deceased: "นายอนงค์ วงศ์สว่าง",
    deceasedNote: "อายุ 72 ปี (สวด 3 คืน)",
    hall: "ศาลา 3",
    hallFull: "ศาลา 3 (สันติสุขาราม)",
    venue: "เมรุหลวง (สุคตาลัย)",
    startISO: "2026-01-27",
    dateRange: "27 – 29 ม.ค. 2569",
    tag: "3 คืน · บรรจุอัฐิวัด",
    pkg: "พอเพียง / กุศลสงเคราะห์",
    price: "฿22,000 (ชำระแล้ว)",
    pkgNote: "",
    status: "COMPLETED",
  },
  {
    ref: "FOMS-2569-0142",
    bookedAt: "จองเมื่อ 20 ม.ค. 69",
    host: "พันตำรวจเอก ธีรเดช เจริญสุข",
    hostPhone: "โทร 083-441-9988",
    hostRelation: "บุตร",
    deceased: "คุณพ่อประจวบ เจริญสุข",
    deceasedNote: "อายุ 86 ปี (สวด 4 คืน)",
    hall: "ศาลา 2",
    hallFull: "ศาลา 2 (เมตตาธรรม)",
    venue: "เมรุหลวง (สุคตาลัย)",
    startISO: "2026-01-22",
    dateRange: "22 – 26 ม.ค. 2569",
    tag: "4 คืน · พระราชทานเพลิง",
    pkg: "Premium ครบวงจร",
    price: "฿86,500 (ชำระแล้ว)",
    pkgNote: "",
    status: "COMPLETED",
  },
];

const DEFAULT_FROM = "2025-01-01";
const DEFAULT_TO = "2026-02-28";

const TH_MONTHS_SHORT = [
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

const monthYear = (iso: string) => {
  const [y, m] = iso.split("-").map(Number);
  return `${TH_MONTHS_SHORT[m - 1]} ${(y + 543)}`;
};

const rangeLabel = (from: string, to: string) => {
  if (!from && !to) return "ทุกช่วงเวลา";
  if (from && to) return `${monthYear(from)} — ${monthYear(to)}`;
  return from ? `ตั้งแต่ ${monthYear(from)}` : `ถึง ${monthYear(to)}`;
};

export const TempleStaffHistory: React.FC<TempleStaffHistoryProps> = ({
  currentUser,
  onNavigateHome,
  onNavigateApprovals,
  onNavigateCalendar,
  onNavigateInventory,
  onLogout,
}) => {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(DEFAULT_FROM);
  const [dateTo, setDateTo] = useState(DEFAULT_TO);
  const [hall, setHall] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [openPanel, setOpenPanel] = useState<"date" | "export" | null>(null);
  const [detail, setDetail] = useState<HistoryRecord | null>(null);
  const [toast, setToast] = useState("");

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 3500);
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return RECORDS.filter((r) => {
      if (dateFrom && r.startISO < dateFrom) return false;
      if (dateTo && r.startISO > dateTo) return false;
      if (hall !== "ALL" && r.hall !== hall) return false;
      if (status !== "ALL" && r.status !== status) return false;
      if (!q) return true;
      return [r.ref, r.host, r.deceased, r.hostPhone].some((v) =>
        v.toLowerCase().includes(q),
      );
    });
  }, [search, dateFrom, dateTo, hall, status]);

  const filtering =
    search.trim() !== "" ||
    hall !== "ALL" ||
    status !== "ALL" ||
    dateFrom !== DEFAULT_FROM ||
    dateTo !== DEFAULT_TO;
  // หน้า 1 มีข้อมูลตัวอย่างจริง หน้าอื่นรอข้อมูลจาก API
  const shown = filtering || page === 1 ? visible : [];

  const reset = () => {
    setSearch("");
    setDateFrom(DEFAULT_FROM);
    setDateTo(DEFAULT_TO);
    setHall("ALL");
    setStatus("ALL");
    setPage(1);
  };

  const exportCsv = () => {
    const head = ["รหัสอ้างอิง", "เจ้าภาพ", "ผู้วายชนม์", "ศาลา", "กำหนดการ", "แพ็กเกจ", "สถานะ"];
    const rows = visible.map((r) => [
      r.ref,
      r.host,
      r.deceased,
      r.hallFull,
      r.dateRange,
      r.pkg,
      STATUS_LABEL[r.status],
    ]);
    const csv = [head, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "history.csv";
    a.click();
    URL.revokeObjectURL(url);
    setOpenPanel(null);
  };

  const pageButtons: (number | "...")[] = [1, 2, 3, "...", TOTAL_PAGES];

  return (
    <div className="his-wrapper">
      <StaffNav
        active="history"
        userName={currentUser?.name}
        onNavigateHome={onNavigateHome}
        onNavigateApprovals={onNavigateApprovals}
        onNavigateCalendar={onNavigateCalendar}
        onNavigateInventory={onNavigateInventory}
        onLogout={onLogout}
      />

      <div className="his-container">
        <div className="his-breadcrumb">
          <span className="his-link" onClick={onNavigateHome}>
            หน้าหลัก
          </span>
          {" › "}
          <span>ฝ่ายพิธีการวัด (Temple Staff)</span>
          {" › "}
          <strong>ประวัติคำขอและงานพิธีการ</strong>
        </div>

        <div className="his-archive-row">
          <span className="his-archive-tag">
            TEMPLE CEREMONIAL ARCHIVE · คลังบันทึกงานพิธีการย้อนหลัง
          </span>
          <span className="his-archive-note">● สมุดทะเบียนศาสนพิธี ดิจิทัล</span>
        </div>

        <div className="his-title-row">
          <div>
            <h1 className="his-title">
              ประวัติคำขอและงานพิธีการ <small>(Request & Event History)</small>
            </h1>
            <p className="his-subtitle">
              บันทึกข้อมูลคำขอจองศาลา ลำดับพิธีการสวดพระอภิธรรม
              และพิธีฌาปนกิจที่เสร็จสิ้นสมบูรณ์หรือยกเลิก
              พร้อมระบบตรวจสอบย้อนกลับ (Audit Log) ตามมาตรฐานการกำกับดูแลศาสนสมบัติ
            </p>
          </div>
          <div className="his-pop-anchor">
            <button
              className="his-btn"
              type="button"
              onClick={() => setOpenPanel(openPanel === "export" ? null : "export")}
            >
              ⤓ ส่งออกรายงานประวัติ (Export CSV / PDF)
            </button>
            {openPanel === "export" && (
              <div className="his-pop his-pop-right narrow">
                <button type="button" className="his-menu-item" onClick={exportCsv}>
                  ดาวน์โหลด CSV ({visible.length} รายการ)
                </button>
                <button
                  type="button"
                  className="his-menu-item"
                  onClick={() => {
                    setOpenPanel(null);
                    window.print();
                  }}
                >
                  พิมพ์ / บันทึกเป็น PDF
                </button>
              </div>
            )}
          </div>
        </div>

        <section className="his-stats">
          <div className="his-stat">
            <div className="his-stat-top">
              <span>01 · TOTAL EVENTS</span>
              <i>▤</i>
            </div>
            <div className="his-stat-value">
              148 <small>งาน</small>
            </div>
            <strong>งานพิธีทั้งหมดในประวัติ</strong>
            <div className="his-stat-foot">
              <span>รอบปี พ.ศ. 2568 — 2569</span>
              <em>บันทึกสะสม</em>
            </div>
          </div>
          <div className="his-stat">
            <div className="his-stat-top">
              <span>02 · COMPLETED</span>
              <i>✓</i>
            </div>
            <div className="his-stat-value">
              139 <small>งาน</small>
            </div>
            <strong>พิธีการเสร็จสมบูรณ์</strong>
            <div className="his-stat-foot">
              <span>93.9% ส่งมอบเรียบร้อยสมเกียรติ</span>
              <em>สมบูรณ์</em>
            </div>
          </div>
          <div className="his-stat">
            <div className="his-stat-top">
              <span>03 · RELEASED</span>
              <i>▦</i>
            </div>
            <div className="his-stat-value">
              9 <small>คำขอ</small>
            </div>
            <strong>คำขอยกเลิก / คืนคิวจัด</strong>
            <div className="his-stat-foot">
              <span>คืนมัดจำ/แจ้งล่วงหน้าตามเกณฑ์</span>
              <span>6.1%</span>
            </div>
          </div>
          <div className="his-stat">
            <div className="his-stat-top">
              <span>04 · TOTAL ENDOWMENT</span>
              <i>฿</i>
            </div>
            <div className="his-stat-value">฿1,248,500</div>
            <strong>ยอดบำรุงศาสนสถานสะสม</strong>
            <div className="his-stat-foot">
              <span>เข้าบัญชีสำนักงานศาสนสมบัติ</span>
              <em>ตรวจรับแล้ว</em>
            </div>
          </div>
        </section>

        <section className="his-toolbar">
          <input
            className="his-search"
            type="search"
            placeholder="ค้นหารหัสอ้างอิง, ชื่อเจ้าภาพ, ผู้วายชนม์ หรือเบอร์โทร..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <div className="his-pop-anchor">
            <button
              type="button"
              className="his-field-btn"
              onClick={() => setOpenPanel(openPanel === "date" ? null : "date")}
            >
              ▭ ช่วงเวลา: <b>{rangeLabel(dateFrom, dateTo)}</b>
            </button>
            {openPanel === "date" && (
              <div className="his-pop">
                <div className="his-pop-title">เลือกช่วงเวลาที่จัดพิธี</div>
                <label className="his-pop-field">
                  ตั้งแต่วันที่
                  <input
                    type="date"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setPage(1);
                    }}
                  />
                </label>
                <label className="his-pop-field">
                  ถึงวันที่
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setPage(1);
                    }}
                  />
                </label>
                <div className="his-pop-foot">
                  <button
                    type="button"
                    className="his-btn"
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                    }}
                  >
                    ทุกช่วงเวลา
                  </button>
                  <button
                    type="button"
                    className="his-btn dark"
                    onClick={() => setOpenPanel(null)}
                  >
                    ตกลง
                  </button>
                </div>
              </div>
            )}
          </div>
          <select
            className="his-select"
            value={hall}
            onChange={(e) => {
              setHall(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">ศาลาทั้งหมด (ทุกสถานที่)</option>
            <option value="ศาลา 1">ศาลา 1 (การุณยสถาน)</option>
            <option value="ศาลา 2">ศาลา 2 (เมตตาธรรม)</option>
            <option value="ศาลา 3">ศาลา 3 (สันติสุขาราม)</option>
          </select>
          <select
            className="his-select"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">สถานะทั้งหมด</option>
            <option value="COMPLETED">เสร็จสิ้นสมบูรณ์</option>
            <option value="CANCELLED">ยกเลิกคำขอ</option>
          </select>
          <button
            type="button"
            className="his-refresh"
            aria-label="ล้างตัวกรอง"
            title="ล้างตัวกรอง"
            onClick={reset}
          >
            ↻
          </button>
        </section>

        <section className="his-table-card">
          <div className="his-table-scroll">
            <table className="his-table">
              <thead>
                <tr>
                  <th>รหัสอ้างอิง (ID)</th>
                  <th>เจ้าภาพและผู้ติดต่อ</th>
                  <th>ผู้วายชนม์</th>
                  <th>ศาลา / สถานที่</th>
                  <th>กำหนดการจัดพิธี</th>
                  <th>แพ็กเกจพิธี</th>
                  <th>สถานะ:</th>
                  <th className="r">การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const cancelled = r.status === "CANCELLED";
                  return (
                    <tr key={r.ref}>
                      <td className="his-ref">
                        <b>{r.ref}</b>
                        <span>{r.bookedAt}</span>
                      </td>
                      <td>
                        <div className="his-strong">{r.host}</div>
                        <div className="his-muted">
                          {r.hostPhone} ({r.hostRelation})
                        </div>
                      </td>
                      <td>
                        <div className="his-strong">{r.deceased}</div>
                        <div className="his-muted">{r.deceasedNote}</div>
                      </td>
                      <td>
                        <div className={`his-strong ${cancelled ? "strike" : ""}`}>
                          {r.hallFull}
                        </div>
                        <div className="his-muted">{r.venue}</div>
                      </td>
                      <td>
                        <div className={`his-strong ${cancelled ? "strike" : ""}`}>
                          {r.dateRange}
                        </div>
                        <span className="his-tag">{r.tag}</span>
                      </td>
                      <td>
                        <div className="his-strong">{r.pkg}</div>
                        <div className={cancelled ? "his-muted" : "his-price"}>
                          {cancelled ? r.pkgNote : r.price}
                        </div>
                      </td>
                      <td>
                        <span className={`his-status ${r.status.toLowerCase()}`}>
                          ● {STATUS_LABEL[r.status]}
                        </span>
                      </td>
                      <td className="r">
                        <button
                          type="button"
                          className={`his-detail ${cancelled ? "plain" : ""}`}
                          onClick={() => setDetail(r)}
                        >
                          {cancelled ? "ดูบันทึกยกเลิก" : "ดูรายละเอียด"} →
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={8} className="his-empty">
                      {filtering
                        ? "ไม่พบรายการที่ตรงกับเงื่อนไข"
                        : "หน้านี้ยังไม่มีข้อมูล (ข้อมูลตัวอย่างมีเฉพาะหน้า 1)"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="his-pager">
            <span>
              {filtering ? (
                <>
                  พบ <b>{visible.length}</b> รายการ
                </>
              ) : (
                <>
                  แสดง <b>{((page - 1) * PAGE_SIZE + 1)}</b> ถึง{" "}
                  <b>{(Math.min(page * PAGE_SIZE, TOTAL_ITEMS))}</b> จากทั้งหมด{" "}
                  <b>{TOTAL_ITEMS}</b> รายการ
                </>
              )}
            </span>
            <div className="his-pages">
              <button
                type="button"
                aria-label="หน้าก่อนหน้า"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                ‹
              </button>
              {pageButtons.map((p, i) =>
                p === "..." ? (
                  <span key={`d${i}`} className="dots">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    className={p === page ? "active" : ""}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                type="button"
                aria-label="หน้าถัดไป"
                disabled={page === TOTAL_PAGES}
                onClick={() => setPage(page + 1)}
              >
                ›
              </button>
            </div>
          </div>
        </section>

        <section className="his-gov">
          <span className="his-gov-icon">⛨</span>
          <div className="his-gov-text">
            <strong>
              มาตรฐานการจัดเก็บข้อมูลประวัติงานพิธีการ (ARCHIVE GOVERNANCE & RETENTION)
            </strong>{" "}
            <span className="his-gov-tag">สำเนาถูกต้อง</span>
            <p>
              บันทึกประวัติและสำเนาใบเสร็จ/ภาพถ่ายพิธีการจะถูกจัดเก็บรักษาไว้ในระบบคลาวด์ความมั่นคงสูงไม่น้อยกว่า
              10 ปี ตามระเบียบมหาเถรสมาคม พร้อม Digital Timestamp ยืนยันความถูกต้อง
              ไม่สามารถแก้ไขหรือลบทำลายโดยพลการ
            </p>
          </div>
          <div className="his-gov-side">
            <div>
              <span>บันทึกล่าสุด</span>
              <b>14 ก.พ. 69 · 14:30 น.</b>
            </div>
            <div>
              <span>ตรวจสอบโดย</span>
              <b>ฝ่ายศาสนสมบัติ</b>
            </div>
          </div>
        </section>
      </div>

      <div className="his-blackbar" />
      <footer className="his-footer">
        <div className="his-footer-inner">
          <div>
            <strong>ระบบบริหารจัดการงานฌาปนกิจและศาสนสมบัติ (FOMS)</strong>
            <p>
              วัดศรีสุคต พระอารามหลวง เขตการปกครองคณะสงฆ์ภาคกลาง
              แขวง/ตำบลในเขตศาสนสมบัติ
            </p>
          </div>
          <div className="his-footer-item">
            <span className="his-dot">●</span> มาตรฐานกำกับดูแลและตรวจสอบทางศาสนกิจ พ.ศ. 2564
          </div>
          <div className="his-footer-item">
            ☎ สายด่วนฝ่ายประสานงานพิธีการ: 02-xxx-xxxx ต่อ 101
          </div>
          <div className="his-footer-item">
            © 2025 FOMS. สงวนลิขสิทธิ์ทั้งหมดโดยฝ่ายศาสนสมบัติ.
          </div>
        </div>
      </footer>

      {detail && (
        <div className="his-modal-bg" onMouseDown={() => setDetail(null)}>
          <div className="his-modal" onMouseDown={(e) => e.stopPropagation()}>
            <h2>
              {detail.status === "CANCELLED" ? "บันทึกการยกเลิก" : "รายละเอียดงานพิธี"}{" "}
              {detail.ref}
            </h2>
            <dl>
              <div>
                <dt>สถานะ</dt>
                <dd>{STATUS_LABEL[detail.status]}</dd>
              </div>
              <div>
                <dt>เจ้าภาพ</dt>
                <dd>
                  {detail.host} · {detail.hostPhone} ({detail.hostRelation})
                </dd>
              </div>
              <div>
                <dt>ผู้วายชนม์</dt>
                <dd>
                  {detail.deceased} · {detail.deceasedNote}
                </dd>
              </div>
              <div>
                <dt>ศาลา / สถานที่</dt>
                <dd>
                  {detail.hallFull} · {detail.venue}
                </dd>
              </div>
              <div>
                <dt>กำหนดการ</dt>
                <dd>
                  {detail.dateRange} · {detail.tag}
                </dd>
              </div>
              <div>
                <dt>แพ็กเกจ</dt>
                <dd>
                  {detail.pkg}
                  {detail.price ? ` · ${detail.price}` : ""}
                  {detail.pkgNote ? ` · ${detail.pkgNote}` : ""}
                </dd>
              </div>
              <div>
                <dt>วันที่จอง</dt>
                <dd>{detail.bookedAt.replace("จองเมื่อ ", "")}</dd>
              </div>
            </dl>
            <p className="his-modal-note">{EXPORT_NOTE}</p>
            <div className="his-modal-foot">
              <button type="button" className="his-btn dark" onClick={() => setDetail(null)}>
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="his-toast">{toast}</div>}
    </div>
  );
};
