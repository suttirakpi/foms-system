import React from "react";
import logoImg from "../assets/logo-removebg.png";
import "./Navbar.css";
import "./OrganizerNav.css";

export type NavKey = "live" | "vendors" | "schedule" | "summary";

export const ORGANIZER_NAV: { key: NavKey; th: string; en: string }[] = [
  { key: "live", th: "หน้างานวันนี้", en: "Live Ops - Active" },
  { key: "vendors", th: "ตรวจสอบคู่ค้า & พัสดุ", en: "Vendors" },
  { key: "schedule", th: "กำหนดการพิธี", en: "Schedule" },
  { key: "summary", th: "รายงานสรุปงาน", en: "Summary" },
];

interface OrganizerNavProps {
  activeNav: NavKey;
  organizerName?: string;
  onSelectNav: (key: NavKey) => void;
  onNavigateHome?: () => void;
  onLogout?: () => void;
}

export const OrganizerNav: React.FC<OrganizerNavProps> = ({
  activeNav,
  organizerName = "ผู้ประสานงาน",
  onSelectNav,
  onNavigateHome,
  onLogout,
}) => {
  return (
    <header className="navbar-wrapper">
      <div className="navbar-container">
        {/* โลโก้ฝั่งซ้ายอิงตาม Navbar.tsx */}
        <div className="brand-logo org-brand-logo" onClick={onNavigateHome}>
          <img src={logoImg} alt="ส่งสุคติ" className="brand-logo-img" />
          <div className="org-brand-info">
            <strong>FOMS</strong>
            <span>ORGANIZER &amp; ON-SITE OPERATIONS</span>
          </div>
        </div>

        {/* เมนูนำทางตรงกลาง (คงข้อความเดิมทั้งหมด) */}
        <nav className="nav-links org-nav-links">
          {ORGANIZER_NAV.map((n) => (
            <a
              key={n.key}
              href={`#${n.key}`}
              onClick={(e) => {
                e.preventDefault();
                onSelectNav(n.key);
              }}
              className={activeNav === n.key ? "active" : ""}
            >
              <span>{n.th}</span>
              <small>({n.en})</small>
            </a>
          ))}
        </nav>

        {/* กล่องสถานะผู้ใช้และปุ่มออกจากระบบฝั่งขวาอิงตาม Navbar.tsx */}
        <div className="navbar-actions">
          <div className="user-profile-badge">
            <div className="user-status-box org-status-box">
              <span className="status-label">ทีมพิธีการ · ปฏิบัติการสด:</span>
              <span className="user-name">ผู้ประสานงาน: {organizerName}</span>
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
