// src/App.tsx
import React, { useState } from "react";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { LandingPage } from "./components/LandingPage";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import { Booking } from "./components/Booking";
import "./index.css";

export function App() {
  const [currentView, setCurrentView] = useState<
    "landing" | "login" | "register" | "booking"
  >("landing");

  // State สำหรับจำลองการล็อกอิน
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");

  const navigateTo = (view: "landing" | "login" | "register" | "booking") => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAuthSuccess = () => {
    setIsLoggedIn(true);
    setUserName("คุณตูน สุทธิรักษ์ (เจ้าภาพ)"); // ตั้งชื่อคุณตูนเลยครับ
    navigateTo("landing");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserName("");
    navigateTo("landing");
  };

  return (
    <div className="app-container">
      {currentView === "landing" && (
        <LandingPage
          isLoggedIn={isLoggedIn}
          userName={userName}
          onNavigateToLogin={() => navigateTo("login")}
          onNavigateToRegister={() => navigateTo("register")}
          onNavigateBooking={() => navigateTo("booking")}
          onLogout={handleLogout}
        />
      )}

      {currentView === "login" && (
        <>
          <Navbar
            currentView={currentView}
            isLoggedIn={isLoggedIn}
            userName={userName}
            onNavigateHome={() => navigateTo("landing")}
            onNavigateLogin={() => navigateTo("login")}
            onNavigateRegister={() => navigateTo("register")}
            onNavigateBooking={() => navigateTo("booking")}
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
            userName={userName}
            onNavigateHome={() => navigateTo("landing")}
            onNavigateLogin={() => navigateTo("login")}
            onNavigateRegister={() => navigateTo("register")}
            onNavigateBooking={() => navigateTo("booking")}
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
          userName={userName}
          onNavigateHome={() => navigateTo("landing")}
          onNavigateLogin={() => navigateTo("login")}
          onNavigateRegister={() => navigateTo("register")}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;
