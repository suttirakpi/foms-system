import React from "react";
import "./Footer.css";

interface FooterProps {
  onNavigateLogin?: () => void;
  onNavigateRegister?: () => void;
  showAuthLinks?: boolean; // เปิดตัวเลือกหน้าล็อกอิน/ลงทะเบียนเมื่อใช้ในหน้า Auth
}

export const Footer: React.FC<FooterProps> = ({
  onNavigateLogin,
  onNavigateRegister,
  showAuthLinks = false,
}) => {
  return (
    <footer className="footer-wrapper">
      <div className="footer-container">
        <div className="footer-left">
          <span>
            FOMS • ระบบบริหารจัดการพิธีการและศาลาวัด เพื่อความสงบและสมเกียรติ
          </span>
        </div>

        <div className="footer-right">
          {showAuthLinks && (
            <>
              <span className="footer-link" onClick={onNavigateLogin}>
                เข้าสู่ระบบ
              </span>
              <span className="footer-link" onClick={onNavigateRegister}>
                ลงทะเบียนเจ้าภาพ
              </span>
            </>
          )}
          <span className="footer-link">ระเบียบการใช้งาน</span>
          <span className="footer-link">ติดต่อฝ่ายพิธีการ</span>
        </div>
      </div>
    </footer>
  );
};
