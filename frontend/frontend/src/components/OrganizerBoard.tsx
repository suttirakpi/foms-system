import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AuthUser } from "../App";
import {
  ApiError, OpsAssignment, OpsBoard, OpsJob, OpsPerson, OpsStep, OpsSummary, OpsVendor, ROLE_LABEL,
  STATUS_LABEL, ScheduleList, TYPE_LABEL, VendorStatus, errMsg, hhmm, opsFetch, pad, thDate,
} from "../opsApi";
import "./OrganizerBoard.css";

interface OrganizerBoardProps {
  currentUser: AuthUser | null;
  onNavigateHome: () => void;
  onLogout: () => void;
}

type NavKey = "live" | "vendors" | "schedule" | "summary";
const NAV: { key: NavKey; th: string; en: string }[] = [
  { key: "live", th: "หน้างานวันนี้", en: "Live Ops - Active" },
  { key: "vendors", th: "ตรวจสอบคู่ค้า & พัสดุ", en: "Vendors" },
  { key: "schedule", th: "กำหนดการพิธี", en: "Schedule" },
  { key: "summary", th: "รายงานสรุปงาน", en: "Summary" },
];

/* ---------- icons ---------- */
const Svg: React.FC<{ size?: number; children: React.ReactNode }> = ({ size = 16, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
    {children}
  </svg>
);
const IconCheck = ({ size = 14 }: { size?: number }) => <Svg size={size}><path d="M20 6 9 17l-5-5" /></Svg>;
const IconHistory = () => <Svg size={14}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></Svg>;
const IconShield = ({ size = 18 }: { size?: number }) => (
  <Svg size={size}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></Svg>
);
const IconArrow = () => <Svg size={18}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></Svg>;
const IconChecklist = () => <Svg size={18}><path d="m3 17 2 2 4-4" /><path d="m3 7 2 2 4-4" /><path d="M13 6h8" /><path d="M13 12h8" /><path d="M13 18h8" /></Svg>;
const IconUser = () => <Svg size={18}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></Svg>;

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="org-modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="org-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="org-modal-head">
          <h3>{title}</h3>
          <button type="button" onClick={onClose} aria-label="ปิด">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="org-field"><span>{label}</span>{children}</label>
);

const nextOf = (steps: OpsStep[]) => {
  const ai = steps.findIndex((s) => s.status === "active");
  return ai >= 0 ? steps.slice(ai + 1).find((s) => s.status === "wait") : undefined;
};
const tonightLabel = (j: OpsJob) =>
  j.tonight === "cremation" ? "วันฌาปนกิจ" : typeof j.tonight === "number" ? `คืนที่ ${j.tonight} จาก ${j.nights}` : "ยังไม่ถึง/พ้นวันพิธี";

