import React, { useEffect, useMemo, useState } from "react";
import { StaffNav } from "./StaffNav";
import { AuthUser } from "../App";
import { staffFetch, thaiDate } from "../staffApi";
import "./TempleStaffCalendar.css";

interface TempleStaffCalendarProps {
  currentUser?: AuthUser | null;
  onNavigateHome?: () => void;
  onNavigateApprovals?: () => void;
  onNavigateInventory?: () => void;
  onNavigateHistory?: () => void;
  onLogout?: () => void;
}

type HallKey = string; // ชื่อศาลาแบบสั้น เช่น "ศาลา 1" (ตัดวงเล็บท้ายชื่อจาก DB)
type HallFilter = "ALL" | HallKey;

interface ScheduleItem {
  date?: string; // YYYY-MM-DD ของวันที่จัดพิธี
  time: string;
  title: string;
  desc: string;
}

interface CalEvent {
  id: string;
  ref: string;
  hall: HallKey;
  hallFull: string;
  place: string; // ขนาด/ความจุ
  start: string; // วันแรกที่ใช้พื้นที่ YYYY-MM-DD
  end: string; // วันสุดท้าย
  cremationISO?: string;
  cremationTime?: string;
  deceased: string;
  deceasedNote: string;
  host: string;
  hostNote: string;
  schedule: ScheduleItem[];
  monkTime?: string; // เวลาสวดพระอภิธรรมประจำคืน
  monks: (string | null)[]; // id พระสงฆ์ในคณะ null = ยังว่าง
  note?: string;
}

// ข้อมูลตัวอย่างสำหรับขึ้นหน้าจอ รอเชื่อม API ปฏิทินของเจ้าหน้าที่วัด
const MONKS: Record<string, { name: string; detail: string }> = {
  m1: {
    name: "พระครูสิทธิสุตมนศีลคุณ",
    detail: "ประธานสงฆ์ · ผู้ช่วยเจ้าอาวาส",
  },
  m2: { name: "พระมหาธีรพัฒน์ ญาณโร", detail: "พระอันดับ ๒ · กฎี ๓" },
  m3: { name: "พระสมุห์ชิต ฐิตเมโธ", detail: "พระอันดับ ๓ · กฎี ๔" },
  m4: { name: "พระมหาอานนท์ กนฺตสีโล", detail: "พระอันดับ (ป.ธ.๔) · กฎี ๕" },
  m5: { name: "พระปลัดธนเมธ ฐิตญาโณ", detail: "กฎี ๑ (พร้อม)" },
  m6: { name: "พระสุวรรณ โอติปญฺโญ", detail: "กฎี ๒ (พร้อม)" },
  m7: { name: "พระสมคิด ฉินฺทกนฺโต", detail: "กฎี ๓ (พร้อม)" },
  m8: { name: "พระอนุชิต สุเมโธ", detail: "กฎี ๖ (พร้อม)" },
  m9: { name: "พระวิชัย อนาลโย", detail: "กฎี ๗ (พร้อม)" },
  m10: { name: "พระมหากฤษณ์ วรปญฺโญ", detail: "เปรียญธรรม ๙ ประโยค" },
  m11: { name: "พระมหาชวินทร์ ปญฺญาวชิโร", detail: "เปรียญธรรม ๗ ประโยค" },
  m12: {
    name: "พระสมุห์กิตติศักดิ์ ฐานาภรโณ",
    detail: "ฐานานุกรมเจ้าคณะอำเภอ",
  },
  m13: { name: "พระภิกษุเอกภูมิ ญาณรสโม", detail: "พระธรรมกถึกประจำคืน" },
};

// พระสงฆ์ที่ยังไม่ได้จัดเวร ใช้เป็นตัวสำรองตอนเปลี่ยนตัว
const SPARE_POOL = ["m8", "m9"];

// งานที่ backend ส่งมา (GET /api/staff/calendar)
interface ApiCalEvent {
  id: string;
  ref: string;
  hallName: string;
  hallCapacity: number;
  start: string;
  end: string;
  cremationISO: string;
  deceasedName: string;
  hostName: string;
  hostPhone: string;
  guests: number;
  packageName: string;
  addons: string[];
  schedule: { date: string; time: string; type: string; title: string }[];
}

