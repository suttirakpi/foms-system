import React, { useState } from "react";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { LandingPage } from "./components/LandingPage";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import "./index.css";

export function App() {
  const [currentView, setCurrentView] = useState<
    "landing" | "login" | "register"
  >("landing");

  return (
    <div className="app-container">
      {currentView === "landing" && (
        <LandingPage
          onNavigateToLogin={() => setCurrentView("login")}
          onNavigateToRegister={() => setCurrentView("register")}
        />
      )}

      {currentView === "login" && (
        <>
          <Navbar
            onNavigateHome={() => setCurrentView("landing")}
            onNavigateLogin={() => setCurrentView("login")}
            onNavigateRegister={() => setCurrentView("register")}
          />
          <Login onSwitchToRegister={() => setCurrentView("register")} />
          <Footer
            showAuthLinks={true}
            onNavigateLogin={() => setCurrentView("login")}
            onNavigateRegister={() => setCurrentView("register")}
          />
        </>
      )}

      {currentView === "register" && (
        <>
          <Navbar
            onNavigateHome={() => setCurrentView("landing")}
            onNavigateLogin={() => setCurrentView("login")}
            onNavigateRegister={() => setCurrentView("register")}
          />
          <Register onSwitchToLogin={() => setCurrentView("login")} />
          <Footer
            showAuthLinks={true}
            onNavigateLogin={() => setCurrentView("login")}
            onNavigateRegister={() => setCurrentView("register")}
          />
        </>
      )}
    </div>
  );
}

export default App;
