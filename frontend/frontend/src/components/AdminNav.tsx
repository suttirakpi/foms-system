import React from "react";
import logoImg from "../assets/logo-removebg.png";
import "./Navbar.css";
import "./AdminNav.css";

export type MainTab = "overview" | "master" | "access" | "audit" | "settings";

export const ADMIN_TABS: { key: MainTab; th: string; en: string }[] = [
  { key: "overview", th: "ภาพรวมระบบ", en: "System Overview" },
  { key: "master", th: "จัดการข้อมูลกลาง", en: "Master Data" },
  { key: "access", th: "บัญชีผู้ใช้และสิทธิ์", en: "Access Control" },
  { key: "audit", th: "บันทึกการตรวจสอบ", en: "Audit Trail / Logs" },
  { key: "settings", th: "การตั้งค่าระบบ", en: "Settings" },
];

interface AdminNavProps {
  activeTab: MainTab;
  adminName?: string;
  onSelectTab: (tab: MainTab) => void;
  onNavigateHome?: () => void;
  onLogout?: () => void;
}

export const AdminNav: React.FC<AdminNavProps> = ({
  activeTab,
  adminName = "ผู้ดูแลระบบ",
  onSelectTab,
  onNavigateHome,
  onLogout,
}) => {
  return (
    <header className="navbar-wrapper">
      <div className="navbar-container">
        {/* โลโก้ฝั่งซ้ายเหมือน Navbar.tsx */}
        <div className="brand-logo" onClick={onNavigateHome}>
          <img src={logoImg} alt="ส่งสุคติ" className="brand-logo-img" />
        </div>

        {/* เมนู 5 แท็บตรงกลาง (คงข้อความเดิมทั้งหมด) */}
        <nav className="nav-links admin-nav-links">
          {ADMIN_TABS.map((t) => (
            <a
              key={t.key}
              href={`#${t.key}`}
              onClick={(e) => {
                e.preventDefault();
                onSelectTab(t.key);
              }}
              className={activeTab === t.key ? "active" : ""}
            >
              <span>{t.th}</span>
              <small>({t.en})</small>
            </a>
          ))}
        </nav>

        {/* กล่องสถานะผู้ใช้และปุ่มออกจากระบบฝั่งขวาเหมือน Navbar.tsx */}
        <div className="navbar-actions">
          <div className="user-profile-badge">
            <div className="user-status-box admin-status-box">
              <span className="status-label">
                ผู้ดูแลระบบกลาง (Super Admin):
              </span>
              <span className="user-name">{adminName}</span>
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
