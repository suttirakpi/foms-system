import React, { useState } from "react";
import "./Register.css";

interface RegisterProps {
  onSwitchToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    pdpaConsent: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    if (!formData.pdpaConsent) {
      setError("กรุณากดยอมรับนโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA)");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          email: formData.email || undefined,
          password: formData.password,
          pdpaConsent: formData.pdpaConsent,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "เกิดข้อผิดพลาดในการลงทะเบียน");
      }

      alert("ลงทะเบียนสำเร็จ! เข้าสู่ระบบเรียบร้อย");
      // เปลี่ยนหน้าไปหน้าหลักหรือแดชบอร์ด
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card register-card">
        <div className="auth-header">
          <span className="subtitle-badge">HOST REGISTRATION</span>
          <h2>ลงทะเบียนเจ้าภาพ</h2>
          <p>
            เริ่มต้นสร้างกำหนดการและบริหารจัดการพิธี
            เพื่อความราบรื่นและสมเกียรติสูงสุด
          </p>
        </div>

        <div className="info-box">
          ℹ️ <strong>แบบฟอร์มเฉพาะสำหรับเจ้าภาพครอบครัว</strong>
          <span>
            สำหรับเจ้าหน้าที่วัด ทีมงาน Organizer หรือร้านค้า
            จะได้รับบัญชีเข้าใช้งานโดยตรงจากผู้ดูแลระบบ
          </span>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleRegister} className="auth-form">
          <div className="form-group">
            <div className="label-with-step">
              <label>ชื่อ-นามสกุล เจ้าภาพ *</label>
              <span className="step-num">01</span>
            </div>
            <input
              type="text"
              name="name"
              placeholder="ระบุชื่อและนามสกุลจริง"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <div className="label-with-step">
              <label>เบอร์โทรศัพท์มือถือ *</label>
              <span className="step-num">02</span>
            </div>
            <input
              type="tel"
              name="phone"
              placeholder="เช่น 081-234-5678"
              value={formData.phone}
              onChange={handleChange}
              required
            />
            <small className="form-hint">
              📱 สำหรับรับ SMS แจ้งเตือนสถานะความคืบหน้าของพิธี
            </small>
          </div>

          <div className="form-group">
            <div className="label-with-step">
              <label>อีเมล (ถ้ามี / ไม่บังคับ)</label>
              <span className="step-num">03</span>
            </div>
            <input
              type="email"
              name="email"
              placeholder="host.family@example.com"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <div className="label-with-step">
              <label>ตั้งรหัสผ่าน *</label>
              <span className="step-num">04</span>
            </div>
            <input
              type="password"
              name="password"
              placeholder="กำหนดรหัสผ่านอย่างน้อย 8 ตัวอักษร"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <div className="label-with-step">
              <label>ยืนยันรหัสผ่าน *</label>
              <span className="step-num">05</span>
            </div>
            <input
              type="password"
              name="confirmPassword"
              placeholder="กรอกรหัสผ่านเดิมอีกครั้ง"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-checkbox pdpa-box">
            <label>
              <input
                type="checkbox"
                name="pdpaConsent"
                checked={formData.pdpaConsent}
                onChange={handleChange}
              />
              ข้าพเจ้ายอมรับให้ใช้ข้อมูลเพื่อการประสานงานพิธีการฌาปนกิจตาม{" "}
              <span className="link-pdpa">
                พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA)
              </span>
            </label>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "กำลังบันทึกข้อมูล..." : "ยืนยันการลงทะเบียน ➔"}
          </button>
        </form>

        <div className="auth-footer-link" style={{ marginTop: "1.5rem" }}>
          มีบัญชีใช้งานอยู่แล้ว?{" "}
          <span onClick={onSwitchToLogin} className="link-action">
            เข้าสู่ระบบที่นี่
          </span>
        </div>
      </div>
    </div>
  );
};