// หมายเหตุ: ระบบยังไม่เก็บคิวพระสงฆ์ต่อคืน จึงส่ง monks เป็นว่าง (ส่วนจัดพระยังเป็นหน้าจอจำลอง)
const toCalEvent = (e: ApiCalEvent): CalEvent => ({
  id: e.id,
  ref: e.ref,
  hall: e.hallName.split(" (")[0],
  hallFull: e.hallName,
  place: e.hallCapacity ? `ความจุ ${e.hallCapacity} ที่นั่ง` : "",
  start: e.start,
  end: e.end,
  cremationISO: e.cremationISO,
  deceased: e.deceasedName,
  deceasedNote: `${e.packageName} · ฌาปนกิจ ${thaiDate(e.cremationISO)}`,
  host: e.hostName,
  hostNote: `โทร ${e.hostPhone || "-"} (แขกประมาณ ${e.guests} ท่าน)`,
  schedule: e.schedule.map((s) => ({
    date: s.date,
    time: s.time ? `${s.time} น.` : "",
    title: s.title,
    desc: thaiDate(s.date),
  })),
  monks: [],
  note: e.addons.length ? `บริการเสริม: ${e.addons.join(" · ")}` : undefined,
});

const TH_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];
const TH_DAYS_SHORT = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const TH_DAYS_FULL = [
  "วันอาทิตย์",
  "วันจันทร์",
  "วันอังคาร",
  "วันพุธ",
  "วันพฤหัสบดี",
  "วันศุกร์",
  "วันเสาร์",
];

const thDigits = (v: number | string) =>
  String(v).replace(/\d/g, (d) => "๐๑๒๓๔๕๖๗๘๙"[Number(d)]);
const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (y: number, m: number, d: number) =>
  `${y}-${pad(m + 1)}-${pad(d)}`;
const dayDiff = (a: string, b: string) =>
  Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
const parseISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m: m - 1, d };
};

const isActiveOn = (e: CalEvent, iso: string) =>
  (iso >= e.start && iso <= e.end) || iso === e.cremationISO;

