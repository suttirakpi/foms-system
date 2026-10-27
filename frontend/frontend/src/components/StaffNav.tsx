import React from "react";
import logoImg from "../assets/logo-removebg.png";
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
    <nav className="staff-nav">
      <div className="staff-nav-brand" onClick={onNavigateHome}>
        <img src={logoImg} alt="FOMS" />
        <div>
          <strong>FOMS · TEMPLE STAFF PORTAL</strong>
          <span>วัดศรีสุคต พระอารามหลวง</span>
        </div>
      </div>
      <ul className="staff-nav-menu">
        {items.map((n) => (
          <li
            key={n.page}
            className={n.page === active ? "active" : ""}
            onClick={n.onClick}
          >
            {n.th}
            <small>{n.en}</small>
          </li>
        ))}
      </ul>
      <div className="staff-nav-user">
        <div>
          <span className="staff-nav-status">
            สถานะ: เจ้าหน้าที่สำนักงานวัด
          </span>
          <strong>{userName ?? "เจ้าหน้าที่วัด"}</strong>
          <span className="staff-nav-role">ผู้ดูแลระบบศาลา</span>
        </div>
        <button
          className="staff-nav-avatar"
          title="ออกจากระบบ"
          aria-label="ออกจากระบบ"
          onClick={onLogout}
        >
          ⏻
        </button>
      </div>
    </nav>
  );
};
