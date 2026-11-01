import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { LandingPage } from "./components/LandingPage";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import { Booking } from "./components/Booking";
import { HostDashboard } from "./components/HostDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { OrganizerBoard } from "./components/OrganizerBoard";
import { InvitePage } from "./components/InvitePage";
import { TempleStaffApprovals } from "./components/TempleStaffApprovals";
import { TempleStaffCalendar } from "./components/TempleStaffCalendar";
import { TempleStaffInventory } from "./components/TempleStaffInventory";
import { TempleStaffHistory } from "./components/TempleStaffHistory";
import "./index.css";
import { API_URL } from "./config";

export interface AuthUser {
  id?: string;
  _id?: string;
  name: string;
  role?: string;
}

type View =
  | "landing"
  | "login"
  | "register"
  | "booking"
  | "dashboard"
  | "admin"
  | "organizer"
  | "staff"
  | "staffCalendar"
  | "staffInventory"
  | "staffHistory"
  | "invite";

// ย้าย Helper functions ออกมาไว้นอก App() เพื่อความเป็นระเบียบ
// backend ส่ง role เป็นตัวพิมพ์ใหญ่ (ADMIN | STAFF | OPS | HOST) จึงเทียบแบบไม่สนตัวพิมพ์เล็ก/ใหญ่
const roleKey = (role?: string) => (role || "").toLowerCase();
const isAdminRole = (role?: string) => roleKey(role) === "admin";
const isOrganizerRole = (role?: string) =>
  ["ops", "organizer", "operations"].includes(roleKey(role));
const isStaffRole = (role?: string) => roleKey(role) === "staff";

const homeViewFor = (role?: string): View =>
  isAdminRole(role)
    ? "admin"
    : isOrganizerRole(role)
      ? "organizer"
      : isStaffRole(role)
        ? "staff"
        : "landing";

