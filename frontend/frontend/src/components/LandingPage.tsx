import React, { useEffect, useState } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import "./LandingPage.css";

import templeImg from "../assets/img1.jpg";
import { API_URL } from "../config";

interface LandingPackage {
  _id: string;
  name: string;
  level: "Economy" | "Standard" | "Premium";
  basePrice: number;
  snackPerHead: number;
  desc: string;
  features?: string[];
  recommended?: boolean;
}
interface LandingTemple {
  _id: string;
  name: string;
  province?: string;
  halls: { _id: string; isActive?: boolean }[];
}
const LEVEL_LABEL: Record<string, string> = { Economy: "ระดับเริ่มต้น", Standard: "ระดับมาตรฐาน", Premium: "ระดับพรีเมียม" };
const fmtBaht = (n: number) => `฿${n.toLocaleString("th-TH")}`;

interface LandingPageProps {
  isLoggedIn?: boolean;
  userName?: string;
  onNavigateToLogin: () => void;
  onNavigateToRegister: () => void;
  onNavigateBooking?: () => void;
  onNavigateDashboard?: () => void;
  onLogout?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  isLoggedIn,
  userName,
  onNavigateToLogin,
  onNavigateToRegister,
  onNavigateBooking,
  onNavigateDashboard,
  onLogout,
}) => {
  // แพ็กเกจและวัดมาจากฐานข้อมูลจริง (ที่ผู้ดูแลระบบจัดการในหน้าแอดมิน) ไม่ใช่ข้อความตายตัว
  const [packages, setPackages] = useState<LandingPackage[] | null>(null);
  const [temples, setTemples] = useState<LandingTemple[]>([]);
  useEffect(() => {
    fetch(`${API_URL}/api/master-data`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load failed"))))
      .then((d) => {
        setPackages(d.packages || []);
        setTemples(d.temples || []);
      })
      .catch(() => setPackages([]));
  }, []);
  const featuredTemple = temples[0];

  return (
    <div className="landing-wrapper">
      <Navbar
        currentView="landing"
        isLoggedIn={isLoggedIn}
        userName={userName}
        onNavigateHome={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        onNavigateLogin={onNavigateToLogin}
        onNavigateRegister={onNavigateToRegister}
        onNavigateBooking={onNavigateBooking}
        onNavigateDashboard={onNavigateDashboard}
        onLogout={onLogout}
      />

      <main>
        {/* 2. Hero Section */}
        <section id="hero" className="hero-section">
          <div className="hero-container">
            <div className="hero-content">
              <h1 className="hero-title">
                เราดูแลลำดับพิธีให้
                <br />
                <span className="highlight-text">
                  คุณเพียงระบุแขกและเลือกวัน
                </span>
              </h1>
              <p className="hero-desc">
                แพลตฟอร์มบริหารจัดการงานฌาปนกิจ เชื่อมโยงเจ้าภาพ วัด
                และทีมงานไว้ในระบบเดียว
                จองศาลาและจัดคิวพระสงฆ์โดยตรวจสอบการซ้อนทับก่อนยืนยัน
                พร้อมคำนวณค่าใช้จ่ายจากแพ็กเกจและจำนวนแขกให้เห็นทันที
              </p>

              <div className="hero-buttons">
                <button
                  className="btn-primary-hero"
                  onClick={onNavigateBooking}
                >
                  เริ่มต้นวางแผนและเช็กศาลาว่าง ➔
                </button>
                <a href="#packages" className="btn-secondary-hero">
                  ดูบริการและแพ็กเกจพิธี
                </a>
              </div>

              <div className="hero-stats">
                <div className="stat-item">
                  <span className="stat-number">2 ชั้น</span>
                  <span className="stat-label">
                    ตรวจคิวศาลาและคิวพระก่อนยืนยัน
                  </span>
                </div>
                <div className="stat-divider" />
                <div className="stat-item">
                  <span className="stat-number">ทันที</span>
                  <span className="stat-label">
                    เห็นราคาประเมินตามแพ็กเกจและแขก
                  </span>
                </div>
                <div className="stat-divider" />
                <div className="stat-item">
                  <span className="stat-number">Real-time</span>
                  <span className="stat-label">อัปเดตสถานะงานและคิวพิธี</span>
                </div>
              </div>
            </div>

            <div className="hero-image-wrapper">
              <div className="temple-card">
                <div className="temple-image-mock">
                  <img
                    src={templeImg}
                    alt={featuredTemple ? `ศาลาบำเพ็ญกุศล ${featuredTemple.name}` : "ศาลาบำเพ็ญกุศล"}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
                <div className="temple-card-footer">
                  <div className="temple-info">
                    <span className="temple-label">
                      {temples.length > 1 ? `วัดที่เปิดให้จอง ${temples.length} แห่ง` : "วัดที่เปิดให้จอง"}
                    </span>
                    <span className="temple-name">
                      {featuredTemple
                        ? `${featuredTemple.name} · ${featuredTemple.halls.filter((h) => h.isActive !== false).length} ศาลา/เมรุ`
                        : "กำลังโหลดข้อมูลวัด..."}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Section: 01–06 คุณค่าแห่งความสงบใจ */}
        <section className="values-section">
          <div className="section-container">
            <div className="values-header">
              <div>
                <span className="section-pretitle">หลักการบริการพิธีการ</span>
                <h2 className="section-title">01–06 คุณค่าแห่งความสงบใจ</h2>
              </div>
              <p className="values-subtitle">
                เราลดทอนความยุ่งยากด้านการบริหารจัดการทรัพยากร
                เพื่อมอบเวลาอันมีค่าในการไว้อาลัย
                ให้ทุกครอบครัวได้ระลึกถึงบุคคลอันเป็นที่รักอย่างสมบูรณ์
              </p>
            </div>

            <div className="values-grid">
              <div className="value-card">
                <span className="card-number">01</span>
                <h3>ไม่ต้องกังวลจองศาลาซ้อน</h3>
                <p>
                  ตรวจสอบศาลา เมรุ และช่วงเวลาแบบ Real-time ระบบตรวจความซ้อนทับ
                  (Conflict Detection) ก่อนยืนยันการจองทุกครั้ง
                </p>
              </div>
              <div className="value-card">
                <span className="card-number">02</span>
                <h3>ไม่ต้องคำนวณวันและลำดับพิธีเอง</h3>
                <p>
                  ระบบจัดตารางทำงานและขั้นตอนพระสวดอภิธรรม พิธีรดน้ำศพ
                  และพิธีฌาปนกิจให้อัตโนมัติ ตามเงื่อนไขของแต่ละวัด
                </p>
              </div>
              <div className="value-card">
                <span className="card-number">03</span>
                <h3>ไม่ต้องกังวลเรื่องงบประมาณบานปลาย</h3>
                <p>
                  แพ็กเกจโปร่งใส เห็นราคาประเมินชัดเจนก่อนยืนยัน คำนวณจากแพ็กเกจ
                  ตัวเลือกที่เลือก และจำนวนแขก
                </p>
              </div>
              <div className="value-card">
                <span className="card-number">04</span>
                <h3>ไม่ต้องกังวลเรื่องคิวพระและมัคนายก</h3>
                <p>
                  จัดคิวพระสงฆ์และพิธีกร/มัคนายกรายคืน
                  ระบุได้ว่าพระรูปใดประจำคืนใด ตรวจการซ้อนคิว
                  และแนะนำรูปอื่นที่ว่างเมื่อคิวชนกัน
                </p>
              </div>
              <div className="value-card">
                <span className="card-number">05</span>
                <h3>ไม่ต้องคอยโทรติดตามหลายฝ่าย</h3>
                <p>
                  ศูนย์กลางติดตามสถานะงานเดียวสำหรับเจ้าภาพ เจ้าหน้าที่วัด
                  และทีมออร์แกไนเซอร์
                  พร้อมแจ้งเตือนล่วงหน้าก่อนถึงคิวและวันพิธีสำคัญ
                </p>
              </div>
              <div className="value-card">
                <span className="card-number">06</span>
                <h3>คำนวณค่าใช้จ่ายยืดหยุ่นตามแขกจริง</h3>
                <p>
                  ปรับจำนวนแขกหรือตัวเลือกเมื่อไรก็ได้
                  ระบบคำนวณราคาประเมินใหม่ทันที เจ้าภาพเห็นยอดล่าสุดเสมอ
                  ไม่ต้องรอสรุปตอนท้ายงาน
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Section: ทำไมครอบครัวและวัดจึงวางใจ */}
        <section id="trust" className="trust-section">
          <div className="section-container">
            <div className="trust-layout">
              <div className="trust-left">
                <span className="section-pretitle">
                  ความเชื่อมั่นในทุกมิติพิธีการ
                </span>
                <h2 className="section-title">
                  ทำไมครอบครัวและวัด
                  <br />
                  จึงวางใจเลือก "ส่งสุคติ"
                </h2>
                <p className="trust-description">
                  เราใช้เทคโนโลยีในการบริหารจัดการทรัพยากร (Resource Management)
                  อย่างรัดกุมเข้ากับความเคารพในประเพณี
                  เพื่อให้งานดำเนินไปอย่างราบรื่น สง่างาม และสมเกียรติ
                </p>

                <div className="pdpa-assurance-card">
                  <div className="pdpa-text">
                    <h4>คุ้มครองข้อมูลส่วนบุคคล</h4>
                    <p>
                      ข้อมูลของผู้วายชนม์และครอบครัวถูกจัดเก็บตามหลักของ
                      พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA)
                      และกำหนดสิทธิ์การเข้าถึงตามบทบาทผู้ใช้งาน
                    </p>
                  </div>
                </div>
              </div>

              <div className="trust-right-grid">
                <div className="trust-card">
                  <div className="trust-card-header">
                    <span className="bullet-indicator" />
                    <h4>ระบบคำนวณค่าใช้จ่ายยืดหยุ่น</h4>
                  </div>
                  <p>
                    คำนวณราคาจากแพ็กเกจ ตัวเลือกย่อย จำนวนแขก และจำนวนคืนที่สวด
                    ปรับจำนวนแขกแล้วเห็นยอดใหม่ทันที
                  </p>
                </div>

                <div className="trust-card">
                  <div className="trust-card-header">
                    <span className="bullet-indicator" />
                    <h4>การทำงานร่วมกันแบบ Real-time</h4>
                  </div>
                  <p>
                    เชื่อมโยงเจ้าภาพ เจ้าหน้าที่วัด และทีมออร์แกไนเซอร์
                    ผ่านข้อมูลชุดเดียวกัน เพื่ออัปเดตสถานะงานและคิวพิธีการแบบสด
                    ๆ
                  </p>
                </div>

                <div className="trust-card">
                  <div className="trust-card-header">
                    <span className="bullet-indicator" />
                    <h4>ออกแบบเพื่อผู้ใช้ทุกวัย</h4>
                  </div>
                  <p>
                    อินเทอร์เฟซตัวหนังสือขนาดใหญ่ ชัดเจน เรียบง่าย ไม่ซับซ้อน
                    เพื่อให้ผู้ใหญ่ในครอบครัวสามารถติดตามกำหนดการได้อย่างมั่นใจ
                  </p>
                </div>

                <div className="trust-card">
                  <div className="trust-card-header">
                    <span className="bullet-indicator" />
                    <h4>กำหนดการดิจิทัล (E-Card)</h4>
                  </div>
                  <p>
                    ระบบสร้างกำหนดการพิธีอัตโนมัติเป็นการ์ดดิจิทัล
                    เจ้าภาพส่งต่อให้แขกและญาติผ่านช่องทางออนไลน์ได้ทันที
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Section: 4 ขั้นตอนสู่วิธีการที่สมเกียรติ */}
        <section id="steps" className="steps-section">
          <div className="section-container">
            <div className="center-header">
              <span className="section-pretitle">
                กระบวนการบริหารจัดการที่รัดกุม
              </span>
              <h2 className="section-title">
                4 ขั้นตอนสู่พิธีการที่สมเกียรติและไร้กังวล
              </h2>
              <p className="center-subtitle">
                ระบบจัดการและนำทางทีละลำดับอย่างเป็นขั้นตอน
                ปราศจากความซับซ้อนในยามที่ครอบครัวต้องการความสงบใจ
              </p>
            </div>

            <div className="steps-grid">
              <div className="step-card">
                <div className="step-card-top">
                  <span className="step-num-gold">01</span>
                </div>
                <h4>เลือกวัดและศาลา</h4>
                <p>
                  ค้นหาวัดที่จัดงาน ดูปฏิทินศาลาและเมรุว่าง/ไม่ว่างแบบเรียลไทม์
                  แล้วเลือกวันเริ่มและจำนวนคืนที่สวด (1, 3, 5 หรือ 7 คืน)
                </p>
              </div>

              <div className="step-card">
                <div className="step-card-top">
                  <span className="step-num-gold">02</span>
                </div>
                <h4>เลือกแพ็กเกจและระบุแขก</h4>
                <p>
                  เลือกแพ็กเกจและตัวเลือกย่อย เช่น หีบศพ ดอกไม้ อาหาร
                  พร้อมระบุจำนวนแขก ระบบแสดงราคาประเมินทันทีก่อนกดยืนยันการจอง
                </p>
              </div>

              <div className="step-card">
                <div className="step-card-top">
                  <span className="step-num-gold">03</span>
                </div>
                <h4>วัดอนุมัติและจัดคิวพระ</h4>
                <p>
                  เจ้าหน้าที่วัดตรวจสอบและอนุมัติการจอง
                  จากนั้นจัดคิวพระสงฆ์รายคืน หากพระรูปใดติดคิวอื่น
                  ระบบเตือนและแนะนำรูปที่ว่างแทน
                </p>
              </div>

              <div className="step-card">
                <div className="step-card-top">
                  <span className="step-num-gold">04</span>
                </div>
                <h4>ชำระเงินและติดตามงาน</h4>
                <p>
                  ชำระตามราคาแพ็กเกจรวมด้วยการโอนและแนบสลิป รับกำหนดการ E-Card
                  ติดตามสถานะงาน พร้อมแจ้งเตือนล่วงหน้าในระบบ
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Section: แพ็กเกจการจัดพิธีการสมเกียรติ */}
        <section id="packages" className="packages-section">
          <div className="section-container">
            <div className="center-header">
              <span className="section-pretitle">ทางเลือกที่ตอบโจทย์</span>
              <h2 className="section-title">แพ็กเกจการจัดพิธีการสมเกียรติ</h2>
              <p className="center-subtitle">
                เลือกแพ็กเกจพร้อมตัวเลือกย่อยในแต่ละหมวด
                เห็นราคาประเมินตามจำนวนแขกก่อนยืนยัน ไม่มีบิลแอบแฝง
              </p>
            </div>

            <div className="packages-grid">
              {packages === null && <p className="center-subtitle">กำลังโหลดแพ็กเกจจากระบบ...</p>}
              {packages !== null && packages.length === 0 && (
                <p className="center-subtitle">ยังไม่มีแพ็กเกจที่เปิดให้บริการในขณะนี้</p>
              )}
              {(packages || []).map((pkg) => (
                <div key={pkg._id} className={`package-card ${pkg.recommended ? "featured" : ""}`}>
                  {pkg.recommended && <div className="featured-banner">การเลือกยอดนิยม</div>}
                  <div className="package-card-header">
                    <div>
                      <span className="pkg-level">{LEVEL_LABEL[pkg.level] || pkg.level}</span>
                      <h3 className="pkg-title">{pkg.name}</h3>
                    </div>
                    <span className={`pkg-badge ${pkg.recommended ? "featured-badge" : ""}`}>
                      เริ่มต้น {fmtBaht(pkg.basePrice)}
                    </span>
                  </div>
                  <p className="pkg-desc">{pkg.desc}</p>
                  <ul className="pkg-checklist">
                    {(pkg.features || []).map((f) => (
                      <li key={f}>
                        <span className="check">✓</span> {f}
                      </li>
                    ))}
                    <li>
                      <span className="check">✓</span> ค่าบริการรับรองแขก {fmtBaht(pkg.snackPerHead)} ต่อท่านต่อคืน
                    </li>
                  </ul>
                  <button className={pkg.recommended ? "btn-pkg-solid" : "btn-pkg-outline"} onClick={onNavigateBooking}>
                    ประเมินราคาแพ็กเกจ{pkg.name}
                  </button>
                </div>
              ))}
            </div>

            <p className="packages-note">
              ราคาจริงคำนวณจากแพ็กเกจ ตัวเลือกย่อยที่เลือก จำนวนแขก
              และจำนวนคืนที่สวด สามารถปรับเปลี่ยนได้ก่อนวันงาน
            </p>
          </div>
        </section>

        {/* 7. CTA Banner Before Footer */}
        <section className="cta-banner-section">
          <div className="section-container">
            <div className="cta-banner-content">
              <div className="cta-gold-line" />
              <h2 className="cta-headline">
                ให้ทุกช่วงเวลาแห่งความอาลัย
                <br />
                เป็นไปด้วยความสงบและสมเกียรติสูงสุด
              </h2>
              <p className="cta-subheadline">
                เริ่มต้นสำรวจวัดและศาลาที่ท่านไว้วางใจ
                เพื่อให้เราเป็นผู้ช่วยแบ่งเบาภาระในการบริหารจัดการทรัพยากรทั้งหมดตั้งแต่วันนี้
              </p>
              <div className="cta-buttons">
                <button
                  className="btn-primary-hero"
                  onClick={onNavigateBooking}
                >
                  เช็กศาลาว่างและจองคิว
                </button>
                <button
                  className="btn-secondary-hero"
                  onClick={onNavigateToLogin}
                >
                  เข้าสู่ระบบเพื่อติดตามงาน
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
