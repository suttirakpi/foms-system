import React, { useEffect, useMemo, useState } from "react";
import type { AuthUser } from "../App";
import "./OrganizerBoard.css";

interface OrganizerBoardProps {
  currentUser: AuthUser | null;
  onNavigateHome: () => void;
  onLogout: () => void;
}

type StepStatus = "done" | "active" | "next" | "wait";

interface Step {
  n: number;
  time: string;
  range: string;
  title: string;
  desc: string;
  status: StepStatus;
  doneNote?: string;
}

interface Vendor {
  id: string;
  category: string;
  title: string;
  partner: string;
  timeLabel: string;
  timeValue: string;
  timeGold?: boolean;
  detail: string;
  status: "received" | "arrived" | "shipping";
  urgent?: boolean;
  footLeft?: { icon: "camera" | "bolt" | "truck"; text: string };
  ref?: string;
}

const INITIAL_STEPS: Step[] = [
  {
    n: 1, time: "16:30 น.", range: "16:30 – 17:00 น.",
    title: "จัดตั้งโต๊ะหมู่บูชาและเครื่องไทยธรรมประจำจุดพระสงฆ์ 4 รูป",
    desc: "", status: "done",
    doneNote: "บันทึกยืนยันเมื่อ 16:32 น. โดย นายเอกชัย (หัวหน้าจัดสถานที่)",
  },
  {
    n: 2, time: "17:15 น.", range: "17:15 – 18:00 น.",
    title: "ตรวจรับและติดตั้งชุดดอกไม้สดประดับหน้าหีบศพโทนขาว-ทอง",
    desc: "", status: "done",
    doneNote: "บันทึกยืนยันเมื่อ 17:18 น. โดย ร้านมาลัยพิสุทธิ์ (ผู้จัดส่ง) & คุณศิริพร",
  },
  {
    n: 3, time: "18:15 น.", range: "18:15 – 18:50 น.",
    title: "เปิดศาลาปรับอากาศ ต้อนรับครอบครัวเจ้าภาพและจัดเตรียมของว่าง",
    desc: "เจ้าหน้าที่อำนวยความสะดวก: คุณศิริพร สุวรรณโชติ และทีมต้อนรับชุดที่ 1",
    status: "active",
  },
  {
    n: 4, time: "18:45 น.", range: "18:45 – 19:00 น.",
    title: "นิมนต์พระภิกษุสงฆ์ 4 รูป ขึ้นสู่อาสน์สงฆ์ และจัดเตรียมเครื่องไทยธรรม",
    desc: "มัคนายกประสิทธิ์นำเทียนอาราธนาธรรม และจัดเตรียมที่นั่งประธานพิธีสงฆ์",
    status: "next",
  },
  {
    n: 5, time: "19:00 น.", range: "19:00 – 19:45 น.",
    title: "พิธีสวดพระอภิธรรม 7 คัมภีร์ 4 จบ โดย พระสงฆ์คณะกุฎี 6",
    desc: "จุดรูปเทียนบูชาพระรัตนตรัย ธูปเทียนหน้าตู้พระอภิธรรม และหน้าศพ",
    status: "wait",
  },
  {
    n: 6, time: "19:45 น.", range: "19:45 – 20:15 น.",
    title: "เจ้าภาพทอดผ้าบังสุกุล ถวายจตุปัจจัยไทยธรรม กรวดน้ำรับพร",
    desc: "เจ้าหน้าที่จัดเตรียมพานผ้ามหาบังสุกุลและกรวดน้ำทองเหลืองส่งมอบเจ้าภาพ",
    status: "wait",
  },
  {
    n: 7, time: "20:15 น.", range: "20:15 – 20:30 น.",
    title: "สรุปยอดซองร่วมทำบุญเข้าสมุดดิจิทัลและส่งมอบเจ้าภาพ",
    desc: "ตรวจนับและปิดบัญชีหน้างานร่วมกับตัวแทนครอบครัว พร้อมบันทึกภาพลายเซ็น",
    status: "wait",
  },
];

