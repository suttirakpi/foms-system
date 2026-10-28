import React, { useState, useEffect } from "react";
import { Navbar } from "./Navbar";
import { AuthUser } from "../App";
import "./HostDashboard.css";
import { API_URL } from "../config";

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
  status: "PENDING" | "CONFIRMED" | "PAID" | "COMPLETED" | "CANCELLED";
  paymentSlipUrl?: string;
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
  const [slipFileName, setSlipFileName] = useState("");

  const fetchMyBooking = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (currentUser?._id || currentUser?.id) {
        query.set("hostId", (currentUser._id || currentUser.id) as string);
      } else if (currentUser?.name) {
        query.set("hostName", currentUser.name);
      }

      const res = await fetch(
        `${API_URL}/api/bookings/my?${query.toString()}`,
        { credentials: "include" },
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setBooking(data[0]); // แสดงใบจองล่าสุด
      } else {
        setBooking(null);
      }
    } catch (err) {
      console.error("Failed to fetch booking:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyBooking();
  }, [currentUser]);

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

  // อัปโหลดสลิปโอนเงิน
  const handleConfirmPayment = async () => {
    if (!booking) return;
    if (!slipFileName) {
      alert("กรุณาเลือกไฟล์สลิปโอนเงินก่อนยืนยัน");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/bookings/${booking._id}/slip`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ paymentSlipUrl: slipFileName }),
      });
      if (!res.ok) throw new Error("ส่งหลักฐานไม่สำเร็จ");
      const updated = await res.json();
      setBooking(updated);
      alert("✅ ส่งหลักฐานการโอนเงินเรียบร้อยแล้ว สถานะเปลี่ยนเป็น PAID");
    } catch (err: any) {
      alert(err.message);
    }
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

  const statusOrder = ["PENDING", "CONFIRMED", "PAID", "COMPLETED"];
  const currentStepIndex = booking ? statusOrder.indexOf(booking.status) : 0;

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
                  <div className="step-desc">พร้อมเปิดรับสลิปโอนเงิน</div>
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
                  <div className="step-title">ชำระเงินแล้ว</div>
                  <div className="step-desc">ส่งหลักฐานโอนเงินเรียบร้อย</div>
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
                  "วัดอนุมัติคำขอแล้ว กรุณาชำระเงินและแนบสลิปเพื่อล็อกคิวคณะสงฆ์"}
                {booking.status === "PAID" &&
                  "ระบบได้รับหลักฐานการชำระเงินของท่านเรียบร้อยแล้ว"}
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

                  <div className="deposit-box">
                    <div>
                      <div className="deposit-label">
                        ยอดชำระมัดจำงวดแรก (50%)
                      </div>
                      <div className="deposit-desc">
                        หรือเลือกชำระเต็มจำนวน ฿
                        {booking.pricing.grandTotal.toLocaleString()}
                      </div>
                    </div>
                    <div className="deposit-amount">
                      ฿{(booking.pricing.grandTotal / 2).toLocaleString()}
                    </div>
                  </div>

                  <div className="upload-label">
                    แนบหลักฐานการโอนเงิน (Payment Slip)
                  </div>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) =>
                      setSlipFileName(e.target.files?.[0]?.name || "")
                    }
                    style={{ marginBottom: "1rem", fontSize: "12px" }}
                  />

                  <button
                    className="btn-solid-black"
                    onClick={handleConfirmPayment}
                    disabled={
                      booking.status === "PAID" ||
                      booking.status === "CANCELLED"
                    }
                  >
                    {booking.status === "PAID"
                      ? "✓ ชำระเงินเรียบร้อยแล้ว"
                      : "✓ ยืนยันการส่งหลักฐานชำระเงิน"}
                  </button>

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
