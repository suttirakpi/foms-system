import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { AuthUser } from "../App";
import {
  ApiError,
  OpsAssignment,
  OpsBoard,
  OpsJob,
  OpsPerson,
  OpsStep,
  OpsSummary,
  OpsVendor,
  ROLE_LABEL,
  STATUS_LABEL,
  ScheduleList,
  TYPE_LABEL,
  VendorStatus,
  errMsg,
  hhmm,
  opsFetch,
  pad,
  thDate,
} from "../opsApi";
import { OrganizerNav, ORGANIZER_NAV, NavKey } from "./OrganizerNav";
import "./OrganizerBoard.css";

interface OrganizerBoardProps {
  currentUser: AuthUser | null;
  onNavigateHome: () => void;
  onLogout: () => void;
}

/* ---------- icons ---------- */
const Svg: React.FC<{ size?: number; children: React.ReactNode }> = ({
  size = 16,
  children,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ display: "block", flexShrink: 0 }}
  >
    {children}
  </svg>
);
const IconCheck = ({ size = 14 }: { size?: number }) => (
  <Svg size={size}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
);
const IconArrow = () => (
  <Svg size={18}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </Svg>
);
const IconRefresh = () => (
  <Svg size={16}>
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
  </Svg>
);

const Modal: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, onClose, children }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="org-modal-back"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="org-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="org-modal-head">
          <h3>{title}</h3>
          <button type="button" onClick={onClose} aria-label="ปิด">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <label className="org-field">
    <span>{label}</span>
    {children}
  </label>
);

const nextOf = (steps: OpsStep[]) => {
  const ai = steps.findIndex((s) => s.status === "active");
  return ai >= 0
    ? steps.slice(ai + 1).find((s) => s.status === "wait")
    : undefined;
};
const tonightLabel = (j: OpsJob) =>
  j.tonight === "cremation"
    ? "วันฌาปนกิจ"
    : typeof j.tonight === "number"
      ? `คืนที่ ${j.tonight} จาก ${j.nights}`
      : "ยังไม่ถึง/พ้นวันพิธี";

// นาฬิกาแยกเป็นคอมโพเนนต์ของตัวเอง ไม่ให้ทั้งกระดานรีเรนเดอร์ทุกวินาที
const Clock: React.FC = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="org-clock">
      {pad(now.getHours())}:{pad(now.getMinutes())} น.
    </span>
  );
};

