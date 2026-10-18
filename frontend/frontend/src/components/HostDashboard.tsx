import React from "react";
import { Navbar } from "./Navbar";
import "./HostDashboard.css";

interface HostDashboardProps {
  isLoggedIn?: boolean;
  userName?: string;
  onNavigateHome?: () => void;
  onNavigateLogin?: () => void;
  onNavigateRegister?: () => void;
  onNavigateBooking?: () => void;
  onNavigateDashboard?: () => void; // เพิ่ม Prop นี้
  onLogout?: () => void;
}

export const HostDashboard: React.FC<HostDashboardProps> = ({
  isLoggedIn = true,
  userName,
  onNavigateHome,
  onNavigateLogin,
  onNavigateRegister,
  onNavigateBooking,
  onNavigateDashboard, // รับค่ามาใช้งาน
  onLogout,
}) => {
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
        onNavigateDashboard={onNavigateDashboard} // ส่งต่อให้ Navbar
        onLogout={onLogout}
      />

      <div className="dashboard-header">
        <div className="breadcrumb">
          <span className="breadcrumb-link" onClick={onNavigateHome}>
            หน้าหลัก
          </span>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">งานของฉัน</span>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">รายละเอียดคำขอจอง</span>
        </div>
        <span className="dashboard-pretitle">
          HOST DASHBOARD - รายละเอียดงานพิธีการ
        </span>
        <h1 className="dashboard-title">
          กำหนดการและสถานะงานพิธี (Ref: FOMS-2569-0042)
        </h1>
        <div className="dashboard-subtitle">
          วัดศรีสุดต พระอารามหลวง — ศาลา ๒ เมตตาธรรม · เจ้าภาพ:{" "}
          {userName || "คุณศรัทธา ภักดี"}
        </div>
      </div>

      <div className="dashboard-container">
        {/* --- Status Tracker Card --- */}
        <div className="status-tracker-card">
          <div className="status-tracker-header">
            <span>สถานะคำขออัปเดตล่าสุด</span>
            <span>อัปเดตล่าสุด: วันนี้ เวลา 10:45 น.</span>
          </div>

          <div className="stepper-container">
            <div className="stepper-line" />

            <div className="step-item completed">
              <div className="step-icon">✓</div>
              <div className="step-label">01 PENDING</div>
              <div className="step-title">รอวัดอนุมัติ</div>
              <div className="step-desc">ตรวจสอบเอกสารแล้ว</div>
            </div>

            <div className="step-item active">
              <div className="step-icon">
                <div className="step-dot" />
              </div>
              <div className="step-label">
                02 CONFIRMED <span className="step-badge">สถานะปัจจุบัน</span>
              </div>
              <div className="step-title" style={{ color: "var(--gold)" }}>
                อนุมัติแล้ว - รอชำระเงิน
              </div>
              <div className="step-desc">กรุณาชำระเงินมัดจำ</div>
            </div>

            <div className="step-item disabled">
              <div className="step-icon"></div>
              <div className="step-label">03 PAID</div>
              <div className="step-title">ชำระเงินแล้ว</div>
              <div className="step-desc">รอตรวจสอบหลักฐาน</div>
            </div>

            <div className="step-item disabled">
              <div className="step-icon"></div>
              <div className="step-label">04 COMPLETED</div>
              <div className="step-title">พิธีการเสร็จสมบูรณ์</div>
              <div className="step-desc">สรุปเอกสารปิดงาน</div>
            </div>
          </div>

          <div className="status-warning-banner">
            <span className="warning-icon">ⓘ</span>{" "}
            วัดได้อนุมัติคำขอของท่านเรียบร้อยแล้ว
            กรุณาชำระเงินค่ามัดจำหรือยอดเต็มตามแพ็กเกจภายใน 24 ชม.
            เพื่อล็อกคิวคณะสงฆ์และจัดเตรียมสถานที่
          </div>
        </div>

        {/* --- Main 2 Columns --- */}
        <div className="dashboard-grid">
          {/* Left Column: Timeline & E-Card */}
          <div className="dashboard-left">
            <div className="dashboard-card" style={{ marginBottom: "1.5rem" }}>
              <span className="card-pretitle">CEREMONIAL TIMELINE</span>
              <h3>กำหนดการพิธีบำเพ็ญกุศล (12 – 16 ก.ค. 2569)</h3>

              <div className="timeline-container">
                <div className="timeline-item active">
                  <div className="timeline-dot" />
                  <div className="timeline-date">
                    วันที่ 1 (12 ก.ค. 2569){" "}
                    <span className="timeline-tag">- วันเริ่มพิธีการ</span>
                  </div>
                  <div className="timeline-event">
                    <div className="event-time">16:30 น.</div>
                    <div>พิธีรดน้ำศพและบรรจุหีบ ณ ศาลา ๒ เมตตาธรรม</div>
                  </div>
                  <div className="timeline-event">
                    <div className="event-time">19:00 น.</div>
                    <div>
                      สวดพระอภิธรรม คืนที่ 1 (พระสงฆ์ 4 รูป สวดพระอภิธรรม 7
                      คัมภีร์)
                    </div>
                  </div>
                </div>

                <div className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-date">
                    วันที่ 2-4 (13-15 ก.ค. 2569){" "}
                    <span className="timeline-tag gray-tag">
                      - สวดพระอภิธรรมต่อเนื่อง
                    </span>
                  </div>
                  <div className="timeline-event">
                    <div className="event-time">19:00 น.</div>
                    <div>
                      สวดพระอภิธรรม คืนที่ 2-4 (เจ้าภาพร่วม & ญาติมิตร
                      นำโดยครอบครัว)
                    </div>
                  </div>
                </div>

                <div className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-date">
                    วันที่ 5 (16 ก.ค. 2569){" "}
                    <span className="timeline-tag gold-tag">
                      - สวดพระอภิธรรมคืนสุดท้าย
                    </span>
                  </div>
                  <div className="timeline-event">
                    <div className="event-time">19:00 น.</div>
                    <div>
                      สวดพระอภิธรรม คืนสุดท้าย (บรรเลงดนตรีไทยปี่พาทย์นางหงส์
                      และบันทึกภาพเกียรติยศ)
                    </div>
                  </div>
                </div>

                <div className="timeline-item">
                  <div className="timeline-dot dark-dot" />
                  <div className="timeline-date">
                    วันฌาปนกิจ (17 ก.ค. 2569){" "}
                    <span className="timeline-tag dark-tag">
                      - พิธีพระราชทานเพลิง / ประชุมเพลิง
                    </span>
                  </div>
                  <div className="timeline-event">
                    <div className="event-time">10:30 น.</div>
                    <div>
                      พระสงฆ์แสดงพระธรรมเทศนาและถวายภัตตาหารเพลแด่พระสงฆ์
                    </div>
                  </div>
                  <div className="timeline-event">
                    <div className="event-time">13:30 น.</div>
                    <div>พิธีเคลื่อนร่างเวียนรอบเมรุ ๓ รอบ</div>
                  </div>
                  <div className="timeline-event">
                    <div className="event-time">16:00 น.</div>
                    <div>พิธีฌาปนกิจ ณ เมรุหลวง วัดศรีสุดต</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="dashboard-card">
              <span className="card-pretitle">INVITATION ASSET</span>
              <h3>บัตรเชิญดิจิทัล (E-Card Memorial Invitation)</h3>

              <div className="ecard-preview-box">
                <div className="ecard-pre">บันทึกความอาลัย</div>
                <div className="ecard-name">คุณพ่อสมเกียรติ ภักดี</div>
                <div className="ecard-desc">
                  ขอเรียนเชิญร่วมพิธีบำเพ็ญกุศลและพิธีฌาปนกิจ ณ ศาลา ๒ เมตตาธรรม
                  วัดศรีสุดต พระอารามหลวง
                  <br />
                  <br />
                  <span className="ecard-ref">
                    รหัสอ้างอิงบัตรเชิญดิจิทัล: 2569
                  </span>
                </div>
              </div>

              <div className="ecard-actions">
                <button className="btn-download-ecard">
                  <span>↓</span> ดาวน์โหลด E-Card บัตรเชิญ (PDF / Image)
                </button>
                <div className="ecard-note">
                  แชร์กำหนดการผ่าน LINE
                  หรือคัดลอกลิงก์สำหรับส่งให้แขกผู้มีเกียรติ
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
                <span>แพ็กเกจมาตรฐาน สมเกียรติ (สวด 5 คืน)</span>
                <span>฿45,000</span>
              </div>
              <div className="receipt-row">
                <span>ค่าบริการรับรองแขก (100 คน x 5 คืน x ฿30)</span>
                <span>฿15,000</span>
              </div>
              <div className="receipt-row">
                <span>หีบเย็นปรับอุณหภูมิ (อัปเกรดพิเศษ)</span>
                <span>฿5,000</span>
              </div>
              <div className="receipt-row">
                <span>ชุดดอกไม้ประดับหน้าหีบ (อัปเกรด)</span>
                <span>฿1,500</span>
              </div>
              <div className="receipt-row">
                <span>ค่าบำรุงศาลาและสาธารณูปโภค 5 คืน</span>
                <span>฿7,500</span>
              </div>

              <div className="receipt-divider" />

              <div className="receipt-total">
                <span className="receipt-total-label">
                  ยอดสุทธิรวม (Net Total)
                </span>
                <span className="receipt-total-amount">฿74,000</span>
              </div>

              <div className="deposit-box">
                <div>
                  <div className="deposit-label">ยอดชำระมัดจำงวดแรก (50%)</div>
                  <div className="deposit-desc">
                    หรือเลือกชำระเต็มจำนวน ฿74,000
                  </div>
                </div>
                <div className="deposit-amount">฿37,000</div>
              </div>

              <div className="bank-info-box">
                <div className="bank-logo">🏛️</div>
                <div className="bank-details">
                  <span className="bank-label">บัญชีรับชำระของวัด:</span>
                  <span className="bank-name">
                    วัดศรีสุดต พระอารามหลวง (บัญชีทางการ)
                  </span>
                  <span className="bank-acc">
                    123-4-56789-0{" "}
                    <span className="bank-branch">(ธ.กรุงไทย)</span>
                  </span>
                </div>
                <div className="promptpay-badge">PromptPay Official</div>
              </div>

              <div className="upload-label">
                แบบหลักฐานการโอนเงิน (Payment Slip)
              </div>
              <div className="upload-area">
                <div className="upload-icon">☁️</div>
                <div className="upload-title">
                  ลากไฟล์สลิปมาวางที่นี่ หรือแตะเพื่อเลือกไฟล์
                </div>
                <div className="upload-desc">
                  รองรับ JPG, PNG, PDF ขนาดไม่เกิน 10MB
                </div>
              </div>

              <button className="btn-outline-gold">
                📂 เลือกไฟล์สลิปโอนเงิน (Browse File)
              </button>
              <button className="btn-solid-black">
                ✓ ยืนยันการส่งหลักฐานชำระเงิน
              </button>

              <span
                className="cancel-link"
                onClick={() => alert("ยืนยันการยกเลิกคำขอจองศาลา")}
              >
                ยกเลิกคำขอจองพิธีการ (Cancel Booking)
              </span>
            </div>

            <div className="dashboard-card contact-card">
              <div className="contact-icon">👩‍💼</div>
              <div className="contact-info">
                <div className="contact-title">
                  ต้องการปรึกษาเจ้าหน้าที่ดูแลพิธีการ?
                </div>
                <div className="contact-desc">
                  สายด่วนติดต่อประสานงานตลอด 24 ชม.
                </div>
              </div>
              <div className="contact-phone">โทร 02-000-0000</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
