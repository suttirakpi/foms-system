import React, { useState } from "react";
import "./Login.css";

interface LoginProps {
  onSwitchToRegister: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSwitchToRegister }) => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
        credentials: "include", // รับ Cookie
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
      }

      alert(`เข้าสู่ระบบสำเร็จ ยินดีต้อนรับคุณ ${data.user.name}`);
      // เปลี่ยนหน้าหรือเก็บสถานะผู้ใช้ตรงนี้
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="lock-icon">🔒</div>
          <h2>เข้าสู่ระบบ</h2>
          <p>
            ยินดีต้อนรับสู่ระบบบริหารจัดการงานฌาปนกิจ
            เพื่อความสงบและสมเกียรติของคุณที่คุณรัก
          </p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label>
              เบอร์โทรศัพท์ หรือ อีเมล <span className="required">จำเป็น</span>
            </label>
            <input
              type="text"
              placeholder="เช่น 081-234-5678 หรือ name@example.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <div className="label-row">
              <label>รหัสผ่าน</label>
              <span className="forgot-link">ลืมรหัสผ่านใช่หรือไม่?</span>
            </div>
            <input
              type="password"
              placeholder="กรอกรหัสผ่านของคุณ"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-checkbox">
            <label>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              จดจำการเข้าสู่ระบบบนอุปกรณ์นี้
            </label>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ ➔"}
          </button>
        </form>

        <div className="auth-divider">
          <span>หรือเพื่อความสะดวก</span>
        </div>

        <button className="btn-secondary-outline" type="button">
          💬 เข้าสู่ระบบด้วยรหัส OTP ทาง SMS / LINE
        </button>

        <div className="auth-footer-link">
          ยังไม่มีบัญชีเจ้าภาพ?{" "}
          <span onClick={onSwitchToRegister} className="link-action">
            ลงทะเบียนเปิดใช้งานระบบ
          </span>
        </div>
      </div>
    </div>
  );
};
