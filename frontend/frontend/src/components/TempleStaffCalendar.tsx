import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StaffNav } from "./StaffNav";
import { AuthUser } from "../App";
import { staffFetch, thaiDate, useTempleName } from "../staffApi";
import "./TempleStaffCalendar.css";

interface TempleStaffCalendarProps {
  currentUser?: AuthUser | null;
  onNavigateHome?: () => void;
  onNavigateApprovals?: () => void;
  onNavigateInventory?: () => void;
  onNavigateHistory?: () => void;
  onLogout?: () => void;
}

type HallFilter = "ALL" | string;

// งานที่ backend ส่งมา (GET /api/staff/calendar) ทุกฟิลด์มาจากฐานข้อมูลจริง
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
  persons: { date: string; role: string; name: string; title: string }[];
}

interface Summary {
  halls: { total: number };
}

const TYPE_LABEL: Record<string, string> = {
  BATHING: "พิธีสรงน้ำศพ",
  CHANT: "สวดพระอภิธรรม",
  CREMATION: "พิธีฌาปนกิจ",
  MERIT: "ทำบุญอุทิศส่วนกุศล",
};
const ROLE_LABEL: Record<string, string> = { CHIEF: "พระประธาน", CHANT: "พระสวด", MC: "มัคนายก/พิธีกร" };
const ROLE_ORDER: Record<string, number> = { CHIEF: 0, CHANT: 1, MC: 2 };

const TH_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const TH_DAYS_SHORT = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const TH_DAYS_FULL = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];

const thDigits = (v: number | string) => String(v).replace(/\d/g, (d) => "๐๑๒๓๔๕๖๗๘๙"[Number(d)]);
const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
const addDay = (iso: string) => new Date(Date.parse(iso) + 86400000).toISOString().slice(0, 10);
const parseISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m: m - 1, d };
};
const shortHall = (name: string) => name.split(" (")[0];
const isActiveOn = (e: ApiCalEvent, iso: string) => (iso >= e.start && iso <= e.end) || iso === e.cremationISO;
const personsOn = (e: ApiCalEvent, iso: string) =>
  e.persons.filter((p) => p.date === iso).sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9));

const nowThai = () =>
  new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());