const inviteTokenFromHash = () => {
  const m = window.location.hash.match(/^#invite\/([A-Za-z0-9_-]{16,64})$/);
  return m ? m[1] : "";
};

export function App() {
  // รวม State ทั้งหมดไว้ที่จุดเดียว
  const [inviteToken] = useState(inviteTokenFromHash);
  const [currentView, setCurrentView] = useState<View>(
    inviteToken
      ? "invite"
      : import.meta.env.DEV && window.location.hash === "#staff"
      ? "staff"
      : import.meta.env.DEV && window.location.hash === "#calendar"
        ? "staffCalendar"
        : import.meta.env.DEV && window.location.hash === "#inventory"
          ? "staffInventory"
          : import.meta.env.DEV && window.location.hash === "#history"
            ? "staffHistory"
            : "landing",
  );
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // ดึงสถานะผู้ใช้ที่เคยล็อกอินไว้เมื่อเปิดหน้าเว็บ
  useEffect(() => {
    const savedUser = localStorage.getItem("foms_user");
    if (savedUser && !inviteToken) {
      try {
        const user = JSON.parse(savedUser) as AuthUser;
        setCurrentUser(user);
        setCurrentView(homeViewFor(user.role));
      } catch {
        localStorage.removeItem("foms_user");
      }
    }
  }, []);

  const navigateTo = (view: View) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAuthSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    localStorage.setItem("foms_user", JSON.stringify(user));
    navigateTo(homeViewFor(user.role));
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // กรณีไม่มี endpoint logout ให้เคลียร์ฝั่ง client ตามปกติ
    }
    setCurrentUser(null);
    localStorage.removeItem("foms_user");
    navigateTo("landing");
  };

  const isLoggedIn = Boolean(currentUser);
  const isAdmin = isAdminRole(currentUser?.role);
  const isOrganizer = isOrganizerRole(currentUser?.role);
  const isStaff = isStaffRole(currentUser?.role); // เช็คสถานะว่าเป็นพนักงานวัดหรือไม่

  // เพิ่มการแสดงผล Label (เจ้าหน้าที่วัด)
  const roleLabel = isAdmin
    ? "ผู้ดูแลระบบ"
    : isOrganizer
      ? "ผู้ประสานงาน"
      : isStaff
        ? "เจ้าหน้าที่วัด"
        : "เจ้าภาพ";

  const displayUserName = currentUser
    ? `${currentUser.name} (${roleLabel})`
    : "";

  if (currentView === "invite" && inviteToken) {
    return (
      <InvitePage
        token={inviteToken}
        onNavigateHome={() => {
          window.location.hash = "";
          window.location.reload();
        }}
      />
    );
  }

  return (
    <div className="app-container">
      {currentView === "landing" && (
        <LandingPage
          isLoggedIn={isLoggedIn}
          userName={displayUserName}
          onNavigateToLogin={() => navigateTo("login")}
          onNavigateToRegister={() => navigateTo("register")}
          onNavigateBooking={() => navigateTo("booking")}
          onNavigateDashboard={() => navigateTo("dashboard")}
          onLogout={handleLogout}
        />
      )}

      {currentView === "login" && (
        <>
          <Navbar
            currentView={currentView}
            isLoggedIn={isLoggedIn}
            userName={displayUserName}
            onNavigateHome={() => navigateTo("landing")}
            onNavigateLogin={() => navigateTo("login")}
            onNavigateRegister={() => navigateTo("register")}
            onNavigateBooking={() => navigateTo("booking")}
            onNavigateDashboard={() => navigateTo("dashboard")}
            onLogout={handleLogout}
          />
          <Login
            onSwitchToRegister={() => navigateTo("register")}
            onSuccess={handleAuthSuccess}
          />
          <Footer />
        </>
      )}

      {currentView === "register" && (
        <>
          <Navbar
            currentView={currentView}
            isLoggedIn={isLoggedIn}
            userName={displayUserName}
            onNavigateHome={() => navigateTo("landing")}
            onNavigateLogin={() => navigateTo("login")}
            onNavigateRegister={() => navigateTo("register")}
            onNavigateBooking={() => navigateTo("booking")}
            onNavigateDashboard={() => navigateTo("dashboard")}
            onLogout={handleLogout}
          />
          <Register
            onSwitchToLogin={() => navigateTo("login")}
            onSuccess={handleAuthSuccess}
          />
          <Footer />
        </>
      )}

      {currentView === "booking" && (
        <Booking
          isLoggedIn={isLoggedIn}
          userName={displayUserName}
          currentUser={currentUser}
          onNavigateHome={() => navigateTo("landing")}
          onNavigateLogin={() => navigateTo("login")}
          onNavigateRegister={() => navigateTo("register")}
          onNavigateDashboard={() => navigateTo("dashboard")}
          onLogout={handleLogout}
        />
      )}

      {currentView === "dashboard" && (
        <HostDashboard
          isLoggedIn={isLoggedIn}
          userName={displayUserName}
          currentUser={currentUser}
          onNavigateHome={() => navigateTo("landing")}
          onNavigateLogin={() => navigateTo("login")}
          onNavigateRegister={() => navigateTo("register")}
          onNavigateBooking={() => navigateTo("booking")}
          onNavigateDashboard={() => navigateTo("dashboard")}
          onLogout={handleLogout}
        />
      )}

      {currentView === "admin" &&
        (isAdmin ? (
          <AdminDashboard
            currentUser={currentUser}
            onNavigateHome={() => navigateTo("landing")}
            onLogout={handleLogout}
          />
        ) : (
          <div className="admin-denied">
            <p>ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
            <button onClick={() => navigateTo("login")}>
              ไปหน้าเข้าสู่ระบบ
            </button>
          </div>
        ))}

      {currentView === "organizer" &&
        (isOrganizer || isAdmin ? (
          <OrganizerBoard
            currentUser={currentUser}
            onNavigateHome={() => navigateTo("landing")}
            onLogout={handleLogout}
          />
        ) : (
          <div className="admin-denied">
            <p>ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
            <button onClick={() => navigateTo("login")}>
              ไปหน้าเข้าสู่ระบบ
            </button>
          </div>
        ))}

      {currentView === "staff" && (
        <TempleStaffApprovals
          isLoggedIn={isLoggedIn}
          userName={displayUserName}
          currentUser={currentUser}
          onNavigateHome={() => navigateTo("landing")}
          onNavigateLogin={() => navigateTo("login")}
          onNavigateRegister={() => navigateTo("register")}
          onNavigateCalendar={() => navigateTo("staffCalendar")}
          onNavigateInventory={() => navigateTo("staffInventory")}
          onNavigateHistory={() => navigateTo("staffHistory")}
          onLogout={handleLogout}
        />
      )}

      {currentView === "staffCalendar" && (
        <TempleStaffCalendar
          currentUser={currentUser}
          onNavigateHome={() => navigateTo("landing")}
          onNavigateApprovals={() => navigateTo("staff")}
          onNavigateInventory={() => navigateTo("staffInventory")}
          onNavigateHistory={() => navigateTo("staffHistory")}
          onLogout={handleLogout}
        />
      )}

      {currentView === "staffInventory" && (
        <TempleStaffInventory
          currentUser={currentUser}
          onNavigateHome={() => navigateTo("landing")}
          onNavigateApprovals={() => navigateTo("staff")}
          onNavigateCalendar={() => navigateTo("staffCalendar")}
          onNavigateHistory={() => navigateTo("staffHistory")}
          onLogout={handleLogout}
        />
      )}

      {currentView === "staffHistory" && (
        <TempleStaffHistory
          currentUser={currentUser}
          onNavigateHome={() => navigateTo("landing")}
          onNavigateApprovals={() => navigateTo("staff")}
          onNavigateCalendar={() => navigateTo("staffCalendar")}
          onNavigateInventory={() => navigateTo("staffInventory")}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;