const INITIAL_VENDORS: Vendor[] = [
  {
    id: "v1",
    category: "พัสดุหมวดตกแต่งพิธี",
    title: "ชุดดอกไม้ประดับหน้าหีบศพ (โทนขาว-เขียวสุภาพ)",
    partner: "มาลัยพิสุทธิ์ ฟลอริสต์ (Florist Partner)",
    timeLabel: "เวลาส่งมอบ:",
    timeValue: "17:10 น. (ตรงเวลา) · ผู้ตรวจรับ: คุณศิริพร ส.",
    detail: "รายละเอียด: ดอกลิลลี่ขาว กล้วยไม้ เบญจมาศ พร้อมพวงมาลัยประธาน 1 พวง ติดตั้งเรียบร้อยตามแบบ",
    status: "received",
    footLeft: { icon: "camera", text: "แนบภาพถ่ายยืนยัน 3 ภาพ" },
    ref: "REC-2025-0891",
  },
  {
    id: "v2",
    category: "พัสดุโครงสร้าง & อุปกรณ์",
    title: "ตู้หีบเย็นรักษาสภาพ (ระบบดิจิทัลปรับอุณหภูมิ)",
    partner: "สยามหีบทองพรีเมียม (Coffin & Logistics)",
    timeLabel: "เวลาส่งมอบ:",
    timeValue: "15:40 น. · ตรวจสอบระบบไฟฟ้า: 100% ปกติ",
    detail: "อุณหภูมิตั้งค่าคงที่ 4.2°C ระบบสำรองไฟ UPS พร้อมใช้งานตลอด 24 ชั่วโมง",
    status: "received",
    footLeft: { icon: "bolt", text: "การทดสอบวงจรไฟฟ้า: สมบูรณ์" },
    ref: "REC-2025-0870",
  },
  {
    id: "v3",
    category: "พัสดุรับรองอาหารว่าง · เร่งด่วน",
    title: "ชุดอาหารว่างและเครื่องดื่มรับรองแขก VIP (150 กล่อง)",
    partner: "กานต์ตัวลัย เคเทอริ่ง (Catering Partner)",
    timeLabel: "สถานะส่งมอบ:",
    timeValue: "18:05 น. (รถขนส่งจอดเทียบข้างศาลา 2)",
    timeGold: true,
    detail: "รายการจัดส่ง: พายเห็ดทรัฟเฟิล + ขนมเปี๊ยะทองคำ + น้ำเก๊กฮวยอุ่น (บรรจุกล่องกระดาษคราฟต์สุภาพ)",
    status: "arrived",
    urgent: true,
  },
  {
    id: "v4",
    category: "ของที่ระลึก & หนังสือ",
    title: "ชุดของชำร่วยและหนังสือที่ระลึกงานสวด (120 ชุด)",
    partner: "โรงพิมพ์สุวรรณภูมิการพิมพ์",
    timeLabel: "เวลานัดหมาย:",
    timeValue: "18:30 น. (อยู่ระหว่างการเดินทาง ห่าง 3 กม.)",
    detail: "หนังสืออบทสวดมนต์ปกแข็งสีงาช้าง พร้อมถุงผ้าสปันบอนด์สีกากีสุภาพ",
    status: "shipping",
    footLeft: { icon: "truck", text: "คนขับ: คุณสมพร (084-219-9xxx)" },
    ref: "PO-2025-1104",
  },
];

const NAV = [
  { key: "live", th: "หน้างานวันนี้", en: "Live Ops - Active" },
  { key: "vendors", th: "ตรวจสอบคู่ค้า & พัสดุ", en: "Vendors" },
  { key: "ledger", th: "บันทึกซองทำบุญ", en: "Ledger" },
  { key: "schedule", th: "กำหนดการพิธี", en: "Schedule" },
  { key: "summary", th: "รายงานสรุปงาน", en: "Summary" },
];