export const OrganizerBoard: React.FC<OrganizerBoardProps> = ({
  currentUser,
  onNavigateHome,
  onLogout,
}) => {
  const [nav, setNav] = useState<NavKey>("live");
  const [jobs, setJobs] = useState<OpsJob[] | null>(null);
  const [jobId, setJobId] = useState("");
  const [date, setDate] = useState("");
  const [board, setBoard] = useState<OpsBoard | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; err: boolean } | null>(
    null,
  );
  const toastTimer = useRef<number | undefined>(undefined);

  const flash = useCallback((text: string, err = false) => {
    setToast({ text, err });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4000);
  }, []);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const organizerName = currentUser?.name ?? "ผู้ประสานงาน";

  const loadJobs = useCallback(async () => {
    try {
      const list = await opsFetch<OpsJob[]>("/ops/jobs");
      setJobs(list);
      setJobId((cur) =>
        list.some((j) => j.id === cur) ? cur : list[0]?.id || "",
      );
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
      const b = await opsFetch<OpsBoard>(
        `/ops/bookings/${jobId}/board${date ? `?date=${date}` : ""}`,
      );
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
  const activeNav = ORGANIZER_NAV.find((n) => n.key === nav)!;

  const selectJob = (id: string) => {
    if (id === jobId) return;
    setJobId(id);
    setDate("");
    setBoard(null);
  };

  return (
    <div className="org">
      <OrganizerNav
        activeNav={nav}
        organizerName={organizerName}
        onSelectNav={setNav}
        onNavigateHome={onNavigateHome}
        onLogout={onLogout}
      />

      <main className="org-main">
        {jobs === null ? (
          <div className="org-placeholder">กำลังโหลดรายการงาน...</div>
        ) : jobs.length === 0 ? (
          <div className="org-placeholder">
            {error ||
              "ยังไม่มีงานที่ได้รับอนุมัติให้ดำเนินพิธี (งานต้องผ่านการอนุมัติจากเจ้าหน้าที่วัดก่อน)"}
          </div>
        ) : (
          <>
            <header className="org-head">
              <div>
                <span className="org-kicker">{activeNav.th}</span>
                <h1>{job?.deceasedName}</h1>
                {job && (
                  <p>
                    {job.bookingRef} · {job.hallName} · {job.templeName} ·
                    เจ้าภาพ {job.hostName}
                  </p>
                )}
              </div>
              <div className="org-head-side">
                <Clock />
                {job && (
                  <span
                    className={`org-chip ${
                      job.status === "IN_PROGRESS" ? "warn" : ""
                    }`}
                  >
                    {STATUS_LABEL[job.status] || job.status}
                  </span>
                )}
              </div>
            </header>

            <div className="org-toolbar">
              {jobs.length > 1 && (
                <label>
                  งาน
                  <select
                    value={jobId}
                    onChange={(e) => selectJob(e.target.value)}
                  >
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.bookingRef} · {j.deceasedName} · {j.hallName}{" "}
                        {j.tonight !== null ? "(พิธีวันนี้)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {nav === "live" && board && (
                <label>
                  วันที่ปฏิบัติงาน
                  <select
                    value={board.date}
                    onChange={(e) => setDate(e.target.value)}
                  >
                    {board.nights.map((d) => (
                      <option key={d} value={d}>
                        {thDate(d)}{" "}
                        {d === board.job.cremationISO ? "(วันฌาปนกิจ)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button
                type="button"
                className="org-icon-btn"
                title="โหลดใหม่"
                aria-label="โหลดใหม่"
                onClick={() => {
                  loadJobs();
                  loadBoard();
                }}
              >
                <IconRefresh />
              </button>
            </div>

            {error && <div className="org-error">{error}</div>}
            {!board ? (
              <div className="org-placeholder">กำลังโหลดกระดานงาน...</div>
            ) : (
              <>
                {nav === "live" && (
                  <LiveTab board={board} busy={busy} act={act} flash={flash} />
                )}
                {nav === "vendors" && (
                  <VendorsTab board={board} busy={busy} act={act} />
                )}
                {nav === "schedule" && (
                  <ScheduleTab board={board} flash={flash} />
                )}
                {nav === "summary" && (
                  <SummaryTab
                    board={board}
                    flash={flash}
                    onChanged={() => {
                      loadJobs();
                      loadBoard();
                    }}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      {toast && (
        <div className={`org-toast ${toast.err ? "err" : ""}`} role="status">
          {toast.text}
        </div>
      )}

      <footer className="org-footer">
        <span>
          ทุกการติ๊กขั้นตอนและการตรวจรับของถูกบันทึกพร้อมชื่อผู้ดำเนินการและเวลา
          ย้อนสถานะไม่ได้
        </span>
        <span>© 2025 FOMS</span>
      </footer>
    </div>
  );
};

type Act = (fn: () => Promise<unknown>, okMsg?: string) => Promise<void>;

/* =========================================================== หน้างานวันนี้ */
const LiveTab: React.FC<{
  board: OpsBoard;
  busy: boolean;
  act: Act;
  flash: (m: string, e?: boolean) => void;
}> = ({ board, busy, act, flash }) => {
  const { steps, vendors, job } = board;
  const active = steps.find((s) => s.status === "active");
  const next = nextOf(steps);
  const doneCount = steps.filter((s) => s.status === "done").length;
  const awaitingCount = steps.filter(
    (s) => s.status === "review" || s.status === "disputed",
  ).length;
  const progress = steps.length
    ? Math.floor(((doneCount + (active ? 0.5 : 0)) / steps.length) * 100)
    : 0;
  const pending = vendors.filter((v) => v.status !== "RECEIVED");
  const receivedList = vendors.filter((v) => v.status === "RECEIVED");
  const arrived = vendors.filter((v) => v.status === "ARRIVED").length;
  const kindLabel =
    board.dateKind === "CREMATION" ? "พิธีฌาปนกิจ" : "สวดพระอภิธรรม";
  const timeRange = steps.length
    ? `${steps[0].time.replace(" น.", "")} – ${
        steps[steps.length - 1].range.split("– ")[1] || ""
      }`
    : "—";

  const init = () =>
    act(
      () =>
        opsFetch(`/ops/bookings/${job.id}/steps/init`, {
          method: "POST",
          body: { date: board.date },
        }),
      "เริ่มงานของวันนี้แล้ว สร้างคิวพิธีเรียบร้อย",
    );
  const complete = (s: OpsStep) =>
    act(async () => {
      const r = await opsFetch<{ allDone: boolean }>(
        `/ops/steps/${s.id}/complete`,
        { method: "PATCH" },
      );
      if (r.allDone) flash("ดำเนินพิธีครบทุกขั้นตอนของวันนี้แล้ว");
    });
  const vendorStep = (v: OpsVendor, status: VendorStatus) =>
    act(
      () =>
        opsFetch(`/ops/vendors/${v.id}`, {
          method: "PATCH",
          body: { status },
        }),
      status === "RECEIVED" ? `ตรวจรับ "${v.title}" แล้ว` : undefined,
    );

  return (
    <>
      <section className="org-metrics" aria-label="สรุปสถานะงานวันนี้">
        <div className="org-metric">
          <small>ความคืบหน้าวันนี้</small>
          <b>{progress}%</b>
          <div
            className="org-meter"
            role="progressbar"
            aria-label="ความคืบหน้าวันนี้"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <i style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="org-metric">
          <small>{kindLabel}</small>
          <b>{timeRange}</b>
          <span>
            {board.dateKind === "CHANT"
              ? tonightLabel(job)
              : thDate(board.date)}
          </span>
        </div>
        <div className="org-metric">
          <small>ตรวจรับของ</small>
          <b>
            {receivedList.length}/{vendors.length}
          </b>
          <span>
            {vendors.length === 0
              ? "ยังไม่มีรายการ"
              : arrived > 0
                ? `ของถึงแล้ว ${arrived} รายการ รอตรวจรับ`
                : receivedList.length === vendors.length
                  ? "ครบทุกรายการ"
                  : "รอส่งมอบ"}
          </span>
        </div>
        <div className="org-metric">
          <small>แขกผู้ร่วมงาน</small>
          <b>~{job.guests} ท่าน</b>
          <span>{job.packageName}</span>
        </div>
      </section>

      <div className="org-cols">
        <section className="org-queue">
          <div className="org-sec-head">
            <h2 className="org-h2">คิวพิธี {thDate(board.date)}</h2>
            {steps.length > 0 && (
              <span className="org-count">
                เสร็จ {doneCount}/{steps.length} ขั้น
              </span>
            )}
          </div>

          {steps.length === 0 ? (
            <div className="org-focus">
              <span className="org-label">ยังไม่ได้เริ่มงานของวันนี้</span>
              <h3>เริ่มงานวันที่ {thDate(board.date)}</h3>
              <p>
                ระบบจะสร้างคิว
                {board.dateKind === "CREMATION"
                  ? "วันฌาปนกิจ (5 ขั้นตอน)"
                  : "คืนสวดพระอภิธรรม (7 ขั้นตอน)"}{" "}
                จากเวลาเริ่มพิธีที่วัดตั้งไว้
              </p>
              <div className="org-focus-act">
                <button
                  className="org-btn-black"
                  disabled={!board.live || busy}
                  onClick={init}
                >
                  เริ่มงานวันนี้ <IconArrow />
                </button>
                {!board.live && (
                  <span className="org-hint">
                    งานนี้ปิดหรือยังไม่ได้รับอนุมัติ เริ่มงานไม่ได้
                  </span>
                )}
              </div>
            </div>
          ) : active ? (
            <div className="org-focus">
              <span className="org-label">
                ขั้นที่ {active.n} จาก {steps.length} · {active.range}
              </span>
              <h3>{active.title}</h3>
              <p>{active.desc}</p>
              <div className="org-focus-act">
                <button
                  className="org-btn-black"
                  disabled={busy}
                  onClick={() => complete(active)}
                >
                  {next ? "ติ๊กเสร็จ ไปคิวถัดไป" : "ติ๊กเสร็จ ปิดขั้นสุดท้าย"}{" "}
                  <IconArrow />
                </button>
                {next && (
                  <span className="org-hint">
                    ถัดไป: {next.time} {next.title}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="org-focus done">
              {awaitingCount > 0
                ? `ติ๊กครบทุกขั้นตอนของวันนี้แล้ว รอเจ้าภาพยืนยัน ${awaitingCount} ขั้นตอน`
                : "ดำเนินพิธีครบทุกขั้นตอนของวันนี้แล้ว (เจ้าภาพยืนยันครบ)"}
            </div>
          )}

          <ol className="org-steps">
            {steps.map((s) => {
              const st =
                s.status === "wait" && next && next.id === s.id
                  ? "next"
                  : s.status;
              return (
                <li key={s.id} className={`org-row ${st}`}>
                  <span className="mk" aria-hidden="true">
                    {s.status === "done" ? (
                      <IconCheck />
                    ) : s.status === "active" ? (
                      <i />
                    ) : s.status === "review" ? (
                      "…"
                    ) : s.status === "disputed" ? (
                      "!"
                    ) : (
                      pad(s.n)
                    )}
                  </span>
                  <div className="body">
                    <div className="line">
                      <span className="t">{s.time}</span>
                      <span className="ttl">{s.title}</span>
                    </div>
                    {s.status === "done" && (
                      <p className="note">
                        แจ้งเสร็จ {hhmm(s.doneAt)} โดย {s.doneByName} ·
                        เจ้าภาพยืนยัน {hhmm(s.confirmedAt)}
                      </p>
                    )}
                    {s.status === "review" && (
                      <p className="note">
                        แจ้งเสร็จ {hhmm(s.doneAt)} โดย {s.doneByName} ·
                        รอเจ้าภาพกดยืนยันว่าเสร็จจริง
                      </p>
                    )}
                    {s.status === "disputed" && (
                      <>
                        <p className="note">
                          เจ้าภาพแจ้งว่ายังไม่เสร็จ: {s.disputeNote}
                        </p>
                        <button
                          className="org-btn-black sm"
                          disabled={busy}
                          onClick={() => complete(s)}
                        >
                          แก้ไขแล้ว แจ้งเสร็จอีกครั้ง
                        </button>
                      </>
                    )}
                  </div>
                  <span className="state">
                    {s.status === "active" && "กำลังดำเนินการ"}
                    {s.status === "review" && "รอยืนยัน"}
                    {s.status === "disputed" && "ต้องแก้ไข"}
                    {st === "next" && "ถัดไป"}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="org-vendors">
          <div className="org-sec-head">
            <h2 className="org-h2">รับของจากคู่ค้า</h2>
            <span className="org-count">
              รับแล้ว {receivedList.length}/{vendors.length}
            </span>
          </div>
          {vendors.length === 0 && (
            <div className="org-empty">
              ยังไม่มีรายการ ไปที่แท็บ "ตรวจสอบคู่ค้า & พัสดุ" เพื่อเพิ่ม
            </div>
          )}
          {pending.map((v) => (
            <VendorCard key={v.id} v={v} busy={busy} onStep={vendorStep} />
          ))}
          {receivedList.length > 0 && (
            <ul className="org-donelist">
              {receivedList.map((v) => (
                <VendorDone key={v.id} v={v} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
};

// การ์ดของที่ยังรอตรวจรับ: ข้อมูลสำคัญ 1 บรรทัด + ปุ่มลงมือทำ
const VendorCard: React.FC<{
  v: OpsVendor;
  busy: boolean;
  onStep: (v: OpsVendor, s: VendorStatus) => void;
}> = ({ v, busy, onStep }) => {
  const sub = [
    v.category,
    v.partner,
    v.expectedTime ? `นัดส่ง ${v.expectedTime} น.` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <article className={`org-vcard ${v.status === "ARRIVED" ? "urgent" : ""}`}>
      <div className="top">
        <h4>{v.title}</h4>
        {v.status === "ARRIVED" && (
          <span className="org-badge hot">ของถึงแล้ว</span>
        )}
        {v.status === "SHIPPING" && (
          <span className="org-badge">กำลังจัดส่ง</span>
        )}
      </div>
      {sub && <p className="sub">{sub}</p>}
      {v.detail && <p className="detail">{v.detail}</p>}
      <div className="org-vact">
        {v.status === "SHIPPING" && (
          <button
            className="org-btn-outline"
            disabled={busy}
            onClick={() => onStep(v, "ARRIVED")}
          >
            แจ้งของถึงแล้ว
          </button>
        )}
        <button
          className="org-btn-black sm"
          disabled={busy}
          onClick={() => onStep(v, "RECEIVED")}
        >
          <IconCheck size={16} /> ตรวจรับของ
        </button>
      </div>
    </article>
  );
};

// ของที่ตรวจรับแล้ว: ย่อเหลือ 1 บรรทัด
const VendorDone: React.FC<{ v: OpsVendor }> = ({ v }) => (
  <li>
    <span className="ck">
      <IconCheck />
    </span>
    <span className="nm">{v.title}</span>
    <span className="by">
      {hhmm(v.receivedAt)} · {v.receivedByName}
    </span>
  </li>
);

/* =========================================================== คู่ค้า */
const VENDOR_EMPTY = {
  title: "",
  partner: "",
  category: "",
  expectedTime: "",
  detail: "",
};
const VendorsTab: React.FC<{ board: OpsBoard; busy: boolean; act: Act }> = ({
  board,
  busy,
  act,
}) => {
  const [form, setForm] = useState<typeof VENDOR_EMPTY | null>(null);
  const { vendors, job } = board;
  const pending = vendors.filter((v) => v.status !== "RECEIVED");
  const receivedList = vendors.filter((v) => v.status === "RECEIVED");
  const vendorStep = (v: OpsVendor, status: VendorStatus) =>
    act(
      () =>
        opsFetch(`/ops/vendors/${v.id}`, {
          method: "PATCH",
          body: { status },
        }),
      status === "RECEIVED" ? `ตรวจรับ "${v.title}" แล้ว` : undefined,
    );
  const seed = () =>
    act(async () => {
      const r = await opsFetch<{ created: number }>(
        `/ops/bookings/${job.id}/vendors/seed`,
        { method: "POST" },
      );
      if (r.created === 0)
        throw new Error("ไม่มีรายการใหม่ให้สร้าง (สร้างครบแล้ว)");
    }, "สร้างรายการตรวจรับจากตัวเลือกที่เจ้าภาพเลือกแล้ว");
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    await act(
      () =>
        opsFetch(`/ops/bookings/${job.id}/vendors`, {
          method: "POST",
          body: { ...form, expectedTime: form.expectedTime || undefined },
        }),
      "เพิ่มรายการตรวจรับแล้ว",
    );
    setForm(null);
  };
  return (
    <section className="org-sheet">
      <div className="org-sec-head">
        <h2 className="org-h2">
          ตรวจสอบคู่ค้าและพัสดุ{" "}
          <span className="org-count">
            ({receivedList.length}/{vendors.length})
          </span>
        </h2>
        <div className="org-actions">
          <button className="org-ghost" disabled={busy} onClick={seed}>
            สร้างจากที่เจ้าภาพเลือก
          </button>
          <button
            className="org-btn-black sm"
            onClick={() => setForm({ ...VENDOR_EMPTY })}
          >
            + เพิ่มรายการ
          </button>
        </div>
      </div>
      <p className="org-note">
        คู่ค้าต้องส่งมอบก่อนเริ่มพิธี ผู้ตรวจรับกดยืนยัน
        ระบบบันทึกชื่อและเวลาเป็นหลักฐาน ย้อนสถานะไม่ได้
      </p>
      {vendors.length === 0 && (
        <div className="org-empty">
          ยังไม่มีรายการ กด "สร้างจากที่เจ้าภาพเลือก" หรือ "+ เพิ่มรายการ"
        </div>
      )}
      {pending.length > 0 && (
        <>
          <h3 className="org-group">รอตรวจรับ ({pending.length})</h3>
          <div className="org-vgrid">
            {pending.map((v) => (
              <VendorCard key={v.id} v={v} busy={busy} onStep={vendorStep} />
            ))}
          </div>
        </>
      )}
      {receivedList.length > 0 && (
        <>
          <h3 className="org-group">ตรวจรับแล้ว ({receivedList.length})</h3>
          <ul className="org-donelist">
            {receivedList.map((v) => (
              <VendorDone key={v.id} v={v} />
            ))}
          </ul>
        </>
      )}
      {form && (
        <Modal title="เพิ่มรายการตรวจรับ" onClose={() => setForm(null)}>
          <form className="org-form" onSubmit={save}>
            <Field label="รายการที่ต้องตรวจรับ">
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <div className="org-form-row">
              <Field label="คู่ค้า / ผู้ส่งมอบ">
                <input
                  value={form.partner}
                  onChange={(e) =>
                    setForm({ ...form, partner: e.target.value })
                  }
                />
              </Field>
              <Field label="หมวด">
                <input
                  placeholder="เช่น ดอกไม้, อาหารว่าง"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                />
              </Field>
            </div>
            <div className="org-form-row">
              <Field label="เวลานัดส่งมอบ">
                <input
                  type="time"
                  value={form.expectedTime}
                  onChange={(e) =>
                    setForm({ ...form, expectedTime: e.target.value })
                  }
                />
              </Field>
              <Field label="รายละเอียด">
                <input
                  value={form.detail}
                  onChange={(e) => setForm({ ...form, detail: e.target.value })}
                />
              </Field>
            </div>
            <div className="org-form-actions">
              <button
                type="button"
                className="org-ghost"
                onClick={() => setForm(null)}
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="org-btn-black sm"
                disabled={busy}
              >
                บันทึก
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
};

/* =========================================================== กำหนดการ */
const ScheduleTab: React.FC<{
  board: OpsBoard;
  flash: (m: string, e?: boolean) => void;
}> = ({ board, flash }) => {
  const { job } = board;
  const [sched, setSched] = useState<ScheduleList | null>(null);
  const [assign, setAssign] = useState<{
    assignments: OpsAssignment[];
    persons: OpsPerson[];
  } | null>(null);
  const [pick, setPick] = useState({
    date: board.date,
    personId: "",
    role: "CHANT",
  });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([
        opsFetch<ScheduleList>(`/bookings/${job.id}/schedule`),
        opsFetch<{ assignments: OpsAssignment[]; persons: OpsPerson[] }>(
          `/ops/bookings/${job.id}/assignments`,
        ),
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
    if (
      sched &&
      sched.items.length > 0 &&
      !window.confirm(
        "มีกำหนดการอยู่แล้ว การสร้างใหม่จะแทนที่รายการเดิมทั้งหมด ดำเนินการต่อหรือไม่?",
      )
    )
      return;
    run(async () => {
      const r = await opsFetch<{
        count: number;
        warnings: { message: string }[];
      }>(`/bookings/${job.id}/schedule/generate`, { method: "POST" });
      if (r.warnings.length) flash(r.warnings[0].message, true);
    }, "สร้างกำหนดการพิธีอัตโนมัติแล้ว");
  };
  const doAssign = (e: React.FormEvent) => {
    e.preventDefault();
    run(
      () =>
        opsFetch(`/ops/bookings/${job.id}/assignments`, {
          method: "POST",
          body: pick,
        }),
      "จัดบุคลากรเข้ากำหนดการแล้ว",
    );
  };

  const dates = useMemo(
    () => [...new Set((sched?.items || []).map((i) => i.date))].sort(),
    [sched],
  );
  const person = assign?.persons.find((p) => p.id === pick.personId);
  const roleOptions = !person
    ? []
    : person.type === "MONK"
      ? ["CHIEF", "CHANT"]
      : ["MC"];

  return (
    <section className="org-sheet">
      <div className="org-sec-head">
        <h2 className="org-h2">กำหนดการพิธี</h2>
        <button
          className="org-btn-black sm"
          disabled={busy || !board.live}
          onClick={generate}
        >
          {sched && sched.items.length
            ? "สร้างกำหนดการใหม่"
            : "สร้างกำหนดการอัตโนมัติ"}
        </button>
      </div>
      {!sched ? (
        <div className="org-empty">กำลังโหลด...</div>
      ) : sched.items.length === 0 ? (
        <div className="org-empty">
          ยังไม่มีกำหนดการ กด "สร้างกำหนดการอัตโนมัติ"
          ระบบจะสร้างพิธีทั้งงานตามกฎของวัด
        </div>
      ) : (
        <div className="org-days">
          {dates.map((d) => (
            <div key={d} className="org-day">
              <h3>{thDate(d)}</h3>
              {sched.items
                .filter((i) => i.date === d)
                .map((i) => (
                  <div key={i._id} className="org-item">
                    <b>{i.time ? `${i.time} น.` : "ตลอดวัน"}</b>
                    <span>
                      {i.title}
                      <em>{TYPE_LABEL[i.type] || i.type}</em>
                    </span>
                  </div>
                ))}
              {(assign?.assignments || [])
                .filter((a) => a.date === d)
                .map((a) => (
                  <div key={a.id} className="org-item person">
                    <b>{ROLE_LABEL[a.role]}</b>
                    <span>
                      {a.name}
                      <button
                        className="org-link"
                        disabled={busy}
                        onClick={() =>
                          run(
                            () =>
                              opsFetch(`/ops/assignments/${a.id}`, {
                                method: "DELETE",
                              }),
                            "ยกเลิกการจัดบุคลากรแล้ว",
                          )
                        }
                      >
                        เอาออก
                      </button>
                    </span>
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}

      <h3 className="org-group">จัดพระสงฆ์ / มัคนายกเข้าพิธี</h3>
      {assign && assign.persons.length === 0 ? (
        <div className="org-empty">
          วัดนี้ยังไม่มีรายชื่อพระ/มัคนายกในระบบ (ผู้ดูแลระบบเพิ่มได้ที่หน้า
          ข้อมูลกลาง &gt; รายชื่อพระและมัคนายก)
        </div>
      ) : (
        <form className="org-inline" onSubmit={doAssign}>
          <Field label="วันที่">
            <select
              value={pick.date}
              onChange={(e) => setPick({ ...pick, date: e.target.value })}
            >
              {board.nights.map((d) => (
                <option key={d} value={d}>
                  {thDate(d)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="บุคลากร">
            <select
              required
              value={pick.personId}
              onChange={(e) => {
                const p = assign?.persons.find((x) => x.id === e.target.value);
                setPick({
                  ...pick,
                  personId: e.target.value,
                  role: p ? (p.type === "MONK" ? "CHANT" : "MC") : pick.role,
                });
              }}
            >
              <option value="">— เลือก —</option>
              {(assign?.persons || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (
                  {p.type === "MONK"
                    ? "พระ"
                    : p.type === "DEACON"
                      ? "มัคนายก"
                      : "พิธีกร"}
                  )
                </option>
              ))}
            </select>
          </Field>
          <Field label="หน้าที่">
            <select
              value={pick.role}
              onChange={(e) => setPick({ ...pick, role: e.target.value })}
            >
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </Field>
          <button
            type="submit"
            className="org-btn-black sm"
            disabled={busy || !pick.personId || !board.live}
          >
            จัดเข้าพิธี
          </button>
        </form>
      )}
    </section>
  );
};

/* =========================================================== สรุปงาน */
const SummaryTab: React.FC<{
  board: OpsBoard;
  flash: (m: string, e?: boolean) => void;
  onChanged: () => void;
}> = ({ board, flash, onChanged }) => {
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
        await opsFetch(`/ops/bookings/${job.id}/status`, {
          method: "PATCH",
          body: { status },
        });
      } catch (err) {
        if (err instanceof ApiError && err.code === "STEPS_UNCONFIRMED") {
          flash(err.message, true);
          return;
        }
        if (err instanceof ApiError && err.code === "VENDORS_PENDING") {
          if (
            !window.confirm(
              `${err.message}\nปิดงานทั้งที่ยังตรวจรับไม่ครบหรือไม่?`,
            )
          )
            return;
          await opsFetch(`/ops/bookings/${job.id}/status`, {
            method: "PATCH",
            body: { status, force: true },
          });
        } else throw err;
      }
      flash(
        status === "COMPLETED"
          ? "ปิดงานเรียบร้อย งานนี้ถูกบันทึกในประวัติของเจ้าหน้าที่วัดแล้ว"
          : "เริ่มดำเนินงานแล้ว",
      );
      onChanged();
      await load();
    } catch (err) {
      flash(errMsg(err), true);
    } finally {
      setBusy(false);
    }
  };

  if (!sum) return <div className="org-placeholder">กำลังโหลดสรุป...</div>;
  const pct = sum.steps.total
    ? Math.round((sum.steps.done / sum.steps.total) * 100)
    : 0;
  return (
    <section className="org-sheet">
      <div className="org-sec-head">
        <h2 className="org-h2">รายงานสรุปงาน</h2>
      </div>
      <div className="org-metrics flat">
        <div className="org-metric">
          <small>ขั้นตอนพิธี</small>
          <b>
            {sum.steps.done}/{sum.steps.total}
          </b>
          <span>
            เจ้าภาพยืนยันแล้ว {pct}%
            {sum.steps.awaitingHost > 0
              ? ` · รอยืนยัน ${sum.steps.awaitingHost} ขั้น`
              : ""}
          </span>
        </div>
        <div className="org-metric">
          <small>ตรวจรับคู่ค้า</small>
          <b>
            {sum.vendors.received}/{sum.vendors.total}
          </b>
          <span>
            {sum.vendors.total - sum.vendors.received === 0
              ? "ครบทุกรายการ"
              : `ค้าง ${sum.vendors.total - sum.vendors.received} รายการ`}
          </span>
        </div>
        <div className="org-metric">
          <small>บุคลากรที่จัดเข้าพิธี</small>
          <b>{sum.assignments}</b>
          <span>รายการจัดเวร</span>
        </div>
      </div>
      <table className="org-table">
        <thead>
          <tr>
            <th>วันที่</th>
            <th>ประเภท</th>
            <th>ขั้นตอนที่เสร็จ</th>
          </tr>
        </thead>
        <tbody>
          {sum.nights.map((n) => (
            <tr key={n.date}>
              <td>{thDate(n.date)}</td>
              <td>{n.kind === "CREMATION" ? "ฌาปนกิจ" : "สวดพระอภิธรรม"}</td>
              <td>
                {n.stepsTotal ? (
                  `${n.stepsDone} / ${n.stepsTotal}`
                ) : (
                  <span className="muted">ยังไม่เริ่ม</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="org-closebar">
        {sum.canComplete && sum.steps.awaitingHost > 0 && (
          <p className="org-wait-host">
            รอเจ้าภาพยืนยัน {sum.steps.awaitingHost} ขั้นตอน จึงจะปิดงานได้
          </p>
        )}
        <p>
          เจ้าภาพ {sum.job.hostName} · {sum.job.hallName} ·{" "}
          {thDate(sum.job.startISO)} – {thDate(sum.job.cremationISO)} ·
          แขกประมาณ {sum.job.guests} ท่าน
        </p>
        <div className="org-actions">
          {sum.canStart && (
            <button
              className="org-ghost"
              disabled={busy}
              onClick={() => setStatus("IN_PROGRESS")}
            >
              เริ่มดำเนินงาน
            </button>
          )}
          <button
            className="org-btn-black"
            disabled={busy || !sum.canComplete || sum.steps.awaitingHost > 0}
            onClick={() => setStatus("COMPLETED")}
            title={
              !sum.canComplete
                ? "ต้องเริ่มดำเนินงาน (ติ๊กขั้นตอนแรก) ก่อน จึงปิดงานได้"
                : sum.steps.awaitingHost > 0
                  ? "ต้องรอเจ้าภาพยืนยันทุกขั้นตอนก่อน"
                  : ""
            }
          >
            ปิดงาน <IconArrow />
          </button>
        </div>
      </div>
    </section>
  );
};

export default OrganizerBoard;
