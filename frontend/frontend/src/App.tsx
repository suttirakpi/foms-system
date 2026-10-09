import React, { useState } from "react";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import "./index.css";

export function App() {
  const [currentView, setCurrentView] = useState<"login" | "register">("login");

  return (
    <div className="app-container">
      {currentView === "login" ? (
        <Login onSwitchToRegister={() => setCurrentView("register")} />
      ) : (
        <Register onSwitchToLogin={() => setCurrentView("login")} />
      )}
    </div>
  );
}

export default App;