export const TempleStaffCalendar: React.FC<TempleStaffCalendarProps> = ({
  currentUser,
  onNavigateHome,
  onNavigateApprovals,
  onNavigateInventory,
  onNavigateHistory,
  onLogout,
}) => {
  const templeName = useTempleName(currentUser?.name ?? "");
  const todayISO = useMemo(
    () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()),
    [],
  );
  const [events, setEvents] = useState<ApiCalEvent[]>([]);
  const [totalHalls, setTotalHalls] = useState<number | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loadedAt, setLoadedAt] = useState("");
  const [selected, setSelected] = useState(todayISO);
  const [month, setMonth] = useState(() => {
    const [y, m] = todayISO.split("-").map(Number);
    return { y, m: m - 1 };
  });
  const [hallFilter, setHallFilter] = useState<HallFilter>("ALL");
  const [reloadTick, setReloadTick] = useState(0);

  // โหลดงานของเดือนที่เปิดอยู่ (และโหลดใหม่เมื่อกดปุ่มรีเฟรช)
  useEffect(() => {
    let cancelled = false;
    setLoadError("");
    staffFetch<ApiCalEvent[]>(`/calendar?month=${month.y}-${pad(month.m + 1)}`)
      .then((rows) => {
        if (cancelled) return;
        setEvents(rows);
        setLoadedAt(nowThai());
      })
      .catch((err) => {
        if (cancelled) return;
        setEvents([]);
        setLoadError(err instanceof Error ? err.message : "โหลดปฏิทินไม่สำเร็จ");
      });
    return () => {
      cancelled = true;
    };
  }, [month, reloadTick]);

  // จำนวนศาลา/เมรุทั้งหมดของวัด (ไว้แสดง "ใช้งาน X จาก Y หลัง")
  useEffect(() => {
    staffFetch<Summary>("/summary")
      .then((s) => setTotalHalls(s.halls.total))
      .catch(() => setTotalHalls(null));
  }, []);

  const hallNames = useMemo(() => Array.from(new Set(events.map((e) => shortHall(e.hallName)))).sort(), [events]);
  const HALL_FILTERS: HallFilter[] = ["ALL", ...hallNames];
  const inFilter = useCallback((e: ApiCalEvent) => hallFilter === "ALL" || shortHall(e.hallName) === hallFilter, [hallFilter]);

  const dayEvents = useMemo(() => events.filter((e) => isActiveOn(e, selected) && inFilter(e)), [events, selected, inFilter]);

  // ปฏิทิน
  const first = new Date(month.y, month.m, 1).getDay();
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const dayInfo = (d: number) => {
    const iso = toISO(month.y, month.m, d);
    const list = events.filter((e) => isActiveOn(e, iso) && inFilter(e));
    // วันนี้หรืออนาคตที่ยังไม่ได้จัดบุคลากรเข้าพิธี = ต้องติดตาม (จุดสีแดง)
    const needsStaff = iso >= todayISO && list.some((e) => personsOn(e, iso).length === 0);
    return { iso, list, needsStaff };
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(month.y, month.m + delta, 1);
    setMonth({ y: d.getFullYear(), m: d.getMonth() });
  };

  const monthFrom = toISO(month.y, month.m, 1);
  const monthTo = toISO(month.y, month.m, daysInMonth);
  const monthEvents = events.filter((e) => e.start <= monthTo && e.end >= monthFrom);
  // สรุปประจำเดือนจากงานจริง
  const hallNights = new Map<string, number>();
  monthEvents.forEach((e) => {
    for (let d = e.start; d <= e.end; d = addDay(d)) {
      if (d >= monthFrom && d <= monthTo) hallNights.set(shortHall(e.hallName), (hallNights.get(shortHall(e.hallName)) || 0) + 1);
    }
  });
  const nightsUsed = [...hallNights.values()].reduce((n, v) => n + v, 0);
  const busiest = [...hallNights.entries()].sort((a, b) => b[1] - a[1])[0];
  const cremationsInMonth = monthEvents.filter((e) => e.cremationISO >= monthFrom && e.cremationISO <= monthTo).length;
  const dotCount = cells.filter((d) => d !== null && dayInfo(d).list.length > 0).length;

  const sel = parseISO(selected);
  const selTitle = `${TH_DAYS_FULL[new Date(sel.y, sel.m, sel.d).getDay()]}ที่ ${sel.d} ${TH_MONTHS[sel.m]} ${sel.y + 543}`;

  // การ์ดสรุปด้านบน (คำนวณจากวันที่เลือก)
  const activeAll = events.filter((e) => isActiveOn(e, selected));
  const hallsUsed = new Set(activeAll.map((e) => shortHall(e.hallName))).size;
  const staffToday = new Set(activeAll.flatMap((e) => personsOn(e, selected).map((p) => p.name)));
  const withoutStaff = activeAll.filter((e) => personsOn(e, selected).length === 0).length;
  const cremationToday = activeAll.filter((e) => e.cremationISO === selected);

  const nightLabel = (e: ApiCalEvent) => {
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
          <span className="cal-link" onClick={onNavigateHome}>หน้าหลัก</span>
          {" / "}
          <span>เจ้าหน้าที่วัด</span>
          {" / "}
          <strong>ปฏิทินศาลาและเมรุ</strong>
        </div>
        <div className="cal-topbar-meta">
          <span>{loadedAt ? `● โหลดข้อมูลล่าสุดเวลา ${loadedAt} น. (เวลาประเทศไทย)` : "● กำลังโหลดข้อมูล..."}</span>
          <span className="cal-link" onClick={() => setReloadTick((n) => n + 1)}>โหลดใหม่</span>
        </div>
      </div>

      <header className="cal-header">
        <span className="cal-pretitle">TEMPLE OPERATIONS & LITURGICAL CALENDAR{templeName ? ` · ${templeName}` : ""}</span>
        <div className="cal-title-row">
          <div>
            <h1 className="cal-title">ตารางการใช้งานศาลาและบุคลากรประจำพิธี</h1>
            <p className="cal-subtitle">
              ตรวจสอบการใช้ศาลาและเมรุรายวัน กำหนดการพิธี และพระสงฆ์/มัคนายกที่ทีมจัดงานจัดเข้าพิธีในแต่ละวัน
              (ข้อมูลทั้งหมดดึงจากฐานข้อมูลของระบบ)
            </p>
          </div>
          <div className="cal-actions">
            <div className="cal-date-box">
              {selTitle}
              {selected === todayISO ? " (วันนี้)" : ""}
            </div>
            <button className="cal-btn" type="button" onClick={() => window.print()}>
              พิมพ์ตาราง
            </button>
          </div>
        </div>
      </header>

      <section className="cal-stats">
        <div className="cal-stat">
          <span className="cal-stat-label">ศาลา/เมรุที่มีงานวันนี้</span>
          <div className="cal-stat-value">
            {hallsUsed}{" "}
            <small>{totalHalls !== null ? `/ ${totalHalls} หลัง` : "หลัง"}</small>
          </div>
        </div>
        <div className="cal-stat">
          <span className="cal-stat-label">บุคลากรที่จัดเข้าพิธีวันนี้</span>
          <div className="cal-stat-value">
            {staffToday.size} <small>ท่าน ({activeAll.length - withoutStaff} งาน)</small>
          </div>
        </div>
        <div className={`cal-stat ${withoutStaff > 0 && selected >= todayISO ? "danger" : ""}`}>
          <span className="cal-stat-label">งานที่ยังไม่ได้จัดบุคลากร</span>
          <div className="cal-stat-value">
            {withoutStaff}{" "}
            <small>{withoutStaff > 0 ? "งานที่ทีมจัดงานต้องจัดเพิ่ม" : "จัดครบทุกงานแล้ว"}</small>
          </div>
        </div>
        <div className="cal-stat">
          <span className="cal-stat-label">พิธีฌาปนกิจวันนี้</span>
          <div className="cal-stat-value">
            {cremationToday.length} <small>งาน</small>
          </div>
          <div className="cal-stat-note">
            {cremationToday.length > 0
              ? cremationToday.map((e) => shortHall(e.hallName)).join(", ")
              : "ไม่มีพิธีฌาปนกิจ"}
          </div>
        </div>
      </section>

      <div className="cal-body">
        <aside className="cal-side">
          <div className="cal-card">
            <span className="cal-kicker">ปฏิทินการใช้ศาลา</span>
            <div className="cal-month-row">
              <h2>{TH_MONTHS[month.m]} {thDigits(month.y + 543)}</h2>
              <div>
                <button type="button" className="cal-nav-btn" aria-label="เดือนก่อนหน้า" onClick={() => shiftMonth(-1)}>‹</button>
                <button type="button" className="cal-nav-btn" aria-label="เดือนถัดไป" onClick={() => shiftMonth(1)}>›</button>
              </div>
            </div>

            <div className="cal-tabs">
              {HALL_FILTERS.map((h) => (
                <button key={h} type="button" className={`cal-tab ${hallFilter === h ? "active" : ""}`} onClick={() => setHallFilter(h)}>
                  {h === "ALL" ? `ทั้งหมด (${dotCount} วัน)` : h}
                </button>
              ))}
            </div>

            {loadError && <p className="cal-event-note">{loadError}</p>}

            <div className="cal-grid">
              {TH_DAYS_SHORT.map((d) => (
                <div key={d} className="cal-dow">{d}</div>
              ))}
              {cells.map((d, i) => {
                if (d === null) return <div key={`x${i}`} className="cal-cell empty" />;
                const { iso, list, needsStaff } = dayInfo(d);
                const isSel = iso === selected;
                return (
                  <button
                    key={iso}
                    type="button"
                    className={`cal-cell ${list.length ? "has" : ""} ${isSel ? "sel" : ""}`}
                    onClick={() => setSelected(iso)}
                  >
                    {isSel && <small>วันที่</small>}
                    <span>{d}</span>
                    {list.length > 0 && <i className={needsStaff ? "dot red" : "dot"} />}
                  </button>
                );
              })}
            </div>

            <div className="cal-legend">
              <span><i className="sw" /> ไม่มีงาน</span>
              <span><i className="sw has" /> มีงานพิธี</span>
              <span><i className="sw sel" /> วันที่เลือกปัจจุบัน</span>
              <span className="red"><i className="dot red" /> ยังไม่ได้จัดบุคลากร</span>
            </div>
          </div>

          <div className="cal-card">
            <div className="cal-month-row">
              <h2>สรุปยอดงานเดือน {TH_MONTHS[month.m]} {thDigits(month.y + 543)}</h2>
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
          <span className="cal-kicker">TIMELINE & ROSTER</span>
          <div className="cal-main-head">
            <h2>กำหนดการและบุคลากรประจำวัน — {selTitle.replace("ที่ ", " ")}</h2>
            <span className="cal-pill">มีงาน {dayEvents.length} งาน</span>
          </div>

          {dayEvents.length === 0 && <div className="cal-empty">ไม่มีงานพิธีในวันที่เลือก</div>}

          {dayEvents.map((e, idx) => {
            const staff = personsOn(e, selected);
            const items = e.schedule.filter((s) => s.date === selected);
            return (
              <article key={e.id} className="cal-event">
                <div className="cal-event-head">
                  <span className="cal-event-no">{pad(idx + 1)}</span>
                  <div className="cal-event-name">
                    <h3>
                      {e.hallName} <span className="cal-tag">{nightLabel(e)}</span>
                    </h3>
                    <span>
                      รหัสอ้างอิง: {e.ref}
                      {e.hallCapacity ? ` · ความจุ ${e.hallCapacity} ที่นั่ง` : ""}
                    </span>
                  </div>
                  {staff.length > 0 ? (
                    <span className="cal-status ok">✓ จัดบุคลากรแล้ว {thDigits(staff.length)} ท่าน</span>
                  ) : (
                    <span className="cal-status bad">ยังไม่ได้จัดบุคลากร</span>
                  )}
                </div>

                <div className="cal-two">
                  <div>
                    <span className="cal-kicker">ผู้วายชนม์</span>
                    <strong>{e.deceasedName}</strong>
                    <p>{e.packageName} · ฌาปนกิจ {thaiDate(e.cremationISO)}</p>
                  </div>
                  <div>
                    <span className="cal-kicker">เจ้าภาพ</span>
                    <strong>{e.hostName}</strong>
                    <p>โทร {e.hostPhone || "-"} (แขกประมาณ {e.guests} ท่าน)</p>
                  </div>
                </div>

                {items.length > 0 && (
                  <>
                    <span className="cal-kicker">กำหนดเวลาพิธีการ</span>
                    <div className="cal-schedule">
                      {items.map((s) => (
                        <div key={s.date + s.time + s.title} className="cal-sch">
                          <b>{s.time ? `${s.time} น.` : "ตลอดวัน"}</b>
                          <strong>{s.title}</strong>
                          <p>{TYPE_LABEL[s.type] || s.type}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div className="cal-monk-head">
                  <span className="cal-kicker">บุคลากรประจำพิธีวันนี้ ({thDigits(staff.length)} ท่าน)</span>
                </div>
                {staff.length > 0 ? (
                  <div className="cal-monks">
                    {staff.map((p, i) => (
                      <div key={p.name + i} className="cal-monk">
                        <b>{p.name}</b>
                        <span>{ROLE_LABEL[p.role] || p.role}{p.title ? ` · ${p.title}` : ""}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="cal-event-note">ทีมจัดงานยังไม่ได้จัดพระสงฆ์/มัคนายกเข้าพิธีในวันนี้ (จัดได้ที่กระดานออแกไนเซอร์ แท็บ "กำหนดการพิธี")</p>
                )}

                {e.addons.length > 0 && <p className="cal-event-note">บริการเสริม: {e.addons.join(" · ")}</p>}
              </article>
            );
          })}
        </main>
      </div>

      <footer className="cal-footer">
        <span>ระบบบริหารจัดการกิจการฌาปนสถาน (FOMS){templeName ? ` · ${templeName}` : ""}</span>
        <span>การคุ้มครองข้อมูล (PDPA Compliant)</span>
      </footer>
    </div>
  );
};
