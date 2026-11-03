import React from "react";
import logoImg from "../assets/logo-removebg.png";
import { useTempleName } from "../staffApi";
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
    <header className="staff-navbar-wrapper">
      <nav className="staff-nav">
        {/* โลโก้ + ชื่อระบบ/วัด */}
        <div className="staff-nav-brand" onClick={onNavigateHome}>
          <img src={logoImg} alt="FOMS" className="staff-brand-logo-img" />
          <div className="staff-brand-text">
            <strong>FOMS · TEMPLE STAFF PORTAL</strong>
            <span>{templeName || "กำลังโหลดชื่อวัด..."}</span>
          </div>
        </div>

        {/* เมนูนำทางตรงกลาง (คงข้อความเดิมทั้งหมด) */}
        <ul className="staff-nav-menu">
          {items.map((n) => (
            <li
              key={n.page}
              className={n.page === active ? "active" : ""}
              onClick={n.onClick}
            >
              <span>{n.th}</span>
              {n.en && <small>{n.en}</small>}
            </li>
          ))}
        </ul>

        {/* กล่องสถานะผู้ใช้และปุ่มออกจากระบบ (สไตล์เดียวกับ Navbar.tsx) */}
        <div className="staff-nav-user">
          <div className="staff-user-status-box">
            <div className="staff-user-info">
              <span className="staff-nav-status">บัญชีเจ้าหน้าที่วัด</span>
              <strong>{userName ?? "เจ้าหน้าที่วัด"}</strong>
              {templeName && (
                <span className="staff-nav-role">{templeName}</span>
              )}
            </div>
          </div>

          <button
            className="staff-nav-avatar"
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
          </button>
        </div>
      </nav>
    </header>
  );
};
