import React, { useEffect, useMemo, useState } from "react";
import { StaffNav } from "./StaffNav";
import { AuthUser } from "../App";
import { StaffBooking, staffFetch, thaiDate, thaiRange, useTempleName } from "../staffApi";
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
  total: number; // ยอดสุทธิของงาน (บาท) ใช้คำนวณสถิติ
  deceased: string;
  deceasedNote: string;
  hall: string;
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

const PAGE_SIZE = 7;

// แปลงงานจาก API เป็นแถวประวัติ
// deceasedNote สรุปจำนวนคืนและแขกจากข้อมูลจองจริง
const PAID_LABEL: Record<string, string> = {
  PAID: "ชำระแล้ว",
  PARTIAL: "ชำระบางส่วน",
  SLIP_UPLOADED: "รอตรวจสลิป",
  UNPAID: "ยังไม่ชำระ",
};

const toRecord = (b: StaffBooking): HistoryRecord => ({
  ref: b.bookingRef,
  bookedAt: `จองเมื่อ ${thaiDate(b.submittedAt.slice(0, 10))}`,
  host: b.hostName,
  hostPhone: `โทร ${b.hostPhone || "-"}`,
  total: b.grandTotal,
  deceased: b.deceasedName,
  deceasedNote: `สวด ${b.nights} คืน · แขก ${b.guests} ท่าน`,
  hall: b.hallName.split(" (")[0],
  hallFull: b.hallName,
  venue: b.templeName,
  startISO: b.startISO,
  dateRange: thaiRange(b.startISO, b.cremationISO),
  tag: `${b.nights} คืน`,
  pkg: b.packageName,
  price: `฿${b.grandTotal.toLocaleString("th-TH")} (${PAID_LABEL[b.paymentStatus] || b.paymentStatus})`,
  pkgNote: b.rejectReason || b.cancelReason || "ยกเลิกคำขอ",
  status: b.status === "CANCELLED" ? "CANCELLED" : "COMPLETED",
});