/* ---------- icons ---------- */
const Svg: React.FC<{ size?: number; children: React.ReactNode }> = ({ size = 16, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    style={{ display: "block", flexShrink: 0 }}>
    {children}
  </svg>
);
const IconCheck = ({ size = 14 }: { size?: number }) => <Svg size={size}><path d="M20 6 9 17l-5-5" /></Svg>;
const IconHistory = () => <Svg size={14}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></Svg>;
const IconShieldCheck = () => <Svg size={18}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></Svg>;
const IconArrow = () => <Svg size={18}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></Svg>;
const IconCamera = () => <Svg size={14}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" /><circle cx="12" cy="13" r="3" /></Svg>;
const IconBolt = () => <Svg size={14}><path d="M13 2 3 14h9l-1 8 10-12h-9z" /></Svg>;
const IconTruck = () => <Svg size={14}><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></Svg>;
const IconChecklist = () => <Svg size={18}><path d="m3 17 2 2 4-4" /><path d="m3 7 2 2 4-4" /><path d="M13 6h8" /><path d="M13 12h8" /><path d="M13 18h8" /></Svg>;
const IconUser = () => <Svg size={18}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></Svg>;
const IconShieldUser = () => <Svg size={22}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><circle cx="12" cy="10" r="2" /><path d="M8.5 16c.5-1.7 1.8-2.5 3.5-2.5s3 .8 3.5 2.5" /></Svg>;

const footIcon = (i: "camera" | "bolt" | "truck") =>
  i === "camera" ? <IconCamera /> : i === "bolt" ? <IconBolt /> : <IconTruck />;

const pad = (n: number) => String(n).padStart(2, "0");
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())} น.`;

export const OrganizerBoard: React.FC<OrganizerBoardProps> = ({
  currentUser,
  onNavigateHome,
  onLogout,
}) => {
  const [nav, setNav] = useState("live");
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [vendors, setVendors] = useState<Vendor[]>(INITIAL_VENDORS);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const organizerName = currentUser?.name ?? "คุณศิริพร สุวรรณโชติ";
  const active = steps.find((s) => s.status === "active");
  const doneCount = steps.filter((s) => s.status === "done").length;
  const progress = Math.floor(((doneCount + (active ? 0.5 : 0)) / steps.length) * 100);
  const receivedCount = vendors.filter((v) => v.status === "received").length;
  const quality = Math.round((receivedCount / vendors.length) * 100);
  const pending = vendors.filter((v) => v.status === "arrived").length;
  const activeNav = NAV.find((n) => n.key === nav)!;

  const nextQueue = () => {
    const stamp = hhmm(new Date());
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.status === "active");
      if (idx === -1) return prev;
      return prev.map((s, i) => {
        if (i === idx) return { ...s, status: "done" as StepStatus, doneNote: `บันทึกยืนยันเมื่อ ${stamp} โดย ${organizerName}` };
        if (i === idx + 1) return { ...s, status: "active" as StepStatus };
        if (i === idx + 2) return { ...s, status: "next" as StepStatus };
        return s;
      });
    });
  };

  const markReceived = (id: string) =>
    setVendors((prev) => prev.map((v) => (v.id === id ? { ...v, status: "received", urgent: false } : v)));

  const stats = useMemo(
    () => [
      {
        no: "01", label: "สถานะงาน", value: "สวดพระอภิธรรม คืนที่ ๓",
        sub: "กำลังต้อนรับแขก & จัดเตรียมไทยธรรม",
        foot: ["มาตรฐานพิธีการ: สงบ เรียบร้อย", "ระดับสูงสุด", true] as const,
      },
      {
        no: "02", label: "กำหนดเวลาหลัก", value: "18:00 – 20:30 น.",
        sub: "คิวนิมนต์พระสงฆ์ในอีก ๒๗ นาที",
        foot: ["ความคืบหน้ารวม", `${progress}%`, false] as const,
      },
      {
        no: "03", label: "ตรวจรับคู่ค้า", value: `${receivedCount} / ${vendors.length} รายการครบถ้วน`,
        sub: pending > 0 ? `รอส่งมอบอาหารว่าง ${pending} รายการ (กำลังลงของ)` : "ตรวจรับครบทุกรายการแล้ว",
        foot: ["ตรวจคุณภาพแล้ว", `${quality}%`, true] as const,
      },
      {
        no: "04", label: "แขกผู้มีเกียรติ", value: "ประมาณการ 120–150 ท่าน",
        sub: "เก้าอี้และเครื่องปรับอากาศรองรับ 100%",
        foot: ["ที่นั่ง VIP เจ้าภาพ", "สำรองพร้อม", false] as const,
      },
    ],
    [progress, receivedCount, vendors.length, pending, quality],
  );

  return (
    <div className="org">
      {/* ===== Top bar ===== */}
      <header className="org-top">
        <div className="org-brand">
          <b>FOMS</b>
          <span>ORGANIZER &amp; ON-SITE OPERATIONS</span>
        </div>
        <nav className="org-nav">
          {NAV.map((n) => (
            <button key={n.key} className={nav === n.key ? "active" : ""} onClick={() => setNav(n.key)}>
              {n.th} ({n.en})
            </button>
          ))}
        </nav>
        <div className="org-top-right">
          <div className="org-team">
            <b>ทีมพิธีการชุดที่ 1 · ปฏิบัติการสด</b>
            <span>ผู้ประสานงาน: {organizerName}</span>
          </div>
          <button className="org-user" onClick={onLogout} title="ออกจากระบบ" aria-label="ออกจากระบบ">
            <IconUser />
          </button>
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

        {nav !== "live" ? (
          <div className="org-placeholder">ส่วน “{activeNav.th}” ยังไม่ได้ทำ</div>
        ) : (
          <>
            <div className="org-eyebrow"><i />CEREMONIAL TERMINAL · ศาลา ๒ (เมตตาธรรม)</div>
            <section className="org-hero">
              <div>
                <h1>กระดานบริหารงานพิธีการหน้างาน <small>(Organizer Operations Board)</small></h1>
                <p>ระบบควบคุมลำดับพิธีการแบบเรียลไทม์ ตรวจรับของส่งมอบจากคู่ค้า และบันทึกขั้นตอนประจำวัน ณ ศาลา ๒ วัดศรีสุคต พระอารามหลวง</p>
              </div>
              <div className="org-live">
                <b><i />ระบบเชื่อมต่อสด</b>
                <span>{pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())} น. · ซิงค์ข้อมูลล่าสุด</span>
              </div>
            </section>

            {/* ===== Stats ===== */}
            <section className="org-stats">
              {stats.map((s) => (
                <div className="org-stat" key={s.no}>
                  <div className="org-stat-top"><span className="no">{s.no}</span><span>{s.label}</span></div>
                  <h3>{s.value}</h3>
                  <p>{s.sub}</p>
                  <div className="org-stat-foot">
                    <span>{s.foot[0]}</span>
                    <b className={s.foot[2] ? "gold" : ""}>{s.foot[1]}</b>
                  </div>
                </div>
              ))}
            </section>

            <div className="org-cols">
              {/* ===== Run queue ===== */}
              <section className="org-queue">
                <div className="org-sec-head">
                  <div>
                    <small>คิวพิธีการประจำคืนนี้</small>
                    <h2>Live Ceremonial Run-Queue</h2>
                  </div>
                  <span className="org-chip warn"><i />กำลังดำเนินงาน (In Progress)</span>
                </div>

                {active ? (
                  <div className="org-active">
                    <div className="org-active-top">
                      <span><em>คิวปัจจุบัน · ACTIVE STEP {pad(active.n)}</em> {active.range}</span>
                      <span className="coord">ผู้ประสานงานหลัก: คุณศิริพร</span>
                    </div>
                    <h3>ต้อนรับแขกเกียรติยศและเสิร์ฟน้ำดื่มสมุนไพร / อาหารว่าง</h3>
                    <p>เปิดรับรองแขกหน้าศาลา ให้ทีมบริการประจำจุดประตูทางเข้า จัดเตรียมสมุดลงนามดิจิทัล และประสานงานส่งมอบของว่าง VIP เมื่อแขกนั่งประจำที่</p>
                    <div className="org-active-foot">
                      <span><IconShieldCheck /> ตรวจสอบความพร้อมของเจ้าหน้าที่: ครบ 4 จุด</span>
                      <button className="org-btn-black" onClick={nextQueue}>
                        ข้ามไปยังคิวถัดไป (Next Queue) <IconArrow />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="org-active done-all">ดำเนินพิธีครบทุกขั้นตอนแล้ว</div>
                )}

                <ol className="org-timeline">
                  {steps.map((s) => (
                    <li key={s.n} className={`org-step ${s.status}`}>
                      <span className="marker">
                        {s.status === "done" ? <IconCheck /> : s.status === "active" ? <i /> : pad(s.n)}
                      </span>
                      <div className="card">
                        <div className="row">
                          <span className="meta">
                            STEP {pad(s.n)} · {s.time}
                            {s.status === "active" && <em>กำลังดำเนินการ</em>}
                          </span>
                          <span className={`tag ${s.status}`}>
                            {s.status === "done" && "เสร็จสิ้นแล้ว"}
                            {s.status === "active" && "ประจำหน้างาน"}
                            {s.status === "next" && "รอเริ่ม (Queue Next)"}
                            {s.status === "wait" && "รอเริ่ม"}
                          </span>
                        </div>
                        <h4>{s.title}</h4>
                        {s.status === "done" ? (
                          <p className="note"><IconHistory /> {s.doneNote}</p>
                        ) : (
                          <p>{s.desc}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>

              {/* ===== Vendors ===== */}
              <section className="org-vendors">
                <div className="org-sec-head">
                  <div>
                    <small>การตรวจรับของหน้างาน</small>
                    <h2>On-site Vendor Inspection</h2>
                  </div>
                  <span className="org-chip">{vendors.length} รายการพันธมิตร</span>
                </div>

                <div className="org-rule">
                  <b>ระเบียบมาตรฐานการควบคุม FOMS</b>
                  <p>คู่ค้าต้องส่งมอบและถ่ายภาพยืนยันก่อนเริ่มพิธี 60 นาที โดยตัวแทนออร์แกไนเซอร์ต้องตรวจนับจำนวนและความเรียบร้อยก่อนลงนาม</p>
                </div>

                {vendors.map((v) => (
                  <article key={v.id} className={`org-vcard ${v.urgent ? "urgent" : ""}`}>
                    <div className="row">
                      <small>{v.category}</small>
                      {v.status === "received" && <span className="org-badge black">ตรวจรับสมบูรณ์ <IconCheck size={12} /></span>}
                      {v.status === "arrived" && <span className="org-badge yellow"><i />รถถึงลานจอดแล้ว</span>}
                      {v.status === "shipping" && <span className="org-badge yellow">กำลังจัดส่ง</span>}
                    </div>
                    <h4>{v.title}</h4>
                    <p><b>คู่ค้า:</b> {v.partner}</p>
                    <p><b>{v.timeLabel}</b> <span className={v.timeGold ? "gold" : ""}>{v.timeValue}</span></p>
                    <div className="detail">{v.detail}</div>

                    {v.status === "arrived" ? (
                      <>
                        <button className="org-btn-outline" onClick={() => markReceived(v.id)}>
                          <IconChecklist /> ตรวจรับและลงนาม (Mark as Received)
                        </button>
                        <div className="links">
                          <button onClick={() => alert("เปิดกล้อง (ยังไม่เชื่อมระบบ)")}>แนบภาพถ่ายหน้างาน (Take Photo)</button>
                          <span>รอการยืนยันจำนวน</span>
                        </div>
                      </>
                    ) : (
                      <div className="foot">
                        <span>{v.footLeft && footIcon(v.footLeft.icon)} {v.footLeft?.text}</span>
                        <code>{v.ref}</code>
                      </div>
                    )}
                  </article>
                ))}
              </section>
            </div>

            {/* ===== Rules + contacts ===== */}
            <section className="org-rules">
              <div className="left">
                <IconShieldUser />
                <div>
                  <b>ระเบียบปฏิบัติงานผู้ประสานงาน FOMS ON-SITE ORGANIZER</b>
                  <p>ทุกขั้นตอนพิธีและการตรวจรับสิ่งของต้องได้รับการกดยืนยันผ่าน Terminal นี้เพื่อบันทึกลงสู่ Audit Log แบบ Real-time ครอบครัวเจ้าภาพและเจ้าหน้าที่สำนักงานวัดสามารถตรวจสอบสถานะได้โปร่งใสตลอดเวลา</p>
                </div>
              </div>
              <div className="right">
                <small>ช่องทางติดต่อฉุกเฉินเฉพาะพื้นที่ ศาลา ๒</small>
                <div className="contacts">
                  <div><span>ฝ่ายอาคารสถานที่วัด:</span><b>02-998-0119 ต่อ 104</b></div>
                  <div><span>มัคนายกประสิทธิ์:</span><b>081-445-9821</b></div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="org-footer">
        <div className="cols">
          <div>
            <b className="t">หน่วยงานบริหารและควบคุมพิธีการส่วนกลาง</b>
            <p>FOMS On-Site Terminal — บันทึกและควบคุมข้อมูลพิธีการเฉพาะพื้นที่จริงเพื่อความถูกต้องตามระเบียบพิธี</p>
          </div>
          <div>
            <b className="t gold">ระบบรักษาความปลอดภัยและการตรวจสอบ</b>
            <p>บัญชีซองและธุรกรรมทั้งหมดได้รับการบันทึกหลักฐานการแก้ไข (Immutable Audit Trail) ตามมาตรฐานความโปร่งใส</p>
          </div>
          <div>
            <b className="t">สายด่วนปฏิบัติการฉุกเฉินหน้างาน</b>
            <p><b>ศูนย์สนับสนุนส่วนกลาง:</b> 02-998-0119 (ตลอด 24 ชม.)<br /><b>หัวหน้าทีมพิธีการภาคสนาม:</b> 089-114-8833</p>
          </div>
        </div>
        <div className="bottom">
          <span>© 2025 FOMS. Ceremonial Protocol &amp; Funeral Operations Management. All rights reserved.</span>
          <b>CEREMONIAL TERMINAL NODE #01 · WAT THEPSIRIN</b>
        </div>
      </footer>
    </div>
  );
};

export default OrganizerBoard;