export const OrganizerBoard: React.FC<OrganizerBoardProps> = ({ currentUser, onNavigateHome, onLogout }) => {
  const [nav, setNav] = useState<NavKey>("live");
  const [jobs, setJobs] = useState<OpsJob[] | null>(null);
  const [jobId, setJobId] = useState("");
  const [date, setDate] = useState("");
  const [board, setBoard] = useState<OpsBoard | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(new Date());
  const [toast, setToast] = useState<{ text: string; err: boolean } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const flash = useCallback((text: string, err = false) => {
    setToast({ text, err });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4000);
  }, []);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const organizerName = currentUser?.name ?? "ผู้ประสานงาน";

  const loadJobs = useCallback(async () => {
    try {
      const list = await opsFetch<OpsJob[]>("/ops/jobs");
      setJobs(list);
      setJobId((cur) => (list.some((j) => j.id === cur) ? cur : list[0]?.id || ""));
      setError("");
    } catch (err) {
      setError(errMsg(err, "โหลดรายการงานไม่สำเร็จ"));
      setJobs([]);
    }
  }, []);
  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const loadBoard = useCallback(async () => {
    if (!jobId) return setBoard(null);
    try {
      const b = await opsFetch<OpsBoard>(`/ops/bookings/${jobId}/board${date ? `?date=${date}` : ""}`);
      setBoard(b);
      setError("");
    } catch (err) {
      setError(errMsg(err, "โหลดกระดานงานไม่สำเร็จ"));
    }
  }, [jobId, date]);
  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const act = async (fn: () => Promise<unknown>, okMsg?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      if (okMsg) flash(okMsg);
      await loadBoard();
    } catch (err) {
      flash(errMsg(err), true);
      await loadBoard();
    } finally {
      setBusy(false);
    }
  };

  const job = board?.job || jobs?.find((j) => j.id === jobId) || null;
  const activeNav = NAV.find((n) => n.key === nav)!;

  const selectJob = (id: string) => {
    setJobId(id);
    setDate("");
    setBoard(null);
  };

  return (
    <div className="org">
      <header className="org-top">
        <div className="org-brand"><b>FOMS</b><span>ORGANIZER &amp; ON-SITE OPERATIONS</span></div>
        <nav className="org-nav">
          {NAV.map((n) => (
            <button key={n.key} className={nav === n.key ? "active" : ""} onClick={() => setNav(n.key)}>{n.th} ({n.en})</button>
          ))}
        </nav>
        <div className="org-top-right">
          <div className="org-team">
            <b>ทีมพิธีการ · ปฏิบัติการสด</b>
            <span>ผู้ประสานงาน: {organizerName}</span>
          </div>
          <button className="org-user" onClick={onLogout} title="ออกจากระบบ" aria-label="ออกจากระบบ"><IconUser /></button>
        </div>
      </header>

      <main className="org-main">
        <div className="org-crumb">
          <button onClick={onNavigateHome}>หน้าหลัก</button>
          <span>/</span>
          <span>ทีมปฏิบัติการหน้างาน (ORGANIZER)</span>
          <span>/</span>
          <strong>{nav === "live" ? "กระดานบริหารพิธีการหน้างาน" : activeNav.th}</strong>
        </div>

        {jobs === null ? (
          <div className="org-placeholder">กำลังโหลดรายการงาน...</div>
        ) : jobs.length === 0 ? (
          <div className="org-placeholder">{error || "ยังไม่มีงานที่ได้รับอนุมัติให้ดำเนินพิธี (งานต้องผ่านการอนุมัติจากเจ้าหน้าที่วัดก่อน)"}</div>
        ) : (
          <>
            <div className="org-pick">
              <label>
                งานที่รับผิดชอบ
                <select value={jobId} onChange={(e) => selectJob(e.target.value)}>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.bookingRef} · {j.deceasedName} · {j.hallName} {j.tonight !== null ? "(พิธีวันนี้)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              {board && (
                <label>
                  วันที่ปฏิบัติงาน
                  <select value={board.date} onChange={(e) => setDate(e.target.value)}>
                    {board.nights.map((d) => (
                      <option key={d} value={d}>{thDate(d)} {d === board.job.cremationISO ? "(วันฌาปนกิจ)" : ""}</option>
                    ))}
                  </select>
                </label>
              )}
              {job && <span className={`org-chip ${job.status === "IN_PROGRESS" ? "warn" : ""}`}>{STATUS_LABEL[job.status] || job.status}</span>}
              <button className="org-ghost" onClick={() => { loadJobs(); loadBoard(); }}>โหลดใหม่</button>
            </div>

            {error && <div className="org-error">{error}</div>}
            {!board ? (
              <div className="org-placeholder">กำลังโหลดกระดานงาน...</div>
            ) : (
              <>
                {nav === "live" && <LiveTab board={board} now={now} busy={busy} organizerName={organizerName} act={act} reload={loadBoard} flash={flash} />}
                {nav === "vendors" && <VendorsTab board={board} busy={busy} act={act} />}
                {nav === "schedule" && <ScheduleTab board={board} flash={flash} />}
                {nav === "summary" && <SummaryTab board={board} flash={flash} onChanged={() => { loadJobs(); loadBoard(); }} />}
              </>
            )}
          </>
        )}
      </main>

      {toast && <div className={`org-toast ${toast.err ? "err" : ""}`} role="status">{toast.text}</div>}

      <footer className="org-footer">
        <div className="cols">
          <div>
            <b className="t">หน่วยงานบริหารและควบคุมพิธีการส่วนกลาง</b>
            <p>FOMS On-Site Terminal — บันทึกและควบคุมข้อมูลพิธีการเฉพาะพื้นที่จริงเพื่อความโปร่งใส</p>
          </div>
          <div>
            <b className="t gold">ระบบรักษาความปลอดภัยและการตรวจสอบ</b>
            <p>ทุกการติ๊กขั้นตอนและการตรวจรับของถูกบันทึกพร้อมชื่อผู้ดำเนินการและเวลา ย้อนสถานะไม่ได้</p>
          </div>
        </div>
        <div className="bottom">
          <span>© 2025 FOMS. Ceremonial Protocol &amp; Funeral Operations Management. All rights reserved.</span>
          <b>CEREMONIAL TERMINAL NODE #01</b>
        </div>
      </footer>
    </div>
  );
};

