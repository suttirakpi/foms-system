import React from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import "./LandingPage.css";

import templeImg from "../assets/img1.jpg"; // แก้ path ให้ตรงกับโฟลเดอร์รูปในโปรเจกต์คุณตูนนะครับ

interface LandingPageProps {
  onNavigateToLogin: () => void;
  onNavigateToRegister: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateToLogin,
  onNavigateToRegister,
}) => {
  return (
    <div className="landing-wrapper">
      {/* 1. เมนูนำทางแบบแยก Component */}
      <Navbar
        onNavigateHome={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        onNavigateLogin={onNavigateToLogin}
        onNavigateRegister={onNavigateToRegister}
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
                แพลตฟอร์มบริหารจัดการงานฌาปนกิจแบบครบวงจร (ERP)
                เชื่อมโยงระบบจองศาลา คำนวณทรัพยากร
                และรันคิวพิธีการหน้างานอย่างแม่นยำ
                ป้องกันการจัดคิวซ้อนและข้อผิดพลาด 100%
              </p>

              <div className="hero-buttons">
                <button
                  className="btn-primary-hero"
                  onClick={onNavigateToRegister}
                >
                  เริ่มต้นวางแผนและเช็กศาลาว่าง ➔
                </button>
                <a href="#packages" className="btn-secondary-hero">
                  ดูบริการและแพ็กเกจพิธี
                </a>
              </div>

              <div className="hero-stats">
                <div className="stat-item">
                  <span className="stat-number">100%</span>
                  <span className="stat-label">ป้องกันการจองคิวซ้อนทับ</span>
                </div>
                <div className="stat-divider" />
                <div className="stat-item">
                  <span className="stat-number">0 บ.</span>
                  <span className="stat-label">ค่าใช้จ่ายแอบแฝงล่วงหน้า</span>
                </div>
                <div className="stat-divider" />
                <div className="stat-item">
                  <span className="stat-number">Real-time</span>
                  <span className="stat-label">อัปเดตการรันคิวหน้างาน</span>
                </div>
              </div>
            </div>

            <div className="hero-image-wrapper">
              <div className="temple-card">
                <div className="temple-image-mock">
                  {/* หากรูปภาพยังไม่มี สามารถใช้ div แทนก่อนได้ */}
                  <img
                    src={templeImg}
                    alt="ศาลาบำเพ็ญกุศล วัดพระราม ๙ กาญจนาภิเษก"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
                <div className="temple-card-footer">
                  <div className="temple-info">
                    <span className="temple-label">
                      ศาลาบำเพ็ญกุศลวัดตัวอย่าง:
                    </span>
                    <span className="temple-name">วัดพระราม ๙ กาญจนาภิเษก</span>
                  </div>
                  <div className="status-badge available">
                    <span
                      className="dot"
                      style={{ backgroundColor: "#735b25" }}
                    />{" "}
                    ศาลาว่าง
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Section: 01–06 คุณค่าแห่งความสงบใจ (ปรับแก้ข้อ 4 และ 6 ใหม่) */}
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
                  ตรวจสอบศาลา เมรุ และกำหนดการประกอบพิธีแบบ Real-time
                  เชื่อมตรงกับสำนักงานวัด มีระบบ Conflict Detection
                  ป้องกันการจัดคิวซ้อน 100%
                </p>
              </div>
              <div className="value-card">
                <span className="card-number">02</span>
                <h3>ไม่ต้องคำนวณวันและลำดับพิธีเอง</h3>
                <p>
                  ระบบจัดตารางทำงานและขั้นตอนพระสวดอภิธรรม พิธีรดน้ำศพ
                  และพิธีฌาปนกิจให้อัตโนมัติ ครบตามประเพณีที่ถูกต้อง
                  ไร้ความกังวล
                </p>
              </div>
              <div className="value-card">
                <span className="card-number">03</span>
                <h3>ไม่ต้องกังวลเรื่องงบประมาณบานปลาย</h3>
                <p>
                  แพ็กเกจโปร่งใส ตรวจสอบราคาได้ชัดเจนทุกหมวดหมู่
                  คำนวณค่าบำรุงศาลา ดอกไม้ ภัตตาหาร ตามสัดส่วนจริง
                  ไม่มีค่าใช้จ่ายแอบแฝง
                </p>
              </div>
              <div className="value-card">
                <span className="card-number">04</span>
                <h3>ไม่ต้องกังวลเรื่องคิวพระและมัคนายก</h3>
                <p>
                  ระบบตรวจสอบและจัดสรรพระสงฆ์พร้อมมัคนายก/พิธีกรประจำพิธีการอย่างแม่นยำ
                  ล็อกคิวอัตโนมัติ ไม่ต้องโทรตามทีละรูป ป้องกันคิวบุคลากรชนกัน
                </p>
              </div>
              <div className="value-card">
                <span className="card-number">05</span>
                <h3>ไม่ต้องคอยโทรติดตามหลายฝ่าย</h3>
                <p>
                  ศูนย์กลางติดตามสถานะงานเดียวที่รวมทั้งเจ้าภาพ คณะสงฆ์
                  เจ้าหน้าที่วัด แผนกดอกไม้
                  และทีมออร์แกไนเซอร์ไว้ในหน้ากระดานปฏิบัติการเดียว
                </p>
              </div>
              <div className="value-card">
                <span className="card-number">06</span>
                <h3>คำนวณค่าใช้จ่ายยืดหยุ่นตามแขกจริง</h3>
                <p>
                  ระบบคำนวณสเกลงาน (Dynamic Scaling) จัดเตรียมเก้าอี้ อุปกรณ์
                  และอาหารว่างตามจำนวนผู้ร่วมงานจริงที่ระบุ
                  ป้องกันของขาดหรือเกินความจำเป็น
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
                    <h4>มาตรฐานการรักษาข้อมูลระดับสถาบัน</h4>
                    <p>
                      ข้อมูลส่วนบุคคลและเอกสารสำคัญถูกจัดเก็บด้วยการเข้ารหัสสูงสุดตาม
                      พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA)
                    </p>
                  </div>
                </div>
              </div>

              <div className="trust-right-grid">
                <div className="trust-card">
                  <div className="trust-card-header">
                    <span className="bullet-indicator" />
                    <h4>ระบบคำนวณทรัพยากรอัจฉริยะ</h4>
                  </div>
                  <p>
                    ประเมินจำนวนอุปกรณ์ เก้าอี้
                    และชุดอาหารว่างให้พอดีกับจำนวนแขก (Guest Count)
                    ช่วยควบคุมสเกลงานได้อย่างมีประสิทธิภาพ
                  </p>
                </div>

                <div className="trust-card">
                  <div className="trust-card-header">
                    <span className="bullet-indicator" />
                    <h4>การทำงานร่วมกันแบบ Real-time</h4>
                  </div>
                  <p>
                    เชื่อมโยงเจ้าภาพ ไวยาวัจกร พระพิธีการ และร้านค้าภายนอก
                    ผ่านกระดานรันคิวงาน (Operations Board)
                    เพื่ออัปเดตสเต็ปพิธีการแบบสดๆ
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

                {/* <div className="trust-card">
                  <div className="trust-card-header">
                    <span className="bullet-indicator" />
                    <h4>ระบบ E-Card & แผนที่นำทาง</h4>
                  </div>
                  <p>
                    สร้างการ์ดเชิญดิจิทัลระบุกำหนดการและประธานในพิธี
                    พร้อมแนบแผนที่นำทางส่งต่อผ่าน LINE Group ได้ทันที
                  </p>
                </div> */}
              </div>
            </div>
          </div>
        </section>

        {/* 5. Section: 4 ขั้นตอนสู่วิธีการที่สมเกียรติ (ปรับแก้ข้อ 3 และ 4) */}
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
                  ค้นหาวัดที่จัดงาน ตรวจสอบสถานะความพร้อมของศาลาและเมรุได้ทันที
                  พร้อมระบบล็อกคิวป้องกันการจองซ้ำซ้อน
                </p>
              </div>

              <div className="step-card">
                <div className="step-card-top">
                  <span className="step-num-gold">02</span>
                </div>
                <h4>ระบุแขกและจัดแพ็กเกจ</h4>
                <p>
                  กำหนดระยะเวลาพิธี (3, 5, 7 คืน)
                  พร้อมระบุจำนวนแขกเพื่อประเมินสเกลงาน
                  และปรับแต่งรายการอุปกรณ์หรือภัตตาหารให้ลงตัว
                </p>
              </div>

              <div className="step-card">
                <div className="step-card-top">
                  <span className="step-num-gold">03</span>
                </div>
                <h4>จัดสรรคิวพิธีการ & บุคลากร</h4>
                <p>
                  ระบบสร้างตารางลำดับพิธีอัตโนมัติ พร้อมล็อกคิวผู้เกี่ยวข้อง
                  เช่น พระสงฆ์ และพิธีกรประจำศาลา ป้องกันคิวชนกัน 100%
                </p>
              </div>

              <div className="step-card">
                <div className="step-card-top">
                  <span className="step-num-gold">04</span>
                </div>
                <h4>ติดตามการรันคิวหน้างาน</h4>
                <p>
                  เช็กสถานะการปฏิบัติงานผ่าน Operations Board
                  ทีมงานจัดการหน้างานแบบ Real-time ตามลำดับพิธีการ
                  แจ้งเตือนตรงถึงมือถือเจ้าภาพ
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Section: แพ็กเกจการจัดพิธีการสมเกียรติ (ปรับจุดเด่นตาม Flow ใหม่) */}
        <section id="packages" className="packages-section">
          <div className="section-container">
            <div className="center-header">
              <span className="section-pretitle">ทางเลือกที่ตอบโจทย์</span>
              <h2 className="section-title">แพ็กเกจการจัดพิธีการสมเกียรติ</h2>
              <p className="center-subtitle">
                ประเมินค่าใช้จ่ายยืดหยุ่นตามจริง ไม่มีบิลแอบแฝง
                ควบคุมทรัพยากรได้ตรงตามขนาดของพิธี
              </p>
            </div>

            <div className="packages-grid">
              {/* Economy */}
              <div className="package-card">
                <div className="package-card-header">
                  <div>
                    <span className="pkg-level">ระดับเริ่มต้น</span>
                    <h3 className="pkg-title">เศรษฐกิจ พอเพียง</h3>
                  </div>
                  <span className="pkg-badge">พอเพียง</span>
                </div>
                <p className="pkg-desc">
                  จัดพิธีศาลา พระสงฆ์ และพิธีพื้นฐานครบถ้วนถูกต้องตามหลักศาสนา
                  เหมาะสำหรับขนาดครอบครัวอบอุ่นและแขกกลุ่มเล็ก
                </p>
                <ul className="pkg-checklist">
                  <li>
                    <span className="check">✓</span>{" "}
                    ประสานงานจองศาลาและล็อกคิวพระสวด 4 รูป
                  </li>
                  <li>
                    <span className="check">✓</span>{" "}
                    เครื่องไทยธรรมและผ้าบังสุกุลพื้นฐาน
                  </li>
                  <li>
                    <span className="check">✓</span>{" "}
                    จัดสรรทรัพยากรและเก้าอี้สำหรับแขกกลุ่มเล็ก
                  </li>
                  <li>
                    <span className="check">✓</span>{" "}
                    กำหนดการพิธีดิจิทัลและตารางเวลาสวด
                  </li>
                </ul>
                <button
                  className="btn-pkg-outline"
                  onClick={onNavigateToRegister}
                >
                  ประเมินราคาแพ็กเกจพอเพียง
                </button>
              </div>

              {/* Standard (Highlighted) */}
              <div className="package-card featured">
                <div className="featured-banner">การเลือกยอดนิยม</div>
                <div className="package-card-header">
                  <div>
                    <span className="pkg-level">ระดับมาตรฐาน</span>
                    <h3 className="pkg-title">มาตรฐาน สมเกียรติ</h3>
                  </div>
                  <span className="pkg-badge featured-badge">สมเกียรติ</span>
                </div>
                <p className="pkg-desc">
                  บริการครบวงจร ดูแลทั้งพิธีสงฆ์ การจัดดอกไม้และการต้อนรับ
                  พร้อมการคำนวณสเกลทรัพยากรอัตโนมัติ (Dynamic Scaling)
                </p>
                <ul className="pkg-checklist">
                  <li>
                    <span className="check">✓</span>{" "}
                    สิทธิ์จองศาลาขนาดกลางพร้อมห้องรับรอง
                  </li>
                  <li>
                    <span className="check">✓</span>{" "}
                    ระบบประเมินอุปกรณ์และเก้าอี้เสริมเมื่อยอดแขกเพิ่ม
                  </li>
                  <li>
                    <span className="check">✓</span>{" "}
                    จัดสรรบริการอาหารว่างและเครื่องดื่มแม่นยำตามหัวคน
                  </li>
                  <li>
                    <span className="check">✓</span>{" "}
                    พวงมาลัยและชุดดอกไม้ประดับหน้าหีบศพมาตรฐาน
                  </li>
                  <li>
                    <span className="check">✓</span> ระบบ E-Card
                    ส่งกำหนดการและแผนที่ผ่าน LINE
                  </li>
                </ul>
                <button
                  className="btn-pkg-solid"
                  onClick={onNavigateToRegister}
                >
                  ประเมินราคาแพ็กเกจสมเกียรติ
                </button>
              </div>

              {/* Premium */}
              <div className="package-card">
                <div className="package-card-header">
                  <div>
                    <span className="pkg-level">ระดับพรีเมียม</span>
                    <h3 className="pkg-title">พรีเมียม ครบวงจร</h3>
                  </div>
                  <span className="pkg-badge">ครบวงจร</span>
                </div>
                <p className="pkg-desc">
                  ครอบคลุมสูงสุด ปฏิบัติการด้วย Operations Board หน้างาน
                  จัดการคิวพิธีกรและต้อนรับอย่างมืออาชีพไร้รอยต่อ
                </p>
                <ul className="pkg-checklist">
                  <li>
                    <span className="check">✓</span>{" "}
                    สิทธิ์จองและจัดการคิวศาลาปรับอากาศระดับพรีเมียม
                  </li>
                  <li>
                    <span className="check">✓</span> กระดานควบคุมคิวหน้างาน
                    (Operations Board) แบบเรียลไทม์
                  </li>
                  <li>
                    <span className="check">✓</span>{" "}
                    ทีมเจ้าหน้าที่พิธีการและมัคนายก ดูแลกำกับตลอดงาน
                  </li>
                  <li>
                    <span className="check">✓</span> ระบบถ่ายทอดสด (Live
                    Streaming) สำหรับญาติมิตรต่างแดน
                  </li>
                  <li>
                    <span className="check">✓</span>{" "}
                    จัดสรรชุดภัตตาหารชั้นเลิศสำหรับแขกพร้อมเครื่องดื่ม
                  </li>
                </ul>
                <button
                  className="btn-pkg-outline"
                  onClick={onNavigateToRegister}
                >
                  ประเมินราคาแพ็กเกจครบวงจร
                </button>
              </div>
            </div>
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
                  onClick={onNavigateToRegister}
                >
                  เช็กศาลาว่างและจองคิว
                </button>
                <button
                  className="btn-secondary-hero"
                  onClick={onNavigateToLogin}
                >
                  ติดต่อเจ้าหน้าที่พิธีการ
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
