import React, { useState } from "react";
import type { AuthUser } from "../App";
import { AdminAccess } from "./AdminAccess";
import { AdminAudit } from "./AdminAudit";
import { AdminMaster } from "./AdminMaster";
import { AdminNav, ADMIN_TABS, MainTab } from "./AdminNav";
import { AdminOverview } from "./AdminOverview";
import { AdminSettings } from "./AdminSettings";
import { useToast } from "./AdminUi";
import "./AdminDashboard.css";

interface AdminDashboardProps {
  currentUser: AuthUser | null;
  onNavigateHome: () => void;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onNavigateHome,
  onLogout,
}) => {
  const [tab, setTab] = useState<MainTab>("overview");
  const { flash, node: toast } = useToast();
  const adminName = currentUser?.name ?? "ผู้ดูแลระบบ";
  const adminId = currentUser?.id || currentUser?._id;
  const activeTab = ADMIN_TABS.find((t) => t.key === tab)!;

  return (
    <div className="adm">
      {/* เรียกใช้ Navbar ที่แยกออกมาเป็น Component */}
      <AdminNav
        activeTab={tab}
        adminName={adminName}
        onSelectTab={setTab}
        onNavigateHome={onNavigateHome}
        onLogout={onLogout}
      />

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
