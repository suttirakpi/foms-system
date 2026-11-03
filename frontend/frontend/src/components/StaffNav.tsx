import React from "react";
import logoImg from "../assets/logo-removebg.png";
import { useTempleName } from "../staffApi";
import "./Navbar.css";
import "./StaffNav.css";

export type StaffPage = "approvals" | "calendar" | "inventory" | "history";

interface StaffNavProps {
  active: StaffPage;
  userName?: string;
  onNavigateHome?: () => void;
  onNavigateApprovals?: () => void;
  onNavigateCalendar?: () => void;
  onNavigateInventory?: () => void;
  onNavigateHistory?: () => void;
  onLogout?: () => void;
}

export const StaffNav: React.FC<StaffNavProps> = ({
  active,
  userName,
  onNavigateHome,
  onNavigateApprovals,
  onNavigateCalendar,
  onNavigateInventory,
  onNavigateHistory,
  onLogout,
}) => {
  const templeName = useTempleName(userName ?? "");
  const items: {
    page: StaffPage;
    th: string;
    en: string;
    onClick?: () => void;
  }[] = [
    {
      page: "approvals",
      th: "คำขออนุมัติ",
      en: "(Approvals)",
      onClick: onNavigateApprovals,
    },
    {
      page: "calendar",
      th: "ปฏิทินศาลาและเมรุ",
      en: "(Calendar)",
      onClick: onNavigateCalendar,
    },
    {
      page: "inventory",
      th: "คลังอุปกรณ์พิธีการ",
      en: "",
      onClick: onNavigateInventory,
    },
    {
      page: "history",
      th: "ประวัติคำขอ",
      en: "(History)",
      onClick: onNavigateHistory,
    },
  ];

  return (
    <header className="navbar-wrapper">
      <div className="navbar-container">
        {/* โลโก้ + ชื่อระบบและชื่อวัด */}
        <div className="brand-logo staff-brand-logo" onClick={onNavigateHome}>
          <img src={logoImg} alt="FOMS" className="brand-logo-img" />
          <div className="staff-brand-info">
            <strong>FOMS · TEMPLE STAFF PORTAL</strong>
            <span>{templeName || "กำลังโหลดชื่อวัด..."}</span>
          </div>
        </div>

        {/* เมนูนำทางตรงกลาง (คงข้อความเดิมทั้งหมด) */}
        <nav className="nav-links staff-nav-links">
          {items.map((n) => (
            <a
              key={n.page}
              href={`#${n.page}`}
              onClick={(e) => {
                e.preventDefault();
                n.onClick?.();
              }}
              className={n.page === active ? "active" : ""}
            >
              <span>{n.th}</span>
              {n.en && <small>{n.en}</small>}
            </a>
          ))}
        </nav>

        {/* กล่องสถานะผู้ใช้และปุ่มออกจากระบบฝั่งขวาเหมือน Navbar.tsx */}
        <div className="navbar-actions">
          <div className="user-profile-badge">
            <div className="user-status-box staff-status-box">
              <span className="status-label">บัญชีเจ้าหน้าที่วัด:</span>
              <span className="user-name">
                {userName ?? "เจ้าหน้าที่วัด"}
                {templeName ? ` (${templeName})` : ""}
              </span>
            </div>

            <div
              className="user-avatar-btn"
              title="ออกจากระบบ"
              aria-label="ออกจากระบบ"
              onClick={onLogout}
            >
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
        </div>
      </div>
    </header>
  );
};
