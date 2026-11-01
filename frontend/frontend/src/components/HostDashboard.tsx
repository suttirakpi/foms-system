import React, { useState, useEffect } from "react";
import { Navbar } from "./Navbar";
import { AuthUser } from "../App";
import "./HostDashboard.css";
import { API_URL } from "../config";
import { HostPayment } from "./HostPayment";
import { HostSchedule, HostScheduleItem, errMsg, hostFetch } from "../hostApi";

interface HostDashboardProps {
  isLoggedIn?: boolean;
  userName?: string;
  currentUser?: AuthUser | null;
  onNavigateHome?: () => void;
  onNavigateLogin?: () => void;
  onNavigateRegister?: () => void;
  onNavigateBooking?: () => void;
  onNavigateDashboard?: () => void;
  onLogout?: () => void;
}

interface BookingDetail {
  _id: string;
  bookingRef: string;
  hostName: string;
  deceasedName: string;
  templeName: string;
  hallName: string;
  startDate: string;
  endDate: string;
  nights: number;
  guests: number;
  packageName: string;
  packageBasePrice: number;
  snackPerHead: number;
  addons: { name: string; price: number }[];
  pricing: {
    hallTotal: number;
    snackTotal: number;
    addonsTotal: number;
    grandTotal: number;
  };
  status: "PENDING" | "CONFIRMED" | "PAID" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  paymentStatus?: "UNPAID" | "SLIP_UPLOADED" | "PARTIAL" | "PAID";
  paymentSlipUrl?: string;
  shareToken?: string;
  updatedAt: string;
}