type Act = (fn: () => Promise<unknown>, okMsg?: string) => Promise<void>;

/* =========================================================== หน้างานวันนี้ */
const LiveTab: React.FC<{
  board: OpsBoard; now: Date; busy: boolean; organizerName: string; act: Act; reload: () => void; flash: (m: string, e?: boolean) => void;
}> = ({ board, now, busy, act, flash }) => {
  const { steps, vendors, job } = board;
  const active = steps.find((s) => s.status === "active");
  const next = nextOf(steps);
  const doneCount = steps.filter((s) => s.status === "done").length;
  const progress = steps.length ? Math.floor(((doneCount + (active ? 0.5 : 0)) / steps.length) * 100) : 0;
  const received = vendors.filter((v) => v.status === "RECEIVED").length;
  const quality = vendors.length ? Math.round((received / vendors.length) * 100) : 0;
  const arrived = vendors.filter((v) => v.status === "ARRIVED").length;
  const kindLabel = board.dateKind === "CREMATION" ? "พิธีฌาปนกิจ" : "สวดพระอภิธรรม";

  const init = () =>
    act(() => opsFetch(`/ops/bookings/${job.id}/steps/init`, { method: "POST", body: { date: board.date } }), "เริ่มงานของวันนี้แล้ว สร้างคิวพิธีเรียบร้อย");
  const complete = (s: OpsStep) =>
    act(async () => {
      const r = await opsFetch<{ allDone: boolean }>(`/ops/steps/${s.id}/complete`, { method: "PATCH" });
      if (r.allDone) flash("ดำเนินพิธีครบทุกขั้นตอนของวันนี้แล้ว");
    });
  const vendorStep = (v: OpsVendor, status: VendorStatus) =>
    act(() => opsFetch(`/ops/vendors/${v.id}`, { method: "PATCH", body: { status } }), status === "RECEIVED" ? `ตรวจรับ "${v.title}" แล้ว` : undefined);

  return (
    <>
      <div className="org-eyebrow"><i />CEREMONIAL TERMINAL · {job.hallName} · {job.templeName}</div>
      <section className="org-hero">
        <div>
          <h1>กระดานบริหารงานพิธีการหน้างาน <small>(Organizer Operations Board)</small></h1>
          <p>
            งาน {job.bookingRef} · {job.deceasedName} · เจ้าภาพ {job.hostName} · ระบบควบคุมลำดับพิธีการ ติ๊กเสร็จทีละขั้น
            และตรวจรับของจากคู่ค้า ทุกการกดถูกบันทึกพร้อมชื่อผู้ดำเนินการ
          </p>
        </div>
        <div className="org-live">
          <b><i />ระบบเชื่อมต่อสด</b>
          <span>{pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())} น. · {thDate(board.date)}</span>
        </div>
      </section>

      <section className="org-stats">
        <div className="org-stat">
          <div className="org-stat-top"><span className="no">01</span><span>สถานะงาน</span></div>
          <h3>{kindLabel} {board.dateKind === "CHANT" ? `(${tonightLabel(job)})` : ""}</h3>
          <p>{active ? active.title : steps.length ? "ดำเนินพิธีครบทุกขั้นตอนแล้ว" : "ยังไม่ได้เริ่มงานของวันนี้"}</p>
          <div className="org-stat-foot"><span>สถานะ</span><b className="gold">{STATUS_LABEL[job.status] || job.status}</b></div>
        </div>
        <div className="org-stat">
          <div className="org-stat-top"><span className="no">02</span><span>กำหนดเวลาหลัก</span></div>
          <h3>{steps.length ? `${steps[0].time.replace(" น.", "")} – ${steps[steps.length - 1].range.split("– ")[1] || ""}` : "—"}</h3>
          <p>{next ? `คิวถัดไป: ${next.time} ${next.title.slice(0, 40)}` : active ? "กำลังดำเนินขั้นสุดท้าย" : "—"}</p>
          <div className="org-stat-foot"><span>ความคืบหน้ารวม</span><b>{progress}%</b></div>
        </div>
        <div className="org-stat">
          <div className="org-stat-top"><span className="no">03</span><span>ตรวจรับคู่ค้า</span></div>
          <h3>{received} / {vendors.length} รายการครบถ้วน</h3>
          <p>{vendors.length === 0 ? "ยังไม่มีรายการตรวจรับ (เพิ่มได้ในแท็บคู่ค้า)" : arrived > 0 ? `มีของถึงลานจอดแล้ว ${arrived} รายการ รอตรวจรับ` : received === vendors.length ? "ตรวจรับครบทุกรายการ" : "รอส่งมอบ"}</p>
          <div className="org-stat-foot"><span>ตรวจคุณภาพแล้ว</span><b className="gold">{quality}%</b></div>
        </div>
        <div className="org-stat">
          <div className="org-stat-top"><span className="no">04</span><span>แขกผู้ร่วมงาน</span></div>
          <h3>ประมาณ {job.guests} ท่าน</h3>
          <p>{job.hallName}</p>
          <div className="org-stat-foot"><span>แพ็กเกจ</span><b>{job.packageName}</b></div>
        </div>
      </section>

      <div className="org-cols">
        <section className="org-queue">
          <div className="org-sec-head">
            <div>
              <small>คิวพิธีการประจำวัน {thDate(board.date)}</small>
              <h2>Live Ceremonial Run-Queue</h2>
            </div>
            <span className={`org-chip ${active ? "warn" : ""}`}>{active ? <><i />กำลังดำเนินงาน (In Progress)</> : steps.length ? "เสร็จสิ้นครบทุกขั้น" : "ยังไม่เริ่ม"}</span>
          </div>

          {steps.length === 0 ? (
            <div className="org-active">
              <h3>ยังไม่ได้เริ่มงานของวันที่ {thDate(board.date)}</h3>
              <p>กด "เริ่มงานวันนี้" เพื่อสร้างคิวพิธี {board.dateKind === "CREMATION" ? "วันฌาปนกิจ (5 ขั้นตอน)" : "คืนสวดพระอภิธรรม (7 ขั้นตอน)"} จากเวลาเริ่มพิธีที่วัดตั้งไว้</p>
              <div className="org-active-foot">
                <span><IconShield /> {board.live ? "งานได้รับอนุมัติแล้ว พร้อมเริ่ม" : "งานนี้ปิดหรือยังไม่ได้รับอนุมัติ เริ่มงานไม่ได้"}</span>
                <button className="org-btn-black" disabled={!board.live || busy} onClick={init}>เริ่มงานวันนี้ <IconArrow /></button>
              </div>
            </div>
          ) : active ? (
            <div className="org-active">
              <div className="org-active-top">
                <span><em>คิวปัจจุบัน · ACTIVE STEP {pad(active.n)}</em> {active.range}</span>
                <span className="coord">ผู้ประสานงาน: {job.hostName ? "ทีมจัดงาน" : ""}</span>
              </div>
              <h3>{active.title}</h3>
              <p>{active.desc}</p>
              <div className="org-active-foot">
                <span><IconShield /> ขั้นที่ {active.n} จาก {steps.length}</span>
                <button className="org-btn-black" disabled={busy} onClick={() => complete(active)}>
                  {next ? "ติ๊กเสร็จ ไปคิวถัดไป (Next Queue)" : "ติ๊กเสร็จ ปิดขั้นสุดท้าย"} <IconArrow />
                </button>
              </div>
            </div>
          ) : (
            <div className="org-active done-all">ดำเนินพิธีครบทุกขั้นตอนของวันนี้แล้ว</div>
          )}

          <ol className="org-timeline">
            {steps.map((s) => {
              const st = s.status === "wait" && next && next.id === s.id ? "next" : s.status;
              return (
                <li key={s.id} className={`org-step ${st}`}>
                  <span className="marker">{s.status === "done" ? <IconCheck /> : s.status === "active" ? <i /> : pad(s.n)}</span>
                  <div className="card">
                    <div className="row">
                      <span className="meta">STEP {pad(s.n)} · {s.time}{s.status === "active" && <em>กำลังดำเนินการ</em>}</span>
                      <span className={`tag ${st}`}>
                        {s.status === "done" && "เสร็จสิ้นแล้ว"}
                        {s.status === "active" && "ประจำหน้างาน"}
                        {st === "next" && "รอเริ่ม (Queue Next)"}
                        {st === "wait" && "รอเริ่ม"}
                      </span>
                    </div>
                    <h4>{s.title}</h4>
                    {s.status === "done" ? (
                      <p className="note"><IconHistory /> บันทึกยืนยันเมื่อ {hhmm(s.doneAt)} โดย {s.doneByName}</p>
                    ) : (
                      <p>{s.desc}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="org-vendors">
          <div className="org-sec-head">
            <div>
              <small>การตรวจรับของหน้างาน</small>
              <h2>On-site Vendor Inspection</h2>
            </div>
            <span className="org-chip">{vendors.length} รายการ</span>
          </div>
          {vendors.length === 0 && <div className="org-empty">ยังไม่มีรายการตรวจรับ ไปที่แท็บ "ตรวจสอบคู่ค้า & พัสดุ" เพื่อเพิ่มหรือสร้างจากตัวเลือกที่เจ้าภาพเลือก</div>}
          {vendors.map((v) => (
            <VendorCard key={v.id} v={v} busy={busy} onStep={vendorStep} />
          ))}
        </section>
      </div>
    </>
  );
};

const VendorCard: React.FC<{ v: OpsVendor; busy: boolean; onStep: (v: OpsVendor, s: VendorStatus) => void }> = ({ v, busy, onStep }) => (
  <article className={`org-vcard ${v.status === "ARRIVED" ? "urgent" : ""}`}>
    <div className="row">
      <small>{v.category}</small>
      {v.status === "RECEIVED" && <span className="org-badge black">ตรวจรับสมบูรณ์ <IconCheck size={12} /></span>}
      {v.status === "ARRIVED" && <span className="org-badge yellow"><i />ของถึงลานจอดแล้ว</span>}
      {v.status === "SHIPPING" && <span className="org-badge yellow">กำลังจัดส่ง</span>}
    </div>
    <h4>{v.title}</h4>
    {v.partner && <p><b>คู่ค้า:</b> {v.partner}</p>}
    {v.expectedTime && <p><b>เวลานัดส่งมอบ:</b> {v.expectedTime} น.</p>}
    {v.detail && <div className="detail">{v.detail}</div>}
    {v.status === "RECEIVED" ? (
      <div className="foot">
        <span><IconCheck /> ตรวจรับโดย {v.receivedByName} เวลา {hhmm(v.receivedAt)}</span>
        <code>{v.ref}</code>
      </div>
    ) : (
      <div className="org-vact">
        {v.status === "SHIPPING" && <button className="org-btn-outline" disabled={busy} onClick={() => onStep(v, "ARRIVED")}>แจ้งของถึงลานจอดแล้ว</button>}
        <button className="org-btn-outline" disabled={busy} onClick={() => onStep(v, "RECEIVED")}><IconChecklist /> ตรวจรับและลงนาม (Mark as Received)</button>
      </div>
    )}
  </article>
);

/* =========================================================== คู่ค้า */
const VENDOR_EMPTY = { title: "", partner: "", category: "", expectedTime: "", detail: "" };
const VendorsTab: React.FC<{ board: OpsBoard; busy: boolean; act: Act }> = ({ board, busy, act }) => {
  const [form, setForm] = useState<typeof VENDOR_EMPTY | null>(null);
  const { vendors, job } = board;
  const vendorStep = (v: OpsVendor, status: VendorStatus) =>
    act(() => opsFetch(`/ops/vendors/${v.id}`, { method: "PATCH", body: { status } }), status === "RECEIVED" ? `ตรวจรับ "${v.title}" แล้ว` : undefined);
  const seed = () =>
    act(async () => {
      const r = await opsFetch<{ created: number }>(`/ops/bookings/${job.id}/vendors/seed`, { method: "POST" });
      if (r.created === 0) throw new Error("ไม่มีรายการใหม่ให้สร้าง (สร้างครบแล้ว)");
    }, "สร้างรายการตรวจรับจากตัวเลือกที่เจ้าภาพเลือกแล้ว");
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    await act(() => opsFetch(`/ops/bookings/${job.id}/vendors`, { method: "POST", body: { ...form, expectedTime: form.expectedTime || undefined } }), "เพิ่มรายการตรวจรับแล้ว");
    setForm(null);
  };
  const groups: { label: string; list: OpsVendor[] }[] = [
    { label: "รอตรวจรับ", list: vendors.filter((v) => v.status !== "RECEIVED") },
    { label: "ตรวจรับแล้ว", list: vendors.filter((v) => v.status === "RECEIVED") },
  ];
  return (
    <section className="org-sheet">
      <div className="org-sec-head">
        <div><small>การตรวจรับของจากคู่ค้า</small><h2>ตรวจสอบคู่ค้า &amp; พัสดุ ({vendors.filter((v) => v.status === "RECEIVED").length}/{vendors.length})</h2></div>
        <div className="org-actions">
          <button className="org-ghost" disabled={busy} onClick={seed}>สร้างจากตัวเลือกที่เจ้าภาพเลือก</button>
          <button className="org-btn-black sm" onClick={() => setForm({ ...VENDOR_EMPTY })}>+ เพิ่มรายการ</button>
        </div>
      </div>
      <div className="org-rule"><b>ระเบียบมาตรฐานการควบคุม FOMS</b><p>คู่ค้าต้องส่งมอบก่อนเริ่มพิธี ผู้ตรวจรับกดลงนามรับของ ระบบบันทึกชื่อและเวลาไว้เป็นหลักฐาน ย้อนสถานะไม่ได้</p></div>
      {vendors.length === 0 && <div className="org-empty">ยังไม่มีรายการ กด "สร้างจากตัวเลือกที่เจ้าภาพเลือก" หรือ "+ เพิ่มรายการ"</div>}
      {groups.map((g) => g.list.length > 0 && (
        <div key={g.label}>
          <h3 className="org-group">{g.label} ({g.list.length})</h3>
          <div className="org-vgrid">{g.list.map((v) => <VendorCard key={v.id} v={v} busy={busy} onStep={vendorStep} />)}</div>
        </div>
      ))}
      {form && (
        <Modal title="เพิ่มรายการตรวจรับ" onClose={() => setForm(null)}>
          <form className="org-form" onSubmit={save}>
            <Field label="รายการที่ต้องตรวจรับ"><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <div className="org-form-row">
              <Field label="คู่ค้า / ผู้ส่งมอบ"><input value={form.partner} onChange={(e) => setForm({ ...form, partner: e.target.value })} /></Field>
              <Field label="หมวด"><input placeholder="เช่น ดอกไม้, อาหารว่าง" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
            </div>
            <div className="org-form-row">
              <Field label="เวลานัดส่งมอบ"><input type="time" value={form.expectedTime} onChange={(e) => setForm({ ...form, expectedTime: e.target.value })} /></Field>
              <Field label="รายละเอียด"><input value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} /></Field>
            </div>
            <div className="org-form-actions">
              <button type="button" className="org-ghost" onClick={() => setForm(null)}>ยกเลิก</button>
              <button type="submit" className="org-btn-black sm" disabled={busy}>บันทึก</button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
};

/* =========================================================== กำหนดการ */
const ScheduleTab: React.FC<{ board: OpsBoard; flash: (m: string, e?: boolean) => void }> = ({ board, flash }) => {
  const { job } = board;
  const [sched, setSched] = useState<ScheduleList | null>(null);
  const [assign, setAssign] = useState<{ assignments: OpsAssignment[]; persons: OpsPerson[] } | null>(null);
  const [pick, setPick] = useState({ date: board.date, personId: "", role: "CHANT" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([
        opsFetch<ScheduleList>(`/bookings/${job.id}/schedule`),
        opsFetch<{ assignments: OpsAssignment[]; persons: OpsPerson[] }>(`/ops/bookings/${job.id}/assignments`),
      ]);
      setSched(s);
      setAssign(a);
    } catch (err) {
      flash(errMsg(err), true);
    }
  }, [job.id, flash]);
  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      flash(ok);
      await load();
    } catch (err) {
      flash(errMsg(err), true);
    } finally {
      setBusy(false);
    }
  };
  const generate = () => {
    if (sched && sched.items.length > 0 && !window.confirm("มีกำหนดการอยู่แล้ว การสร้างใหม่จะแทนที่รายการเดิมทั้งหมด ดำเนินการต่อหรือไม่?")) return;
    run(async () => {
      const r = await opsFetch<{ count: number; warnings: { message: string }[] }>(`/bookings/${job.id}/schedule/generate`, { method: "POST" });
      if (r.warnings.length) flash(r.warnings[0].message, true);
    }, "สร้างกำหนดการพิธีอัตโนมัติแล้ว");
  };
  const doAssign = (e: React.FormEvent) => {
    e.preventDefault();
    run(() => opsFetch(`/ops/bookings/${job.id}/assignments`, { method: "POST", body: pick }), "จัดบุคลากรเข้ากำหนดการแล้ว");
  };

  const dates = useMemo(() => [...new Set((sched?.items || []).map((i) => i.date))].sort(), [sched]);
  const person = assign?.persons.find((p) => p.id === pick.personId);
  const roleOptions = !person ? [] : person.type === "MONK" ? ["CHIEF", "CHANT"] : ["MC"];

  return (
    <section className="org-sheet">
      <div className="org-sec-head">
        <div><small>กำหนดการพิธีทั้งงาน</small><h2>กำหนดการพิธี (Schedule)</h2></div>
        <button className="org-btn-black sm" disabled={busy || !board.live} onClick={generate}>{sched && sched.items.length ? "สร้างกำหนดการใหม่" : "สร้างกำหนดการอัตโนมัติ"}</button>
      </div>
      {!sched ? <div className="org-empty">กำลังโหลด...</div> : sched.items.length === 0 ? (
        <div className="org-empty">ยังไม่มีกำหนดการ กด "สร้างกำหนดการอัตโนมัติ" ระบบจะสร้างพิธีสรงน้ำศพ สวดอภิธรรมรายคืน ฌาปนกิจ และทำบุญ 7/50/100 วัน ตามกฎของวัด</div>
      ) : (
        <div className="org-days">
          {dates.map((d) => (
            <div key={d} className="org-day">
              <h3>{thDate(d)}</h3>
              {sched.items.filter((i) => i.date === d).map((i) => (
                <div key={i._id} className="org-item">
                  <b>{i.time ? `${i.time} น.` : "ตลอดวัน"}</b>
                  <span>{i.title}<em>{TYPE_LABEL[i.type] || i.type}</em></span>
                </div>
              ))}
              {(assign?.assignments || []).filter((a) => a.date === d).map((a) => (
                <div key={a.id} className="org-item person">
                  <b>{ROLE_LABEL[a.role]}</b>
                  <span>{a.name}
                    <button className="org-link" disabled={busy} onClick={() => run(() => opsFetch(`/ops/assignments/${a.id}`, { method: "DELETE" }), "ยกเลิกการจัดบุคลากรแล้ว")}>เอาออก</button>
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <h3 className="org-group">จัดพระสงฆ์ / มัคนายกเข้าพิธี</h3>
      {assign && assign.persons.length === 0 ? (
        <div className="org-empty">วัดนี้ยังไม่มีรายชื่อพระ/มัคนายกในระบบ (ผู้ดูแลระบบเพิ่มได้ที่หน้า ข้อมูลกลาง &gt; รายชื่อพระและมัคนายก)</div>
      ) : (
        <form className="org-inline" onSubmit={doAssign}>
          <Field label="วันที่">
            <select value={pick.date} onChange={(e) => setPick({ ...pick, date: e.target.value })}>
              {board.nights.map((d) => <option key={d} value={d}>{thDate(d)}</option>)}
            </select>
          </Field>
          <Field label="บุคลากร">
            <select required value={pick.personId} onChange={(e) => { const p = assign?.persons.find((x) => x.id === e.target.value); setPick({ ...pick, personId: e.target.value, role: p ? (p.type === "MONK" ? "CHANT" : "MC") : pick.role }); }}>
              <option value="">— เลือก —</option>
              {(assign?.persons || []).map((p) => <option key={p.id} value={p.id}>{p.name} ({p.type === "MONK" ? "พระ" : p.type === "DEACON" ? "มัคนายก" : "พิธีกร"})</option>)}
            </select>
          </Field>
          <Field label="หน้าที่">
            <select value={pick.role} onChange={(e) => setPick({ ...pick, role: e.target.value })}>
              {roleOptions.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </Field>
          <button type="submit" className="org-btn-black sm" disabled={busy || !pick.personId || !board.live}>จัดเข้าพิธี</button>
        </form>
      )}
    </section>
  );
};

/* =========================================================== สรุปงาน */
const SummaryTab: React.FC<{ board: OpsBoard; flash: (m: string, e?: boolean) => void; onChanged: () => void }> = ({ board, flash, onChanged }) => {
  const [sum, setSum] = useState<OpsSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const { job } = board;

  const load = useCallback(async () => {
    try {
      setSum(await opsFetch<OpsSummary>(`/ops/bookings/${job.id}/summary`));
    } catch (err) {
      flash(errMsg(err), true);
    }
  }, [job.id, flash]);
  useEffect(() => {
    load();
  }, [load, board.steps, board.vendors]);

  const setStatus = async (status: "IN_PROGRESS" | "COMPLETED") => {
    setBusy(true);
    try {
      try {
        await opsFetch(`/ops/bookings/${job.id}/status`, { method: "PATCH", body: { status } });
      } catch (err) {
        if (err instanceof ApiError && err.code === "VENDORS_PENDING") {
          if (!window.confirm(`${err.message}\nปิดงานทั้งที่ยังตรวจรับไม่ครบหรือไม่?`)) return;
          await opsFetch(`/ops/bookings/${job.id}/status`, { method: "PATCH", body: { status, force: true } });
        } else throw err;
      }
      flash(status === "COMPLETED" ? "ปิดงานเรียบร้อย งานนี้ถูกบันทึกในประวัติของเจ้าหน้าที่วัดแล้ว" : "เริ่มดำเนินงานแล้ว");
      onChanged();
      await load();
    } catch (err) {
      flash(errMsg(err), true);
    } finally {
      setBusy(false);
    }
  };

  if (!sum) return <div className="org-placeholder">กำลังโหลดสรุป...</div>;
  const pct = sum.steps.total ? Math.round((sum.steps.done / sum.steps.total) * 100) : 0;
  return (
    <section className="org-sheet">
      <div className="org-sec-head">
        <div><small>รายงานสรุปงาน {sum.job.bookingRef}</small><h2>{sum.job.deceasedName}</h2></div>
        <span className={`org-chip ${sum.job.status === "IN_PROGRESS" ? "warn" : ""}`}>{STATUS_LABEL[sum.job.status] || sum.job.status}</span>
      </div>
      <div className="org-sumgrid">
        <div className="org-stat"><div className="org-stat-top"><span>ขั้นตอนพิธี</span></div><h3>{sum.steps.done} / {sum.steps.total}</h3><p>เสร็จ {pct}% ของที่เริ่มสร้างไว้</p></div>
        <div className="org-stat"><div className="org-stat-top"><span>ตรวจรับคู่ค้า</span></div><h3>{sum.vendors.received} / {sum.vendors.total}</h3><p>{sum.vendors.total - sum.vendors.received === 0 ? "ครบทุกรายการ" : `ค้าง ${sum.vendors.total - sum.vendors.received} รายการ`}</p></div>
        <div className="org-stat"><div className="org-stat-top"><span>บุคลากรที่จัดเข้าพิธี</span></div><h3>{sum.assignments}</h3><p>รายการจัดเวร</p></div>
      </div>
      <table className="org-table">
        <thead><tr><th>วันที่</th><th>ประเภท</th><th>ขั้นตอนที่เสร็จ</th></tr></thead>
        <tbody>
          {sum.nights.map((n) => (
            <tr key={n.date}>
              <td>{thDate(n.date)}</td>
              <td>{n.kind === "CREMATION" ? "ฌาปนกิจ" : "สวดพระอภิธรรม"}</td>
              <td>{n.stepsTotal ? `${n.stepsDone} / ${n.stepsTotal}` : <span className="muted">ยังไม่เริ่ม</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="org-closebar">
        <p>เจ้าภาพ {sum.job.hostName} · {sum.job.hallName} · {thDate(sum.job.startISO)} – {thDate(sum.job.cremationISO)} · แขกประมาณ {sum.job.guests} ท่าน</p>
        <div className="org-actions">
          {sum.canStart && <button className="org-ghost" disabled={busy} onClick={() => setStatus("IN_PROGRESS")}>เริ่มดำเนินงาน</button>}
          <button className="org-btn-black" disabled={busy || !sum.canComplete} onClick={() => setStatus("COMPLETED")} title={sum.canComplete ? "" : "ต้องเริ่มดำเนินงาน (ติ๊กขั้นตอนแรก) ก่อน จึงปิดงานได้"}>
            ปิดงาน (Complete Job) <IconArrow />
          </button>
        </div>
      </div>
    </section>
  );
};

export default OrganizerBoard;
