import React from "react";
import "./Navbar.css";

interface NavbarProps {
  onNavigateHome?: () => void;
  onNavigateLogin?: () => void;
  onNavigateRegister?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNavigateHome,
  onNavigateLogin,
  onNavigateRegister,
}) => {
  return (
    <header className="navbar-wrapper">
      <div className="navbar-container">
        {/* โลโก้โครงการ */}
        <div className="brand-logo" onClick={onNavigateHome}>
          <span className="logo-title">FOMS</span>
          <span className="logo-subtitle">FUNERAL OPERATIONS</span>
        </div>

        {/* เมนูนำทางตรงกลาง */}
        <nav className="nav-links">
          <a href="#hero" onClick={onNavigateHome} className="active">
            หน้าหลัก
          </a>
          <a href="#packages">บริการและแพ็กเกจ</a>
          <a href="#steps">ค้นหาวัดและศาลา</a>
          <a href="#trust">สำหรับเจ้าหน้าที่และทีมงาน</a>
        </nav>

        {/* ปุ่มการเข้าใช้งานฝั่งขวา */}
        <div className="navbar-actions">
          <span className="nav-action-text" onClick={onNavigateLogin}>
            เข้าสู่ระบบ
          </span>
          <span className="nav-action-divider">|</span>
          <button className="btn-nav-register" onClick={onNavigateRegister}>
            ลงทะเบียนเจ้าภาพ
          </button>
          <div
            className="nav-user-avatar"
            onClick={onNavigateLogin}
            title="บัญชีผู้ใช้"
          >
            👤
          </div>
        </div>
      </div>
    </header>
  );
};