export const HostDashboard: React.FC<HostDashboardProps> = ({
  isLoggedIn = true,
  userName,
  currentUser,
  onNavigateHome,
  onNavigateLogin,
  onNavigateRegister,
  onNavigateBooking,
  onNavigateDashboard,
  onLogout,
}) => {
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<BookingDetail[]>([]);
  const [schedule, setSchedule] = useState<HostScheduleItem[]>([]);
  const [shareToken, setShareToken] = useState("");
  const [shareBusy, setShareBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchMyBooking = async () => {
    try {
      setLoading(true);
      // เซิร์ฟเวอร์ใช้ผู้ใช้จาก cookie (JWT) ไม่ต้องส่ง hostId
      const res = await fetch(`${API_URL}/api/bookings/my`, { credentials: "include" });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setList(data);
        setBooking(data[0]); // ค่าเริ่มต้น = ใบจองล่าสุด
      } else {
        setList([]);
        setBooking(null);
      }
    } catch (err) {
      console.error("Failed to fetch booking:", err);
    } finally {
      setLoading(false);
    }
  };

  // โหลดสถานะงานใหม่แบบเงียบๆ (ไม่กระพริบหน้าจอ) หลังชำระเงิน/ส่งสลิป
  const refreshBooking = async () => {
    if (!booking) return;
    try {
      const res = await fetch(`${API_URL}/api/bookings/my`, { credentials: "include" });
      const data = await res.json();
      if (Array.isArray(data)) {
        setList(data);
        const fresh = data.find((b: BookingDetail) => b._id === booking._id);
        if (fresh) setBooking(fresh);
      }
    } catch {
      /* ไม่ต้องทำอะไร ค่าเดิมยังแสดงอยู่ */
    }
  };

  useEffect(() => {
    fetchMyBooking();
  }, [currentUser]);

  // กำหนดการจริงของงาน (เจ้าหน้าที่/ทีมจัดงานสร้างไว้) และลิงก์บัตรเชิญที่เคยสร้าง
  useEffect(() => {
    setShareToken(booking?.shareToken || "");
    setSchedule([]);
    if (!booking) return;
    let cancelled = false;
    hostFetch<HostSchedule>(`/bookings/${booking._id}/schedule`)
      .then((r) => !cancelled && setSchedule(r.items))
      .catch(() => !cancelled && setSchedule([]));
    return () => {
      cancelled = true;
    };
  }, [booking?._id, booking?.status]);

  const createShare = async () => {
    if (!booking) return;
    setShareBusy(true);
    try {
      const r = await hostFetch<{ token: string }>(`/bookings/${booking._id}/share`, { method: "POST" });
      setShareToken(r.token);
    } catch (err) {
      alert(errMsg(err));
    } finally {
      setShareBusy(false);
    }
  };
  const revokeShare = async () => {
    if (!booking || !window.confirm("ยกเลิกลิงก์บัตรเชิญนี้ใช่หรือไม่? คนที่ได้รับลิงก์เดิมจะเปิดดูไม่ได้อีก")) return;
    setShareBusy(true);
    try {
      await hostFetch(`/bookings/${booking._id}/share`, { method: "DELETE" });
      setShareToken("");
    } catch (err) {
      alert(errMsg(err));
    } finally {
      setShareBusy(false);
    }
  };
  const inviteUrl = shareToken ? `${window.location.origin}/#invite/${shareToken}` : "";
  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("คัดลอกลิงก์นี้", inviteUrl);
    }
  };

  // ฟังก์ชันช่วยแปลงวันที่เป็นภาษาไทย
  const formatThaiDate = (dateStr: string, addDays = 0) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + addDays);
    return d.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // ยกเลิกคำขอจอง
  const handleCancelBooking = async () => {
    if (!booking) return;
    if (!window.confirm("ยืนยันการยกเลิกคำขอจองศาลานี้ใช่หรือไม่?")) return;

    try {
      const res = await fetch(`${API_URL}/api/bookings/${booking._id}/cancel`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("ยกเลิกไม่สำเร็จ");
      const updated = await res.json();
      setBooking(updated);
      alert("ยกเลิกคำขอจองเรียบร้อยแล้ว");
    } catch (err: any) {
      alert(err.message);
    }
  };

  // 0 = รอวัดอนุมัติ, 1 = อนุมัติแล้ว/รอชำระ, 2 = ชำระครบ, 3 = เสร็จสิ้น
  const currentStepIndex = !booking
    ? 0
    : booking.status === "COMPLETED"
      ? 3
      : booking.status === "PAID" || booking.paymentStatus === "PAID"
        ? 2
        : ["CONFIRMED", "IN_PROGRESS"].includes(booking.status)
          ? 1
          : 0;

  // จัดกลุ่มกำหนดการจริงตามวัน
  const schedDates = [...new Set(schedule.map((i) => i.date))].sort();
  const SCHED_TYPE: Record<string, string> = { BATHING: "พิธีสรงน้ำศพ", CHANT: "สวดพระอภิธรรม", CREMATION: "พิธีฌาปนกิจ", MERIT: "ทำบุญอุทิศส่วนกุศล" };
  const ROLE_TH: Record<string, string> = { CHIEF: "พระประธาน", CHANT: "พระสวด", MC: "มัคนายก/พิธีกร" };
  const thDay = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("th-TH", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
  };

  return (
    <div className="dashboard-wrapper">
      <Navbar
        currentView="dashboard"
        isLoggedIn={isLoggedIn}
        userName={userName}
        onNavigateHome={onNavigateHome}
        onNavigateLogin={onNavigateLogin}
        onNavigateRegister={onNavigateRegister}
        onNavigateBooking={onNavigateBooking}
        onNavigateDashboard={onNavigateDashboard}
        onLogout={onLogout}
      />

      {loading ? (
        <div style={{ textAlign: "center", padding: "5rem" }}>
          กำลังดึงข้อมูลรายการจองจากฐานข้อมูล...
        </div>
      ) : !booking ? (
        <div style={{ textAlign: "center", padding: "5rem" }}>
          <h2>ยังไม่มีรายการจองศาลาในระบบ</h2>
          <p style={{ color: "var(--ink-soft)", marginBottom: "2rem" }}>
            ท่านสามารถเริ่มต้นเลือกวัด ศาลา
            และแพ็กเกจเพื่อสร้างกำหนดการพิธีได้ทันที
          </p>
          <button
            className="btn-solid-black"
            style={{ maxWidth: "280px", margin: "0 auto" }}
            onClick={onNavigateBooking}
          >
            ไปยังหน้าจองศาลาและแพ็กเกจ ➔
          </button>
        </div>
      ) : (
        <>
          <div className="dashboard-header">
            <div className="breadcrumb">
              <span className="breadcrumb-link" onClick={onNavigateHome}>
                หน้าหลัก
              </span>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-current">งานของฉัน</span>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-current">{booking.bookingRef}</span>
            </div>
            <span className="dashboard-pretitle">
              HOST DASHBOARD - รายละเอียดงานพิธีการ
            </span>
            <h1 className="dashboard-title">
              กำหนดการและสถานะงานพิธี (Ref: {booking.bookingRef})
            </h1>
            <div className="dashboard-subtitle">
              {booking.templeName} — {booking.hallName} · เจ้าภาพ:{" "}
              {booking.hostName}
            </div>
            {list.length > 1 && (
              <div className="booking-picker">
                งานของฉัน ({list.length} งาน)
                <select value={booking._id} onChange={(e) => setBooking(list.find((b) => b._id === e.target.value) || booking)}>
                  {list.map((b) => (
                    <option key={b._id} value={b._id}>{b.bookingRef} · {b.deceasedName} ({b.status})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="dashboard-container">
            {/* --- Status Tracker Card --- */}
            <div className="status-tracker-card">
              <div className="status-tracker-header">
                <span>สถานะคำขออัปเดตจากฐานข้อมูล</span>
                <span>
                  อัปเดตล่าสุด:{" "}
                  {new Date(booking.updatedAt).toLocaleString("th-TH")}
                </span>
              </div>

              <div className="stepper-container">
                <div className="stepper-line" />

                <div
                  className={`step-item ${
                    currentStepIndex > 0
                      ? "completed"
                      : currentStepIndex === 0
                        ? "active"
                        : "disabled"
                  }`}
                >
                  <div className="step-icon">
                    {currentStepIndex > 0 ? "✓" : <div className="step-dot" />}
                  </div>
                  <div className="step-label">01 PENDING</div>
                  <div className="step-title">รอวัดอนุมัติ</div>
                  <div className="step-desc">ส่งคำขอจองศาลาแล้ว</div>
                </div>

                <div
                  className={`step-item ${
                    currentStepIndex > 1
                      ? "completed"
                      : currentStepIndex === 1
                        ? "active"
                        : "disabled"
                  }`}
                >
                  <div className="step-icon">
                    {currentStepIndex > 1 ? (
                      "✓"
                    ) : currentStepIndex === 1 ? (
                      <div className="step-dot" />
                    ) : null}
                  </div>
                  <div className="step-label">02 CONFIRMED</div>
                  <div className="step-title">อนุมัติแล้ว - รอชำระเงิน</div>
                  <div className="step-desc">เลือกแผนและส่งสลิปโอนเงิน</div>
                </div>

                <div
                  className={`step-item ${
                    currentStepIndex > 2
                      ? "completed"
                      : currentStepIndex === 2
                        ? "active"
                        : "disabled"
                  }`}
                >
                  <div className="step-icon">
                    {currentStepIndex > 2 ? (
                      "✓"
                    ) : currentStepIndex === 2 ? (
                      <div className="step-dot" />
                    ) : null}
                  </div>
                  <div className="step-label">03 PAID</div>
                  <div className="step-title">ชำระเงินครบแล้ว</div>
                  <div className="step-desc">เจ้าหน้าที่ตรวจสลิปผ่านครบ</div>
                </div>

                <div
                  className={`step-item ${
                    currentStepIndex === 3 ? "completed" : "disabled"
                  }`}
                >
                  <div className="step-icon">
                    {currentStepIndex === 3 ? "✓" : null}
                  </div>
                  <div className="step-label">04 COMPLETED</div>
                  <div className="step-title">พิธีการเสร็จสมบูรณ์</div>
                  <div className="step-desc">สรุปเอกสารปิดงาน</div>
                </div>
              </div>

              <div className="status-warning-banner">
                <span className="warning-icon">ⓘ</span> สถานะปัจจุบัน:{" "}
                <strong>{booking.status}</strong> —{" "}
                {booking.status === "PENDING" &&
                  "คำขอจองของท่านอยู่ระหว่างรอเจ้าหน้าที่วัดตรวจสอบและอนุมัติคิวศาลา"}
                {booking.status === "CONFIRMED" &&
                  "วัดอนุมัติคำขอแล้ว กรุณาเลือกแผนและชำระเงินในกล่องด้านขวา แล้วแนบสลิปให้เจ้าหน้าที่ตรวจสอบ"}
                {booking.status === "PAID" &&
                  "ชำระเงินครบถ้วนแล้ว ทีมจัดงานจะดูแลพิธีตามกำหนดการ"}
                {booking.status === "IN_PROGRESS" &&
                  "พิธีกำลังดำเนินการ ทีมจัดงานหน้างานกำลังดูแลตามกำหนดการ"}
                {booking.status === "COMPLETED" &&
                  "พิธีเสร็จสมบูรณ์แล้ว ขอบคุณที่ไว้วางใจให้เราดูแลพิธี"}
                {booking.status === "CANCELLED" && "รายการจองนี้ถูกยกเลิกแล้ว"}
              </div>
            </div>

            {/* --- Main 2 Columns --- */}
            <div className="dashboard-grid">
              {/* Left Column: Dynamic Timeline & E-Card */}
              <div className="dashboard-left">
                <div
                  className="dashboard-card"
                  style={{ marginBottom: "1.5rem" }}
                >
                  <span className="card-pretitle">CEREMONIAL TIMELINE</span>
                  <h3>
                    กำหนดการพิธีบำเพ็ญกุศล ({formatThaiDate(booking.startDate)}{" "}
                    – {formatThaiDate(booking.startDate, booking.nights)})
                  </h3>

                  {schedule.length > 0 ? (
                    <div className="real-sched">
                      {schedDates.map((d) => (
                        <div key={d} className="rs-day">
                          <h4>{thDay(d)}</h4>
                          {schedule.filter((i) => i.date === d).map((i) => (
                            <div key={i._id} className="rs-row">
                              <b>{i.time ? `${i.time} น.` : "ตลอดวัน"}</b>
                              <span>
                                {i.title}
                                <em>
                                  {SCHED_TYPE[i.type] || i.type}
                                  {i.persons.length > 0 && ` · ${i.persons.map((p) => `${ROLE_TH[p.role] || p.role}: ${p.name}`).join(", ")}`}
                                </em>
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                  <div className="timeline-container">
                    <div className="timeline-item active">
                      <div className="timeline-dot" />
                      <div className="timeline-date">
                        วันที่ 1 ({formatThaiDate(booking.startDate)}){" "}
                        <span className="timeline-tag">- วันเริ่มพิธีการ</span>
                      </div>
                      <div className="timeline-event">
                        <div className="event-time">16:30 น.</div>
                        <div>พิธีรดน้ำศพและบรรจุหีบ ณ {booking.hallName}</div>
                      </div>
                      <div className="timeline-event">
                        <div className="event-time">19:00 น.</div>
                        <div>สวดพระอภิธรรม คืนที่ 1 (พระสงฆ์ 4 รูป)</div>
                      </div>
                    </div>

                    {booking.nights > 1 && (
                      <div className="timeline-item">
                        <div className="timeline-dot" />
                        <div className="timeline-date">
                          คืนที่ 2 – {booking.nights} (
                          {formatThaiDate(booking.startDate, 1)} ถึง{" "}
                          {formatThaiDate(
                            booking.startDate,
                            booking.nights - 1,
                          )}
                          ){" "}
                          <span className="timeline-tag gold-tag">
                            - สวดพระอภิธรรมต่อเนื่อง
                          </span>
                        </div>
                        <div className="timeline-event">
                          <div className="event-time">19:00 น.</div>
                          <div>
                            พิธีสวดพระอภิธรรมประจำคืน ณ {booking.hallName}{" "}
                            (รองรับแขก {booking.guests} ท่าน/คืน)
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="timeline-item">
                      <div className="timeline-dot dark-dot" />
                      <div className="timeline-date">
                        วันฌาปนกิจ (
                        {formatThaiDate(booking.startDate, booking.nights)}){" "}
                        <span className="timeline-tag dark-tag">
                          - พิธีประชุมเพลิง
                        </span>
                      </div>
                      <div className="timeline-event">
                        <div className="event-time">10:30 น.</div>
                        <div>พระสงฆ์แสดงพระธรรมเทศนาและถวายภัตตาหารเพล</div>
                      </div>
                      <div className="timeline-event">
                        <div className="event-time">16:00 น.</div>
                        <div>พิธีฌาปนกิจ ณ เมรุ {booking.templeName}</div>
                      </div>
                    </div>
                  </div>
                  <p className="sched-note">กำหนดการเบื้องต้นตามแพ็กเกจ เจ้าหน้าที่วัดจะยืนยันกำหนดการจริงให้หลังอนุมัติ</p>
                    </>
                  )}
                </div>

                <div className="dashboard-card">
                  <span className="card-pretitle">INVITATION ASSET</span>
                  <h3>บัตรเชิญดิจิทัล (E-Card Memorial Invitation)</h3>

                  <div className="ecard-preview-box">
                    <div className="ecard-pre">บันทึกความอาลัย</div>
                    <div className="ecard-name">{booking.deceasedName}</div>
                    <div className="ecard-desc">
                      ขอเรียนเชิญร่วมพิธีบำเพ็ญกุศลและพิธีฌาปนกิจ ณ{" "}
                      {booking.hallName} {booking.templeName}
                      <br />
                      ระหว่างวันที่ {formatThaiDate(booking.startDate)} –{" "}
                      {formatThaiDate(booking.startDate, booking.nights)}
                      <br />
                      <br />
                      <span className="ecard-ref">
                        รหัสอ้างอิง: {booking.bookingRef}
                      </span>
                    </div>
                  </div>

                  <div className="ecard-actions">
                    <button
                      className="btn-download-ecard"
                      onClick={() => window.print()}
                    >
                      <span>↓</span> ดาวน์โหลด E-Card บัตรเชิญ (PDF / Print)
                    </button>
                    <div className="ecard-note">
                      สร้างจากข้อมูลจริงในฐานข้อมูลอัตโนมัติ
                    </div>
                  </div>

                  {booking.status !== "CANCELLED" && (
                    <div className="share-box">
                      <b>ส่งบัตรเชิญให้ญาติและแขกผ่านลิงก์</b>
                      {!shareToken ? (
                        <button className="btn-solid-black" disabled={shareBusy} onClick={createShare}>
                          {shareBusy ? "กำลังสร้าง..." : "สร้างลิงก์บัตรเชิญ"}
                        </button>
                      ) : (
                        <>
                          <code>{inviteUrl}</code>
                          <div className="share-actions">
                            <button className="solid" onClick={copyInvite}>{copied ? "คัดลอกแล้ว ✓" : "คัดลอกลิงก์"}</button>
                            <a href={inviteUrl} target="_blank" rel="noreferrer">เปิดดูบัตรเชิญ</a>
                            <button onClick={revokeShare} disabled={shareBusy}>ยกเลิกลิงก์</button>
                          </div>
                          <span>ผู้ที่มีลิงก์ดูได้เฉพาะชื่อ วัน สถานที่ และกำหนดการ ไม่เห็นราคาหรือข้อมูลส่วนตัว</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Payment & Summary */}
              <div className="dashboard-right">
                <div className="dashboard-card payment-card">
                  <span className="card-pretitle">PAYMENT SUMMARY</span>
                  <h3 className="payment-title">สรุปยอดชำระและแนบหลักฐาน</h3>

                  <div className="receipt-row">
                    <span>แพ็กเกจ: {booking.packageName}</span>
                    <span>฿{booking.packageBasePrice.toLocaleString()}</span>
                  </div>
                  <div className="receipt-row">
                    <span>
                      ค่าบริการรับรองแขก ({booking.guests} คน x {booking.nights}{" "}
                      คืน x ฿{booking.snackPerHead})
                    </span>
                    <span>฿{booking.pricing.snackTotal.toLocaleString()}</span>
                  </div>
                  <div className="receipt-row">
                    <span>ค่าบำรุงศาลา ({booking.nights} คืน)</span>
                    <span>฿{booking.pricing.hallTotal.toLocaleString()}</span>
                  </div>

                  {booking.addons.map((addon, idx) => (
                    <div className="receipt-row" key={idx}>
                      <span>{addon.name}</span>
                      <span>฿{addon.price.toLocaleString()}</span>
                    </div>
                  ))}

                  <div className="receipt-divider" />

                  <div className="receipt-total">
                    <span className="receipt-total-label">
                      ยอดสุทธิรวม (Net Total)
                    </span>
                    <span className="receipt-total-amount">
                      ฿{booking.pricing.grandTotal.toLocaleString()}
                    </span>
                  </div>

                  <HostPayment
                    bookingId={booking._id}
                    status={booking.status}
                    grandTotal={booking.pricing.grandTotal}
                    onChanged={refreshBooking}
                  />

                  {booking.status === "PENDING" && (
                    <span className="cancel-link" onClick={handleCancelBooking}>
                      ยกเลิกคำขอจองพิธีการ (Cancel Booking)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
