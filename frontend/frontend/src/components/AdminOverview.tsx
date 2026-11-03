import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ACTION_LABEL,
  BOOKING_STATUS_LABEL,
  ENTITY_LABEL,
  Overview,
  ROLE_LABEL,
  Role,
  adminFetch,
  baht,
  errMsg,
  fmtDate,
  fmtDateTime,
} from "../adminApi";
import { IconRefresh, Svg } from "./AdminUi";

const STATUS_ORDER = [
  "PENDING",
  "CONFIRMED",
  "PAID",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

// สีของแต่ละสถานะในกราฟโดนัท (ความหมายต้องอ่านจากป้ายกำกับในคำอธิบายกราฟด้วย ไม่พึ่งสีอย่างเดียว)
const STATUS_COLOR: Record<string, string> = {
  PENDING: "#c9a24a",
  CONFIRMED: "#7a5a1c",
  PAID: "#3f6b4f",
  IN_PROGRESS: "#4a6a8a",
  COMPLETED: "#1b1b1b",
  CANCELLED: "#b04a4a",
};

const ROLE_ORDER: Role[] = ["ADMIN", "STAFF", "OPS", "HOST"];

const IconDownload = () => (
  <Svg>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m7 10 5 5 5-5" />
    <path d="M12 15V3" />
  </Svg>
);
const IconPrinter = () => (
  <Svg>
    <path d="M6 9V2h12v7" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </Svg>
);
const IconChevron = () => (
  <Svg size={14}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

const pct = (n: number, d: number) =>
  d > 0 ? Math.round((n / d) * 1000) / 10 : 0;

const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  const mon = new Intl.DateTimeFormat("th-TH", {
    timeZone: "UTC",
    month: "short",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
  return `${mon} ${String((y + 543) % 100).padStart(2, "0")}`;
};

const compactBaht = (n: number) =>
  n >= 1_000_000
    ? `฿${(n / 1_000_000).toFixed(1)}M`
    : n >= 1000
      ? `฿${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}K`
      : `฿${Math.round(n)}`;

/* ---------------- ส่งออก CSV ---------------- */

// ป้องกัน CSV/Formula injection: ข้อความที่ขึ้นต้นด้วย = + - @ จะถูกนำหน้าด้วย ' ก่อน
// (ชื่อเจ้าภาพ/ผู้วายชนม์เป็นข้อมูลที่ผู้ใช้กรอกเอง)
const csvCell = (v: string | number | null | undefined) => {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return String(v);
  const s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function buildOverviewCsv(d: Overview, generatedAt: Date): string {
  const rows: (string | number)[][] = [];
  const section = (title: string) => {
    if (rows.length) rows.push([]);
    rows.push([title]);
  };
  const total = d.bookings.total;

  rows.push(["รายงานภาพรวมระบบ FOMS"]);
  rows.push(["สร้างเมื่อ", fmtDateTime(generatedAt.toISOString())]);

  section("สรุปตัวชี้วัดหลัก");
  rows.push(["รายการ", "ค่า"]);
  rows.push(["ผู้ใช้ทั้งหมด", d.users.total]);
  rows.push(["ผู้ใช้ที่ใช้งานอยู่", d.users.active]);
  rows.push(["งานจองทั้งหมด", total]);
  rows.push(["รายได้ที่ยืนยันแล้ว (บาท)", Math.round(d.revenue.approved)]);
  rows.push(["สลิปรอตรวจ (รายการ)", d.revenue.pendingSlips]);
  rows.push(["วัดที่เปิดใช้", d.temples.active]);
  rows.push(["ศาลา/เมรุทั้งหมด", d.temples.halls]);
  rows.push(["ศาลา/เมรุที่เปิดใช้", d.temples.hallsActive]);

  section("งานจองแยกตามสถานะ");
  rows.push(["สถานะ", "จำนวน", "สัดส่วน (%)"]);
  STATUS_ORDER.forEach((s) => {
    const n = d.bookings.byStatus[s] || 0;
    rows.push([BOOKING_STATUS_LABEL[s], n, pct(n, total)]);
  });

  section("ผู้ใช้แยกตามบทบาท");
  rows.push(["บทบาท", "จำนวน"]);
  ROLE_ORDER.forEach((r) => rows.push([ROLE_LABEL[r], d.users.byRole[r] || 0]));

  if (d.monthly && d.monthly.length > 0) {
    section("มูลค่างานจองรายเดือน (ไม่รวมที่ยกเลิก)");
    rows.push(["เดือน", "จำนวนงาน", "มูลค่ารวม (บาท)"]);
    d.monthly.forEach((m) =>
      rows.push([m.month, m.bookings, Math.round(m.amount)]),
    );
  }

  section("งานจองล่าสุด");
  rows.push([
    "รหัส",
    "เจ้าภาพ",
    "ผู้วายชนม์",
    "วัด",
    "ศาลา",
    "วันเริ่ม",
    "จำนวนคืน",
    "ยอดรวม (บาท)",
    "สถานะ",
  ]);
  d.recentBookings.forEach((b) =>
    rows.push([
      b.bookingRef,
      b.hostName,
      b.deceasedName,
      b.templeName,
      b.hallName,
      (b.startDate || "").slice(0, 10),
      b.nights,
      Math.round(b.pricing.grandTotal),
      BOOKING_STATUS_LABEL[b.status] || b.status,
    ]),
  );

  // BOM ให้ Excel อ่านภาษาไทยได้ถูกต้อง
  return "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

function downloadCsv(csv: string, generatedAt: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${generatedAt.getFullYear()}${p(generatedAt.getMonth() + 1)}${p(generatedAt.getDate())}-${p(generatedAt.getHours())}${p(generatedAt.getMinutes())}`;
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `foms-overview-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ---------------- หน้าภาพรวม ---------------- */

export const AdminOverview: React.FC<{
  onOpenAudit: () => void;
  flash?: (msg: string, error?: boolean) => void;
}> = ({ onOpenAudit, flash }) => {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await adminFetch<Overview>("/overview"));
      setLoadedAt(new Date());
    } catch (err) {
      setError(errMsg(err, "โหลดภาพรวมระบบไม่สำเร็จ"));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  // ปิดเมนูส่งออกเมื่อคลิกข้างนอกหรือกด Esc
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  if (error) return <div className="adm-placeholder">{error}</div>;
  if (!data)
    return (
      <div className="adm-placeholder">
        {loading ? "กำลังโหลดภาพรวมระบบ..." : "ไม่มีข้อมูล"}
      </div>
    );

  const generatedAt = loadedAt ?? new Date();
  const total = data.bookings.total;
  const byStatus = data.bookings.byStatus;
  const pending = byStatus.PENDING || 0;
  const pendingSlips = data.revenue.pendingSlips;

  const exportCsv = () => {
    setMenuOpen(false);
    downloadCsv(buildOverviewCsv(data, generatedAt), generatedAt);
    flash?.("ส่งออกรายงานเป็นไฟล์ CSV แล้ว");
  };
  const printReport = () => {
    setMenuOpen(false);
    window.print();
  };

  // โดนัทสถานะงานจอง
  const R = 54;
  const C = 2 * Math.PI * R;
  const statusRows = STATUS_ORDER.map((s) => ({
    key: s,
    label: BOOKING_STATUS_LABEL[s],
    n: byStatus[s] || 0,
  }));
  const known = statusRows.reduce((a, r) => a + r.n, 0);
  let acc = 0;
  const segments = statusRows
    .filter((r) => r.n > 0)
    .map((r) => {
      const len = (r.n / known) * C;
      const seg = { ...r, len, off: acc };
      acc += len;
      return seg;
    });

  // ตัวชี้วัดสัดส่วน
  const indicators = [
    {
      label: "อัตรางานเสร็จสิ้น",
      value: pct(byStatus.COMPLETED || 0, total),
      sub: `${byStatus.COMPLETED || 0} จาก ${total} งาน`,
    },
    {
      label: "อัตราการยกเลิก",
      value: pct(byStatus.CANCELLED || 0, total),
      sub: `${byStatus.CANCELLED || 0} จาก ${total} งาน`,
      warn: true,
    },
    {
      label: "ศาลา/เมรุที่เปิดใช้",
      value: pct(data.temples.hallsActive, data.temples.halls),
      sub: `${data.temples.hallsActive} จาก ${data.temples.halls} แห่ง`,
    },
    {
      label: "บัญชีที่ใช้งานอยู่",
      value: pct(data.users.active, data.users.total),
      sub: `${data.users.active} จาก ${data.users.total} บัญชี`,
    },
  ];

  const monthly = data.monthly ?? [];
  const maxAmount = Math.max(1, ...monthly.map((m) => m.amount));
  const maxRole = Math.max(1, ...Object.values(data.users.byRole));

  return (
    <section className="adm-ov">
      {/* หัวรายงานเฉพาะตอนพิมพ์ / บันทึก PDF */}
      <div className="adm-print-head">
        <h2>รายงานภาพรวมระบบ FOMS</h2>
        <p>สร้างเมื่อ {fmtDateTime(generatedAt.toISOString())}</p>
      </div>

      <div className="adm-ov-head">
        <div>
          <h1>ภาพรวมระบบ</h1>
          <p>สรุปสถานะผู้ใช้ งานจอง รายได้ และการเปลี่ยนแปลงล่าสุดของระบบ</p>
          <p className="adm-ov-asof">
            ข้อมูล ณ {fmtDateTime(generatedAt.toISOString())}
          </p>
        </div>
        <div className="adm-ov-actions adm-noprint">
          <button
            className="adm-refresh"
            onClick={load}
            title="โหลดใหม่"
            aria-label="โหลดใหม่"
            disabled={loading}
          >
            <IconRefresh />
          </button>
          <div className="adm-menu" ref={menuRef}>
            <button
              type="button"
              className="adm-btn-export"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <IconDownload />
              ส่งออกรายงาน
              <IconChevron />
            </button>
            {menuOpen && (
              <div className="adm-menu-list" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className="adm-menu-item"
                  onClick={exportCsv}
                >
                  <IconDownload />
                  <span>
                    <b>ดาวน์โหลดไฟล์ CSV</b>
                    <small>เปิดใน Excel ได้ ภาษาไทยไม่เพี้ยน</small>
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="adm-menu-item"
                  onClick={printReport}
                >
                  <IconPrinter />
                  <span>
                    <b>พิมพ์ / บันทึกเป็น PDF</b>
                    <small>เลือก “บันทึกเป็น PDF” ในหน้าต่างพิมพ์</small>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {(pending > 0 || pendingSlips > 0) && (
        <div className="adm-ov-alert" role="status">
          <strong>รอดำเนินการ</strong>
          <span>
            {pending > 0 && <>งานจองรออนุมัติ {pending} งาน</>}
            {pending > 0 && pendingSlips > 0 && " · "}
            {pendingSlips > 0 && <>สลิปรอตรวจ {pendingSlips} รายการ</>}
          </span>
        </div>
      )}

      <div className="adm-cards">
        <div className="adm-kpi">
          <small>ผู้ใช้ทั้งหมด</small>
          <b>{data.users.total}</b>
          <em>ใช้งานอยู่ {data.users.active} บัญชี</em>
        </div>
        <div className="adm-kpi">
          <small>งานจองทั้งหมด</small>
          <b>{total}</b>
          <em>รออนุมัติ {pending} งาน</em>
        </div>
        <div className="adm-kpi">
          <small>รายได้ที่ยืนยันแล้ว</small>
          <b>{baht(data.revenue.approved)}</b>
          <em>สลิปรอตรวจ {pendingSlips} รายการ</em>
        </div>
        <div className="adm-kpi">
          <small>วัดและศาลา</small>
          <b>
            {data.temples.active} <span>วัด</span>
          </b>
          <em>
            ศาลา/เมรุเปิดใช้ {data.temples.hallsActive} จาก {data.temples.halls}
          </em>
        </div>
      </div>

      <div className="adm-ov-grid">
        <div className="adm-card">
          <h3>สัดส่วนงานจองตามสถานะ</h3>
          <div className="adm-donut-wrap">
            <svg
              className="adm-donut"
              viewBox="0 0 140 140"
              role="img"
              aria-label={`งานจองทั้งหมด ${total} งาน แยกตามสถานะตามรายการด้านข้าง`}
            >
              <circle
                cx="70"
                cy="70"
                r={R}
                fill="none"
                stroke="#efeeea"
                strokeWidth="18"
              />
              {segments.map((sg) => (
                <circle
                  key={sg.key}
                  cx="70"
                  cy="70"
                  r={R}
                  fill="none"
                  stroke={STATUS_COLOR[sg.key]}
                  strokeWidth="18"
                  strokeDasharray={`${sg.len} ${C - sg.len}`}
                  strokeDashoffset={-sg.off}
                  transform="rotate(-90 70 70)"
                />
              ))}
              <text x="70" y="68" textAnchor="middle" className="adm-donut-n">
                {total}
              </text>
              <text x="70" y="86" textAnchor="middle" className="adm-donut-l">
                งานจอง
              </text>
            </svg>
            <ul className="adm-legend">
              {statusRows.map((r) => (
                <li key={r.key}>
                  <i style={{ background: STATUS_COLOR[r.key] }} />
                  <span>{r.label}</span>
                  <b>{r.n}</b>
                  <em>{pct(r.n, total)}%</em>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="adm-card">
          <h3>ตัวชี้วัดสำคัญ</h3>
          <div className="adm-meters">
            {indicators.map((m) => (
              <div
                key={m.label}
                className={`adm-meter ${m.warn ? "warn" : ""}`}
              >
                <div className="adm-meter-head">
                  <span>{m.label}</span>
                  <b>{m.value}%</b>
                </div>
                <div
                  className="adm-bar"
                  role="progressbar"
                  aria-valuenow={m.value}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={m.label}
                >
                  <i style={{ width: `${m.value}%` }} />
                </div>
                <small>{m.sub}</small>
              </div>
            ))}
          </div>
        </div>
      </div>

      {monthly.length > 0 && (
        <div className="adm-card">
          <h3>มูลค่างานจองรายเดือน</h3>
          <p className="adm-card-sub">
            6 เดือนล่าสุด ไม่รวมงานที่ยกเลิก (ยอดรวมประเมินของงานจอง
            ไม่ใช่รายได้ที่รับชำระแล้ว)
          </p>
          <div className="adm-trend">
            {monthly.map((m) => (
              <div className="adm-trend-col" key={m.month}>
                <span className="adm-trend-val" title={baht(m.amount)}>
                  {m.amount > 0 ? compactBaht(m.amount) : "—"}
                </span>
                <div className="adm-trend-plot">
                  <div
                    className={`adm-trend-bar ${m.amount > 0 ? "" : "zero"}`}
                    style={{ height: `${(m.amount / maxAmount) * 100}%` }}
                    title={`${monthLabel(m.month)}: ${baht(m.amount)} (${m.bookings} งาน)`}
                  />
                </div>
                <span className="adm-trend-month">{monthLabel(m.month)}</span>
                <span className="adm-trend-count">{m.bookings} งาน</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="adm-ov-grid">
        <div className="adm-card">
          <h3>ผู้ใช้แยกตามบทบาท</h3>
          <div className="adm-bars">
            {ROLE_ORDER.map((r) => {
              const n = data.users.byRole[r] || 0;
              return (
                <div key={r} className="adm-bar-row">
                  <span>{ROLE_LABEL[r]}</span>
                  <div className="adm-bar">
                    <i style={{ width: `${(n / maxRole) * 100}%` }} />
                  </div>
                  <b>{n}</b>
                </div>
              );
            })}
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card-head">
            <h3>การเปลี่ยนแปลงล่าสุดของระบบ</h3>
            <button className="link adm-noprint" onClick={onOpenAudit}>
              ดูทั้งหมด →
            </button>
          </div>
          <ul className="adm-feed">
            {data.recentAudit.map((a) => (
              <li key={a._id}>
                <time>{fmtDateTime(a.createdAt)}</time>
                <span>
                  <b>{a.actorName || "ระบบ"}</b> ·{" "}
                  {ACTION_LABEL[a.action] || a.action}{" "}
                  {ENTITY_LABEL[a.entity] || a.entity}: {a.summary}
                </span>
              </li>
            ))}
            {data.recentAudit.length === 0 && (
              <li className="empty">ยังไม่มีบันทึกการเปลี่ยนแปลง</li>
            )}
          </ul>
        </div>
      </div>

      <div className="adm-card">
        <h3>งานจองล่าสุด</h3>
        <table className="adm-table plain">
          <thead>
            <tr>
              <th>รหัส</th>
              <th>เจ้าภาพ / ผู้วายชนม์</th>
              <th>วัด / ศาลา</th>
              <th>วันเริ่ม</th>
              <th className="r">ยอดรวม</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {data.recentBookings.map((b) => (
              <tr key={b._id}>
                <td className="code">{b.bookingRef}</td>
                <td>
                  <b>{b.hostName}</b>
                  <div className="desc">{b.deceasedName}</div>
                </td>
                <td>
                  {b.templeName}
                  <div className="desc">{b.hallName}</div>
                </td>
                <td>
                  {fmtDate(b.startDate)} ({b.nights} คืน)
                </td>
                <td className="r">{baht(b.pricing.grandTotal)}</td>
                <td>{BOOKING_STATUS_LABEL[b.status] || b.status}</td>
              </tr>
            ))}
            {data.recentBookings.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  ยังไม่มีงานจอง
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
