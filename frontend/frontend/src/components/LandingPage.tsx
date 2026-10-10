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
                แพลตฟอร์มบริหารจัดการงานฌาปนกิจ เชื่อมโยงเจ้าภาพ วัด
                และทีมงานไว้ในระบบเดียว
                จองศาลาและจัดคิวพระสงฆ์โดยตรวจสอบการซ้อนทับก่อนยืนยัน
                พร้อมคำนวณค่าใช้จ่ายจากแพ็กเกจและจำนวนแขกให้เห็นทันที
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

        {/* 6. Section: แพ็กเกจการจัดพิธีการสมเกียรติ (ปรับจุดเด่นตาม Flow ใหม่) */}
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
                    จองศาลาขนาดเล็กและจัดคิวพระสงฆ์สวดอภิธรรม
                  </li>
                  <li>
                    <span className="check">✓</span> หีบศพและดอกไม้มาตรฐาน
                    เลือกแบบได้โดยไม่เพิ่มราคา
                  </li>
                  <li>
                    <span className="check">✓</span>{" "}
                    อาหารว่างและน้ำดื่มตามจำนวนแขก
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
                  บริการครบวงจร ดูแลทั้งพิธีสงฆ์ ดอกไม้ และการต้อนรับ
                  พร้อมคำนวณค่าใช้จ่ายตามจำนวนแขกอัตโนมัติ
                </p>
                <ul className="pkg-checklist">
                  <li>
                    <span className="check">✓</span> สิทธิ์จองศาลาขนาดกลาง
                    พร้อมจัดคิวพระสงฆ์รายคืน
                  </li>
                  <li>
                    <span className="check">✓</span>{" "}
                    หีบศพและดอกไม้หลายแบบให้เลือกฟรี
                    อัปเกรดเป็นหีบลายไทยพรีเมียมหรือหีบเย็นได้ (มีส่วนต่างราคา)
                  </li>
                  <li>
                    <span className="check">✓</span>{" "}
                    อาหารว่างและเครื่องดื่มคิดตามจำนวนแขกจริง
                  </li>
                  <li>
                    <span className="check">✓</span> ชุดเครื่องเสียงพร้อมไมค์
                    และของชำร่วย
                  </li>
                  <li>
                    <span className="check">✓</span> E-Card
                    กำหนดการสำหรับส่งต่อให้แขกผ่านช่องทางออนไลน์
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
                  ครอบคลุมสูงสุด ศาลาปรับอากาศและทีมมัคนายกดูแลตลอดงาน
                  พร้อมติดตามสถานะและคิวพิธีแบบเรียลไทม์
                </p>
                <ul className="pkg-checklist">
                  <li>
                    <span className="check">✓</span> ศาลาปรับอากาศขนาดใหญ่
                    พร้อมจัดคิวพระสงฆ์รายคืน
                  </li>
                  <li>
                    <span className="check">✓</span>{" "}
                    หีบศพแกะสลักหรือหีบปรับอากาศพรีเมียม
                    และดอกไม้ตกแต่งดีไซน์พิเศษ
                  </li>
                  <li>
                    <span className="check">✓</span>{" "}
                    ทีมมัคนายกและเจ้าหน้าที่พิธีการกำกับตลอดงาน
                  </li>
                  <li>
                    <span className="check">✓</span>{" "}
                    ระบบไฟและเครื่องเสียงเต็มรูปแบบ
                  </li>
                  <li>
                    <span className="check">✓</span>{" "}
                    จัดเลี้ยงอาหารครบวงจรสำหรับแขกพร้อมเครื่องดื่ม
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
                  onClick={onNavigateToRegister}
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