const DEFAULT_FROM = ""; // ค่าเริ่มต้น = ทุกช่วงเวลา
const DEFAULT_TO = "";

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
  const templeName = useTempleName(currentUser?.name ?? "");
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

  useEffect(() => {
    staffFetch<StaffBooking[]>("/bookings?status=COMPLETED,CANCELLED&sort=desc")
      .then((rows) => setRecords(rows.map(toRecord)))
      .catch((err) => setError(err instanceof Error ? err.message : "โหลดประวัติไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, []);

  const hallOptions = useMemo(
    () => Array.from(new Set(records.map((r) => r.hallFull))).sort(),
    [records],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (dateFrom && r.startISO < dateFrom) return false;
      if (dateTo && r.startISO > dateTo) return false;
      if (hall !== "ALL" && r.hallFull !== hall) return false;
      if (status !== "ALL" && r.status !== status) return false;
      if (!q) return true;
      return [r.ref, r.host, r.deceased, r.hostPhone].some((v) =>
        v.toLowerCase().includes(q),
      );
    });
  }, [records, search, dateFrom, dateTo, hall, status]);

  const filtering =
    search.trim() !== "" ||
    hall !== "ALL" ||
    status !== "ALL" ||
    dateFrom !== DEFAULT_FROM ||
    dateTo !== DEFAULT_TO;
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const shown = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // สถิติบนการ์ด คำนวณจากงานทั้งหมดที่โหลดมา (ไม่ขึ้นกับตัวกรอง)
  const stats = useMemo(() => {
    const done = records.filter((r) => r.status === "COMPLETED");
    const cancelled = records.filter((r) => r.status === "CANCELLED");
    const pct = (n: number) => (records.length ? Math.round((n / records.length) * 1000) / 10 : 0);
    return {
      total: records.length,
      done: done.length,
      donePct: pct(done.length),
      cancelled: cancelled.length,
      cancelledPct: pct(cancelled.length),
      revenue: done.reduce((n, r) => n + r.total, 0),
    };
  }, [records]);

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

  const pageButtons: (number | "...")[] =
    totalPages <= 5
      ? Array.from({ length: totalPages }, (_, i) => i + 1)
      : [1, 2, 3, "...", totalPages];

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
              ตรวจดูรายละเอียดและเหตุผลของแต่ละรายการย้อนหลังได้
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
              {stats.total} <small>งาน</small>
            </div>
            <strong>งานพิธีทั้งหมดในประวัติ</strong>
            <div className="his-stat-foot">
              <span>เสร็จสิ้นและยกเลิกรวมกัน</span>
              <em>ทุกช่วงเวลา</em>
            </div>
          </div>
          <div className="his-stat">
            <div className="his-stat-top">
              <span>02 · COMPLETED</span>
              <i>✓</i>
            </div>
            <div className="his-stat-value">
              {stats.done} <small>งาน</small>
            </div>
            <strong>พิธีการเสร็จสมบูรณ์</strong>
            <div className="his-stat-foot">
              <span>{stats.donePct}% ของงานในประวัติ</span>
              <em>ปิดงานแล้ว</em>
            </div>
          </div>
          <div className="his-stat">
            <div className="his-stat-top">
              <span>03 · RELEASED</span>
              <i>▦</i>
            </div>
            <div className="his-stat-value">
              {stats.cancelled} <small>คำขอ</small>
            </div>
            <strong>คำขอยกเลิก / ถูกปฏิเสธ</strong>
            <div className="his-stat-foot">
              <span>คืนคิวศาลาให้งานอื่นแล้ว</span>
              <span>{stats.cancelledPct}%</span>
            </div>
          </div>
          <div className="his-stat">
            <div className="his-stat-top">
              <span>04 · TOTAL VALUE</span>
              <i>฿</i>
            </div>
            <div className="his-stat-value">฿{stats.revenue.toLocaleString("th-TH")}</div>
            <strong>ยอดรวมของงานที่เสร็จสิ้น</strong>
            <div className="his-stat-foot">
              <span>ยอดสุทธิตามใบจอง (ไม่รวมงานที่ยกเลิก)</span>
              <em>คำนวณจากข้อมูลจริง</em>
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
            {hallOptions.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
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
                          {r.hostPhone}
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
                      {loading
                        ? "กำลังโหลดประวัติ..."
                        : error ||
                          (filtering
                            ? "ไม่พบรายการที่ตรงกับเงื่อนไข"
                            : "ยังไม่มีงานที่เสร็จสิ้นหรือยกเลิก")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="his-pager">
            <span>
              {visible.length === 0 ? (
                <>ไม่มีรายการ</>
              ) : (
                <>
                  แสดง <b>{(currentPage - 1) * PAGE_SIZE + 1}</b> ถึง{" "}
                  <b>{Math.min(currentPage * PAGE_SIZE, visible.length)}</b> จากทั้งหมด{" "}
                  <b>{visible.length}</b> รายการ
                </>
              )}
            </span>
            <div className="his-pages">
              <button
                type="button"
                aria-label="หน้าก่อนหน้า"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
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
                    className={p === currentPage ? "active" : ""}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                type="button"
                aria-label="หน้าถัดไป"
                disabled={currentPage === totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                ›
              </button>
            </div>
          </div>
        </section>

        <section className="his-gov">
          <span className="his-gov-icon">⛨</span>
          <div className="his-gov-text">
            <strong>ข้อมูลประวัติงานพิธีการ</strong>{" "}
            <span className="his-gov-tag">ดึงจากฐานข้อมูลของระบบ</span>
            <p>
              รายการในหน้านี้คืองานที่ทีมจัดงานปิดงานแล้วหรืองานที่ถูกยกเลิก/ปฏิเสธ
              งานที่อยู่ในสถานะเหล่านี้ไม่สามารถเปลี่ยนสถานะย้อนกลับผ่านระบบได้
            </p>
          </div>
        </section>
      </div>

      <div className="his-blackbar" />
      <footer className="his-footer">
        <div className="his-footer-inner">
          <div>
            <strong>ระบบบริหารจัดการงานฌาปนกิจและศาสนสมบัติ (FOMS)</strong>
            <p>{templeName}</p>
          </div>
          <div className="his-footer-item">
            <span className="his-dot">●</span> การคุ้มครองข้อมูล (PDPA Compliant)
          </div>
          <div className="his-footer-item">
            © 2025 FOMS. สงวนลิขสิทธิ์ทั้งหมด.
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
                  {detail.host} · {detail.hostPhone}
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
