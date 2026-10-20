import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { LandingPage } from "./components/LandingPage";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import { Booking } from "./components/Booking";
import { HostDashboard } from "./components/HostDashboard";
import "./index.css";

export interface AuthUser {
  id?: string;
  _id?: string;
  name: string;
  role?: string;
}

export function App() {
  const [currentView, setCurrentView] = useState<
    "landing" | "login" | "register" | "booking" | "dashboard"
  >("landing");

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // ดึงสถานะผู้ใช้ที่เคยล็อกอินไว้เมื่อเปิดหน้าเว็บ
  useEffect(() => {
    const savedUser = localStorage.getItem("foms_user");
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("foms_user");
      }
    }
  }, []);

  const navigateTo = (
    view: "landing" | "login" | "register" | "booking" | "dashboard",
  ) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAuthSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    localStorage.setItem("foms_user", JSON.stringify(user));
    navigateTo("landing");
  };

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:5000/api/auth/logout", {
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
  const displayUserName = currentUser ? `${currentUser.name} (เจ้าภาพ)` : "";

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
    </div>
  );
}

export default App;