export const TempleStaffCalendar: React.FC<TempleStaffCalendarProps> = ({
  currentUser,
  onNavigateHome,
  onNavigateApprovals,
  onNavigateInventory,
  onNavigateHistory,
  onLogout,
}) => {
  const todayISO = useMemo(
    () =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
    [],
  );
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loadError, setLoadError] = useState("");
  const [selected, setSelected] = useState(todayISO);
  const [month, setMonth] = useState(() => {
    const [y, m] = todayISO.split("-").map(Number);
    return { y, m: m - 1 };
  });
  const [hallFilter, setHallFilter] = useState<HallFilter>("ALL");
  const [showSpare, setShowSpare] = useState(false);
  const [toast, setToast] = useState("");

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 3500);
  };

  // โหลดงานของเดือนที่เปิดอยู่ทุกครั้งที่เปลี่ยนเดือน
  useEffect(() => {
    let cancelled = false;
    setLoadError("");
    staffFetch<ApiCalEvent[]>(`/calendar?month=${month.y}-${pad(month.m + 1)}`)
      .then((rows) => !cancelled && setEvents(rows.map(toCalEvent)))
      .catch((err) => {
        if (cancelled) return;
        setEvents([]);
        setLoadError(err instanceof Error ? err.message : "โหลดปฏิทินไม่สำเร็จ");
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  // ชื่อศาลาที่มีงานในเดือนนี้ ใช้ทำปุ่มกรองและการ์ดสรุป
  const hallNames = useMemo(
    () => Array.from(new Set(events.map((e) => e.hall))).sort(),
    [events],
  );
  const HALL_FILTERS: HallFilter[] = ["ALL", ...hallNames];

  const dayEvents = useMemo(
    () =>
      events
        .filter((e) => isActiveOn(e, selected))
        .filter((e) => hallFilter === "ALL" || e.hall === hallFilter),
    [events, selected, hallFilter],
  );

  // หาพระสงฆ์ที่ถูกจัดเวลาเดียวกันในหลายงานของวันที่เลือก
  const conflicts = useMemo(() => {
    const seen = new Map<string, CalEvent[]>();
    events
      .filter((e) => isActiveOn(e, selected) && e.monkTime)
      .forEach((e) =>
        e.monks.forEach((id) => {
          if (!id) return;
          const key = `${id}@${e.monkTime}`;
          seen.set(key, [...(seen.get(key) ?? []), e]);
        }),
      );
    return Array.from(seen.entries())
      .filter(([, list]) => list.length > 1)
      .map(([key, list]) => ({
        monkId: key.split("@")[0],
        time: key.split("@")[1],
        events: list,
      }));
  }, [events, selected]);

  const conflictKey = (eventId: string, monkId: string | null) =>
    monkId !== null &&
    conflicts.some(
      (c) => c.monkId === monkId && c.events.some((e) => e.id === eventId),
    );

  // พระสงฆ์สำรองที่ว่างในวัน/เวลาที่เลือก
  const freeSpares = useMemo(() => {
    const busy = new Set(
      events
        .filter((e) => isActiveOn(e, selected))
        .flatMap((e) => e.monks.filter((m): m is string => m !== null)),
    );
    return SPARE_POOL.filter((id) => !busy.has(id));
  }, [events, selected]);

  const assignSpare = (eventId: string, slot: number) => {
    const spare = freeSpares[0];
    if (!spare) {
      flash("ไม่มีพระสงฆ์สำรองว่างในวันนี้");
      return;
    }
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, monks: e.monks.map((m, i) => (i === slot ? spare : m)) }
          : e,
      ),
    );
    flash(
      `จัด ${MONKS[spare].name} แทนเรียบร้อย (ข้อมูลจำลอง ยังไม่บันทึกลงระบบ)`,
    );
  };

  const reassignAll = () => {
    // เปลี่ยนตัวในงานที่ซ้อนทุกคู่ ยกเว้นงานแรกของแต่ละคู่
    let done = 0;
    conflicts.forEach((c) => {
      const target = c.events[c.events.length - 1];
      const slot = target.monks.indexOf(c.monkId);
      if (slot >= 0 && freeSpares[done]) {
        const spare = freeSpares[done];
        setEvents((prev) =>
          prev.map((e) =>
            e.id === target.id
              ? { ...e, monks: e.monks.map((m, i) => (i === slot ? spare : m)) }
              : e,
          ),
        );
        done += 1;
      }
    });
    flash(
      done > 0
        ? `เปลี่ยนพระสงฆ์ทดแทน ${done} รูปแล้ว (ข้อมูลจำลอง)`
        : "ไม่มีพระสงฆ์สำรองว่างให้เปลี่ยน",
    );
  };

  // ปฏิทิน
  const first = new Date(month.y, month.m, 1).getDay();
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(first).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const dayInfo = (d: number) => {
    const iso = toISO(month.y, month.m, d);
    const list = events.filter(
      (e) =>
        isActiveOn(e, iso) && (hallFilter === "ALL" || e.hall === hallFilter),
    );
    return { iso, list };
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(month.y, month.m + delta, 1);
    setMonth({ y: d.getFullYear(), m: d.getMonth() });
  };

  const monthEvents = events.filter((e) => {
    const from = toISO(month.y, month.m, 1);
    const to = toISO(month.y, month.m, daysInMonth);
    return e.start <= to && e.end >= from;
  });
  // สรุปประจำเดือน คำนวณจากงานจริง: นับจำนวนคืนที่ใช้ศาลาในเดือนนี้ ศาลาที่ใช้หนาแน่นสุด และจำนวนพิธีฌาปนกิจ
  const monthFrom = toISO(month.y, month.m, 1);
  const monthTo = toISO(month.y, month.m, daysInMonth);
  const hallNights = new Map<string, number>();
  monthEvents.forEach((e) => {
    for (let d = e.start; d <= e.end; d = new Date(Date.parse(d) + 86400000).toISOString().slice(0, 10)) {
      if (d >= monthFrom && d <= monthTo) hallNights.set(e.hall, (hallNights.get(e.hall) || 0) + 1);
    }
  });
  const nightsUsed = [...hallNights.values()].reduce((n, v) => n + v, 0);
  const busiest = [...hallNights.entries()].sort((a, b) => b[1] - a[1])[0];
  const cremationsInMonth = monthEvents.filter((e) => e.cremationISO && e.cremationISO >= monthFrom && e.cremationISO <= monthTo).length;
  const dotCount = cells.filter(
    (d) => d !== null && dayInfo(d).list.length > 0,
  ).length;

  const sel = parseISO(selected);
  const selDate = new Date(sel.y, sel.m, sel.d);
  const selTitle = `${TH_DAYS_FULL[selDate.getDay()]}ที่ ${sel.d} ${TH_MONTHS[sel.m]} ${sel.y + 543}`;

  // การ์ดสรุปด้านบน (คำนวณจากวันที่เลือก)
  const activeAll = events.filter((e) => isActiveOn(e, selected));
  const hallsOpen = hallNames.filter((h) =>
    activeAll.some((e) => e.hall === h),
  ).length;
  const monkSet = new Set(
    activeAll.flatMap((e) => e.monks.filter((m): m is string => m !== null)),
  );
  const monkGroups = activeAll.filter((e) => e.monks.length > 0).length;
  const cremationToday = activeAll.filter((e) => e.cremationISO === selected);

  const nightLabel = (e: CalEvent) => {
    if (e.hall === "เมรุหลวง") return "พิธีฌาปนกิจ";
    if (selected === e.cremationISO) return "วันฌาปนกิจ";
    const n = dayDiff(e.start, selected) + 1;
    const total = dayDiff(e.start, e.end) + 1;
    if (n === total) return "สวดพระอภิธรรม คืนสุดท้าย";
    return `พิธีสวด คืนที่ ${thDigits(n)}`;
  };

  return (
    <div className="cal-wrapper">
      <StaffNav
        active="calendar"
        userName={currentUser?.name}
        onNavigateHome={onNavigateHome}
        onNavigateApprovals={onNavigateApprovals}
        onNavigateInventory={onNavigateInventory}
        onNavigateHistory={onNavigateHistory}
        onLogout={onLogout}
      />

      <div className="cal-topbar">
        <div className="cal-breadcrumb">
          <span className="cal-link" onClick={onNavigateHome}>
            หน้าหลัก
          </span>
          {" / "}
          <span>เจ้าหน้าที่วัด</span>
          {" / "}
          <strong>ตารางพระสงฆ์</strong>
        </div>
        <div className="cal-topbar-meta">
          <span>● เวลาส่วนกลาง: 10:45 น. (เขตเวลาสยาม)</span>
          <span>ปรับปรุงล่าสุด: วันนี้ 10:30 น. โดย นายสุรเชษฐ์</span>
        </div>
      </div>

      <header className="cal-header">
        <span className="cal-pretitle">
          TEMPLE OPERATIONS & LITURGICAL CALENDAR · วัดศรีสุคต พระอารามหลวง
        </span>
        <div className="cal-title-row">
          <div>
            <h1 className="cal-title">ตารางการใช้งานศาลาและคิวพระสงฆ์</h1>
            <p className="cal-subtitle">
              ตรวจสอบตารางการจัดพิธีสวดพระอภิธรรม คิวศาลา เมรุฌาปนกิจ
              และระบบจัดสรรพระสงฆ์ตามสมณศักดิ์เพื่อความถูกต้องและสมเกียรติสูงสุด
            </p>
          </div>
          <div className="cal-actions">
            <div className="cal-date-box">
              {selTitle}
              {selected === todayISO ? " (วันนี้)" : ""}
            </div>
            <button
              className="cal-btn"
              type="button"
              onClick={() => window.print()}
            >
              ส่งออกตาราง (PDF)
            </button>
            <button
              className="cal-btn dark"
              type="button"
              onClick={() =>
                flash(
                  "ส่งคำขอนิมนต์พระสงฆ์ด่วนแล้ว (ข้อมูลจำลอง ยังไม่เชื่อมระบบ)",
                )
              }
            >
              นิมนต์พระสงฆ์ด่วน
            </button>
          </div>
        </div>
      </header>

      <section className="cal-stats">
        <div className="cal-stat">
          <span className="cal-stat-label">ศาลาเปิดงานนี้</span>
          <div className="cal-stat-value">
            {hallsOpen}{" "}
            <small>
              / {hallNames.length} หลัง{" "}
              {hallNames.length > 0 && hallsOpen === hallNames.length ? "(เต็ม)" : ""}
            </small>
          </div>
        </div>
        <div className="cal-stat">
          <span className="cal-stat-label">พระสงฆ์ปฏิบัติศาสนกิจ</span>
          <div className="cal-stat-value">
            {monkSet.size} <small>รูป ({monkGroups} คณะ)</small>
          </div>
        </div>
        <div className={`cal-stat ${conflicts.length > 0 ? "danger" : ""}`}>
          <span className="cal-stat-label">ข้อขัดแย้งเวลา / ซ้ำซ้อน</span>
          <div className="cal-stat-value">
            {conflicts.length}{" "}
            <small>
              {conflicts.length > 0 ? "รายการที่ต้องแก้ไข" : "ไม่พบข้อขัดแย้ง"}
            </small>
          </div>
        </div>
        <div className="cal-stat">
          <span className="cal-stat-label">พิธีฌาปนกิจวันนี้</span>
          <div className="cal-stat-value">
            {cremationToday.length} <small>งาน</small>
          </div>
          <div className="cal-stat-note">
            {cremationToday.length > 0
              ? `${cremationToday[0].hall} เวลา ${cremationToday[0].cremationTime} น.`
              : "ไม่มีพิธีฌาปนกิจ"}
          </div>
        </div>
      </section>

      <div className="cal-body">
        <aside className="cal-side">
          <div className="cal-card">
            <span className="cal-kicker">ปฏิทินกิจนิมนต์</span>
            <div className="cal-month-row">
              <h2>
                {TH_MONTHS[month.m]} {thDigits(month.y + 543)}
              </h2>
              <div>
                <button
                  type="button"
                  className="cal-nav-btn"
                  aria-label="เดือนก่อนหน้า"
                  onClick={() => shiftMonth(-1)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="cal-nav-btn"
                  aria-label="เดือนถัดไป"
                  onClick={() => shiftMonth(1)}
                >
                  ›
                </button>
              </div>
            </div>

            <div className="cal-tabs">
              {HALL_FILTERS.map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`cal-tab ${hallFilter === h ? "active" : ""}`}
                  onClick={() => setHallFilter(h)}
                >
                  {h === "ALL" ? `ทั้งหมด (${dotCount} จุด)` : h}
                </button>
              ))}
            </div>

            {loadError && <p className="cal-event-note">{loadError}</p>}

            <div className="cal-grid">
              {TH_DAYS_SHORT.map((d) => (
                <div key={d} className="cal-dow">
                  {d}
                </div>
              ))}
              {cells.map((d, i) => {
                if (d === null)
                  return <div key={`x${i}`} className="cal-cell empty" />;
                const { iso, list } = dayInfo(d);
                const isSel = iso === selected;
                const hasConflict =
                  list.length > 0 &&
                  events.some((e) => isActiveOn(e, iso) && e.monkTime) &&
                  (() => {
                    const seen = new Set<string>();
                    let dup = false;
                    events
                      .filter((e) => isActiveOn(e, iso) && e.monkTime)
                      .forEach((e) =>
                        e.monks.forEach((m) => {
                          if (!m) return;
                          const k = `${m}@${e.monkTime}`;
                          if (seen.has(k)) dup = true;
                          seen.add(k);
                        }),
                      );
                    return dup;
                  })();
                return (
                  <button
                    key={iso}
                    type="button"
                    className={`cal-cell ${list.length ? "has" : ""} ${isSel ? "sel" : ""}`}
                    onClick={() => setSelected(iso)}
                  >
                    {isSel && <small>วันที่</small>}
                    <span>{d}</span>
                    {list.length > 0 && (
                      <i className={hasConflict ? "dot red" : "dot"} />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="cal-legend">
              <span>
                <i className="sw" /> ศาลาว่าง / ปกติ
              </span>
              <span>
                <i className="sw has" /> มีงานพิธีเต็มทุกศาลา
              </span>
              <span>
                <i className="sw sel" /> วันที่เลือกปัจจุบัน
              </span>
              <span className="red">
                <i className="dot red" /> คิวซ้อน / ต้องแก้ไข
              </span>
            </div>
          </div>

          <div className="cal-card">
            <div className="cal-month-row">
              <h2>
                สรุปยอดงานเดือน {TH_MONTHS[month.m]} {thDigits(month.y + 543)}
              </h2>
            </div>
            <dl className="cal-metrics">
              <div>
                <dt>จำนวนงานพิธีทั้งสิ้น</dt>
                <dd>{thDigits(monthEvents.length)} งานพิธี</dd>
              </div>
              <div>
                <dt>จำนวนคืนที่ใช้ศาลาทั้งเดือน</dt>
                <dd>{thDigits(nightsUsed)} คืน</dd>
              </div>
              <div>
                <dt>ศาลาที่ใช้งานหนาแน่นสุด</dt>
                <dd className="gold">{busiest ? `${busiest[0]} (${thDigits(busiest[1])} คืน)` : "ยังไม่มีงานในเดือนนี้"}</dd>
              </div>
              <div>
                <dt>พิธีฌาปนกิจในเดือนนี้</dt>
                <dd>{thDigits(cremationsInMonth)} พิธี</dd>
              </div>
            </dl>
            <p className="cal-note">
              <strong>หมายเหตุ:</strong> ตัวเลขสรุปคำนวณจากงานจองที่วัดอนุมัติและยังไม่ยกเลิก ตามเดือนที่เปิดอยู่
            </p>
          </div>
        </aside>

        <main className="cal-main">
          <span className="cal-kicker">TIMELINE & LITURGICAL ROSTER</span>
          <div className="cal-main-head">
            <h2>
              กำหนดการและคิวพระสงฆ์ประจำวัน — {selTitle.replace("ที่ ", " ")}
            </h2>
            <span className="cal-pill">
              ผังทั้งหมด {dayEvents.filter((e) => e.hall !== "เมรุหลวง").length}{" "}
              ศาลา + {dayEvents.filter((e) => e.hall === "เมรุหลวง").length}{" "}
              เมรุ
            </span>
          </div>

          {conflicts.length > 0 && (
            <div className="cal-alert">
              <div className="cal-alert-body">
                <strong>
                  พบข้อขัดแย้ง: คิวพระสงฆ์ซ้ำซ้อน (Conflict Warning: Double
                  Booking Detected)
                </strong>
                {conflicts.map((c) => (
                  <p key={c.monkId + c.time}>
                    <b>{MONKS[c.monkId].name}</b> ได้รับนิมนต์สวดพระอภิธรรมเวลา{" "}
                    <b>{c.time} น.</b> ซ้ำกันระหว่าง{" "}
                    {c.events
                      .map((e) => `${e.hallFull} (${e.deceased})`)
                      .join(" และ ")}
                  </p>
                ))}
                <div className="cal-alert-actions">
                  <button
                    type="button"
                    className="cal-btn dark"
                    onClick={reassignAll}
                  >
                    เปลี่ยนพระสงฆ์ทดแทน (Reassign)
                  </button>
                  <button
                    type="button"
                    className="cal-btn"
                    onClick={() => setShowSpare(!showSpare)}
                  >
                    ตรวจสอบตารางว่างของภิกษุสงฆ์
                  </button>
                </div>
                {showSpare && (
                  <div className="cal-spare">
                    <b>พระสงฆ์ที่ว่างในวันนี้:</b>{" "}
                    {freeSpares.length > 0
                      ? freeSpares.map((id) => MONKS[id].name).join(", ")
                      : "ไม่มี"}
                  </div>
                )}
              </div>
            </div>
          )}

          {dayEvents.length === 0 && (
            <div className="cal-empty">ไม่มีงานพิธีในวันที่เลือก</div>
          )}

          {dayEvents.map((e, idx) => {
            const hasConflict = e.monks.some((m) => conflictKey(e.id, m));
            const vacancies = e.monks.filter((m) => m === null).length;
            return (
              <article key={e.id} className="cal-event">
                <div className="cal-event-head">
                  <span className="cal-event-no">{pad(idx + 1)}</span>
                  <div className="cal-event-name">
                    <h3>
                      {e.hallFull}{" "}
                      <span className="cal-tag">{nightLabel(e)}</span>
                    </h3>
                    <span>
                      รหัสอ้างอิง: {e.ref}
                      {e.place ? ` · ${e.place}` : ""}
                    </span>
                  </div>
                  {hasConflict ? (
                    <span className="cal-status bad">
                      ⚠ มีพระสงฆ์ติดซ้อน{" "}
                      {
                        conflicts.filter((c) =>
                          c.events.some((x) => x.id === e.id),
                        ).length
                      }{" "}
                      รูป
                    </span>
                  ) : vacancies > 0 ? (
                    <span className="cal-status bad">
                      รอจัดพระสงฆ์ทดแทน {thDigits(vacancies)} รูป
                    </span>
                  ) : e.monks.length > 0 ? (
                    <span className="cal-status ok">
                      ✓ พระสงฆ์ครบ {thDigits(e.monks.length)} รูป (ยืนยัน)
                    </span>
                  ) : null}
                </div>

                <div className="cal-two">
                  <div>
                    <span className="cal-kicker">ผู้วายชนม์</span>
                    <strong>{e.deceased}</strong>
                    <p>{e.deceasedNote}</p>
                  </div>
                  <div>
                    <span className="cal-kicker">เจ้าภาพดำเนินพิธี</span>
                    <strong>{e.host}</strong>
                    <p>{e.hostNote}</p>
                  </div>
                </div>

                {e.schedule.length > 0 && (
                  <>
                    <span className="cal-kicker">กำหนดเวลาพิธีการ</span>
                    <div className="cal-schedule">
                      {e.schedule.filter((s) => !s.date || s.date === selected).map((s) => (
                        <div key={s.date + s.time + s.title} className="cal-sch">
                          <b>{s.time}</b>
                          <strong>{s.title}</strong>
                          <p>{s.desc}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {e.monks.length > 0 && (
                  <>
                    <div className="cal-monk-head">
                      <span className="cal-kicker">
                        บัญชีรายนามพระสงฆ์สวดพระอภิธรรม (
                        {thDigits(e.monks.length)} รูป)
                      </span>
                      <span>ประจำกฎี คณะ ๑</span>
                    </div>
                    <div className="cal-monks">
                      {e.monks.map((m, i) => {
                        const bad = conflictKey(e.id, m);
                        if (m === null)
                          return (
                            <div key={`v${i}`} className="cal-monk vacant">
                              <b>รูปที่ {thDigits(i + 1)} (ว่าง / ติดซ้อน)</b>
                              <span>รอนิมนต์ทดแทน</span>
                              <button
                                type="button"
                                className="cal-mini"
                                onClick={() => assignSpare(e.id, i)}
                              >
                                + เลือกพระสงฆ์จากกฎี
                              </button>
                            </div>
                          );
                        return (
                          <div
                            key={m + i}
                            className={`cal-monk ${bad ? "bad" : ""}`}
                          >
                            <b>
                              {MONKS[m].name} {bad ? "⚠" : ""}
                            </b>
                            <span>
                              {bad
                                ? `คิวซ้อนทับเวลา ${e.monkTime} น. ที่ศาลาอื่น`
                                : MONKS[m].detail}
                            </span>
                            {bad && (
                              <button
                                type="button"
                                className="cal-mini"
                                onClick={() => assignSpare(e.id, i)}
                              >
                                แก้คิว
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {e.note && <p className="cal-event-note">{e.note}</p>}
              </article>
            );
          })}
        </main>
      </div>

      <section className="cal-rules">
        <div>
          <strong>
            ข้อกำหนดและระเบียบการจัดเวรกิจนิมนต์พระสงฆ์ สำนักงานวัดศรีสุคต
            พระอารามหลวง
          </strong>
          <p>
            ๑. การนิมนต์และสับเปลี่ยนพระสงฆ์ต้องดำเนินการล่วงหน้าไม่น้อยกว่า ๖
            ชั่วโมง เพื่อให้เจ้าหน้าที่แจ้งกฎีสามารถทำได้ทันถูกต้องตามแนวระเบียบ
          </p>
          <p>
            ๒. เมื่อมีการอนุมัติหรือสับเปลี่ยนเวร ระบบ FOMS จะส่งการแจ้งเตือน
            SMS อัตโนมัติไปยังพระสงฆ์ผู้รับกิจนิมนต์ทันที
          </p>
        </div>
        <div className="cal-rules-side">
          <span>เจ้าหน้าที่รับเวรประจำวัน</span>
          <strong>พระมหาธีรพัฒน์ / นายสุรเชษฐ์</strong>
          <button
            type="button"
            className="cal-btn"
            onClick={() => window.print()}
          >
            พิมพ์ใบบัญชีเวรสงฆ์
          </button>
        </div>
      </section>

      <footer className="cal-footer">
        <span>
          ระบบบริหารจัดการกิจการฌาปนสถาน (FOMS) วัดศรีสุคต พระอารามหลวง
        </span>
        <span>ติดต่อกรณีเร่งด่วนสำนักงานศาสนสมบัติ: 02-XXX-XXXX ต่อ 101</span>
        <span>การคุ้มครองข้อมูล (PDPA Compliant)</span>
        <strong>สงวนลิขสิทธิ์ พ.ศ. ๒๕๖๙</strong>
      </footer>

      {toast && <div className="cal-toast">{toast}</div>}
    </div>
  );
};
