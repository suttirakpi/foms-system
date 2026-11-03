import React, { useState } from "react";
import type { AuthUser } from "../App";
import { AdminAccess } from "./AdminAccess";
import { AdminAudit } from "./AdminAudit";
import { AdminMaster } from "./AdminMaster";
import { AdminOverview } from "./AdminOverview";
import { AdminSettings } from "./AdminSettings";
import { useToast } from "./AdminUi";
import "./AdminDashboard.css";

interface AdminDashboardProps {
  currentUser: AuthUser | null;
  onNavigateHome: () => void;
  onLogout: () => void;
}

type MainTab = "overview" | "master" | "access" | "audit" | "settings";

const TABS: { key: MainTab; th: string; en: string }[] = [
  { key: "overview", th: "ภาพรวมระบบ", en: "System Overview" },
  { key: "master", th: "จัดการข้อมูลกลาง", en: "Master Data" },
  { key: "access", th: "บัญชีผู้ใช้และสิทธิ์", en: "Access Control" },
  { key: "audit", th: "บันทึกการตรวจสอบ", en: "Audit Trail / Logs" },
  { key: "settings", th: "การตั้งค่าระบบ", en: "Settings" },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onNavigateHome,
  onLogout,
}) => {
  const [tab, setTab] = useState<MainTab>("overview");
  const { flash, node: toast } = useToast();
  const adminName = currentUser?.name ?? "ผู้ดูแลระบบ";
  const adminId = currentUser?.id || currentUser?._id;
  const activeTab = TABS.find((t) => t.key === tab)!;

  return (
    <div className="adm">
      {/* ===== Top bar ===== */}
      <header className="adm-top">
        <nav className="adm-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`adm-tab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              <span>{t.th}</span>
              <span>({t.en})</span>
            </button>
          ))}
        </nav>
        <div className="adm-top-right">
          {/* <div className="adm-portal">
            <span>SYSTEM</span>
            <span>
              <i className="adm-dot" />
              ADMIN
            </span>
            <span>PORTAL</span>
          </div> */}
          <div className="adm-user">
            <strong>{adminName}</strong>
            <span>ผู้ดูแลระบบกลาง (Super Admin)</span>
          </div>
          <button
            className="adm-logout"
            onClick={onLogout}
            title="ออกจากระบบ"
            aria-label="ออกจากระบบ"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </button>
        </div>
      </header>

      <main className="adm-main">
        <div className="adm-crumb">
          <button onClick={onNavigateHome}>หน้าหลัก</button>
          <span>/</span>
          <span>ผู้ดูแลระบบกลาง (SYSTEM ADMIN)</span>
          <span>/</span>
          <strong>
            {activeTab.th} ({activeTab.en.toUpperCase()})
          </strong>
        </div>

        {tab === "overview" && (
          <AdminOverview onOpenAudit={() => setTab("audit")} />
        )}
        {tab === "master" && (
          <AdminMaster
            adminName={adminName}
            flash={flash}
            onOpenAudit={() => setTab("audit")}
          />
        )}
        {tab === "access" && (
          <AdminAccess currentUserId={adminId} flash={flash} />
        )}
        {tab === "audit" && <AdminAudit />}
        {tab === "settings" && <AdminSettings flash={flash} />}
      </main>

      {toast}

      {/* ===== Footer ===== */}
      <footer className="adm-footer">
        <div className="adm-footer-row">
          <div>
            <h4>
              FOMS <span>|</span>{" "}
              สถาปัตยกรรมระบบบริหารจัดการงานพิธีและศาสนสมบัติ
            </h4>
            <p>
              ระบบปฏิบัติการกลางสำหรับการกำกับดูแล ธรรมาภิบาล
              และการบริหารจัดการข้อมูลของศาสนสถาน
              ภายใต้การควบคุมและรักษาความปลอดภัยของสำนักงานศาสนสมบัติส่วนกลาง
            </p>
          </div>
        </div>
        <div className="adm-footer-bottom">
          <span>
            © 2025 FOMS Ceremonial Governance &amp; Audit Compliance.
            สงวนลิขสิทธิ์ตามพระราชบัญญัติข้อมูลข่าวสาร
          </span>
          <span>
            นโยบายความปลอดภัยสารสนเทศ &nbsp;·&nbsp;
            ข้อกำหนดการใช้งานและจริยธรรมข้อมูล
          </span>
        </div>
      </footer>
    </div>
  );
};
