// src/components/Navbar.tsx
import React from "react";
import "./Navbar.css";
import logoImg from "../assets/logo-removebg.png";

interface NavbarProps {
  currentView?: string;
  isLoggedIn?: boolean;
  userName?: string;
  onNavigateHome?: () => void;
  onNavigateLogin?: () => void;
  onNavigateRegister?: () => void;
  onNavigateBooking?: () => void;
  onLogout?: () => void; // เพิ่มฟังก์ชัน Logout
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView = "landing",
  isLoggedIn = false,
  userName = "คุณศรัทธา ภักดี (เจ้าภาพ)",
  onNavigateHome,
  onNavigateLogin,
  onNavigateRegister,
  onNavigateBooking,
  onLogout,
}) => {
  const handleBookingClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (onNavigateBooking) {
      onNavigateBooking();
    }
  };

  return (
    <header className="navbar-wrapper">
      <div className="navbar-container">
        <div className="brand-logo" onClick={onNavigateHome}>
          <img src={logoImg} alt="ส่งสุคติ" className="brand-logo-img" />
        </div>

        <nav className="nav-links">
          <a
            href="#hero"
            onClick={(e) => {
              e.preventDefault();
              onNavigateHome?.();
            }}
            className={currentView === "landing" ? "active" : ""}
          >
            หน้าหลัก
          </a>
          <a
            href="/booking"
            onClick={handleBookingClick}
            className={currentView === "booking" ? "active" : ""}
          >
            จองศาลาและแพ็กเกจ
          </a>
          <a href="#trust">สำหรับเจ้าหน้าที่และทีมงาน</a>
        </nav>

        <div className="navbar-actions">
          {isLoggedIn ? (
            <div className="user-profile-badge">
              <div className="user-status-box">
                <span className="status-label">สถานะ:</span>
                <span className="user-name">{userName}</span>
              </div>
              <div
                className="user-avatar-btn"
                title="ออกจากระบบ"
                onClick={onLogout}
              >
                {/* เปลี่ยนเป็นปุ่ม Logout แทนชั่วคราวเพื่อให้เทสได้ง่าย */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </div>
            </div>
          ) : (
            <>
              <span className="nav-action-text" onClick={onNavigateLogin}>
                เข้าสู่ระบบ
              </span>
              <span className="nav-action-divider">|</span>
              <button className="btn-nav-register" onClick={onNavigateRegister}>
                ลงทะเบียนเจ้าภาพ
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
