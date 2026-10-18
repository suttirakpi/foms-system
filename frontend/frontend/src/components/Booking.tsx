import React, { useState, useEffect } from "react";
import { Navbar } from "./Navbar";
import "./Booking.css";

interface BookingProps {
  isLoggedIn?: boolean;
  userName?: string;
  onNavigateHome: () => void;
  onNavigateLogin: () => void;
  onNavigateRegister: () => void;
  onNavigateDashboard?: () => void;
  onLogout?: () => void;
}

const MOCK_TEMPLES = [
  { id: "t1", name: "วัดพระราม ๙ กาญจนาภิเษก" },
  { id: "t2", name: "วัดมกุฏกษัตริยารามราชวรวิหาร" },
  { id: "t3", name: "วัดธาตุทอง" },
];

const MOCK_HALLS = {
  t1: [
    { id: "h1", name: "ศาลา 1 (ขนาดเล็ก)", capacity: 50, pricePerNight: 2000 },
    { id: "h2", name: "ศาลา 4 (ยอดนิยม)", capacity: 150, pricePerNight: 4500 },
  ],
  t2: [
    {
      id: "h3",
      name: "ศาลาทรงธรรม (ปรับอากาศ)",
      capacity: 300,
      pricePerNight: 8000,
    },
    { id: "h4", name: "ศาลา 2", capacity: 100, pricePerNight: 3500 },
  ],
  t3: [{ id: "h5", name: "ศาลาแสงอรุณ", capacity: 200, pricePerNight: 5500 }],
};

const MOCK_PACKAGES = [
  {
    id: "p1",
    name: "เศรษฐกิจ พอเพียง",
    basePrice: 15000,
    snackPerHead: 30,
    desc: "ชุดพิธีพื้นฐาน พร้อมเครื่องไทยธรรม",
  },
  {
    id: "p2",
    name: "มาตรฐาน สมเกียรติ",
    basePrice: 35000,
    snackPerHead: 50,
    desc: "บริการครบวงจร พร้อมชุดดอกไม้หน้าหีบมาตรฐาน",
  },
  {
    id: "p3",
    name: "พรีเมียม ครบวงจร",
    basePrice: 65000,
    snackPerHead: 80,
    desc: "จัดการโดยมัคนายก พร้อมภัตตาหารชั้นเลิศ",
  },
];

const MOCK_ADDONS = [
  { id: "a1", name: "อัปเกรดหีบเย็นรักษาศพ (Cooling Coffin)", price: 8500 },
  { id: "a2", name: "ชุดดอกไม้ประดับพรีเมียม (Premium Flowers)", price: 4500 },
  { id: "a3", name: "บริการถ่ายทอดสด (Live Streaming)", price: 3500 },
];

export const Booking: React.FC<BookingProps> = ({
  isLoggedIn,
  userName,
  onNavigateHome,
  onNavigateLogin,
  onNavigateRegister,
  onNavigateDashboard,
  onLogout,
}) => {
  const [selectedTemple, setSelectedTemple] = useState(MOCK_TEMPLES[0].id);
  const availableHalls = MOCK_HALLS[selectedTemple as keyof typeof MOCK_HALLS];

  const [hall, setHall] = useState(availableHalls[0]);
  const [startDate, setStartDate] = useState("");
  const [nights, setNights] = useState(3);
  const [guests, setGuests] = useState(100);
  const [pkg, setPkg] = useState(MOCK_PACKAGES[1]);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    setHall(MOCK_HALLS[selectedTemple as keyof typeof MOCK_HALLS][0]);
  }, [selectedTemple]);

  const hallTotal = hall.pricePerNight * nights;
  const snackTotal = pkg.snackPerHead * guests * nights;
  const addonsTotal = selectedAddons.reduce((sum, addonId) => {
    const found = MOCK_ADDONS.find((a) => a.id === addonId);
    return sum + (found ? found.price : 0);
  }, 0);
  const grandTotal = hallTotal + pkg.basePrice + snackTotal + addonsTotal;

  const isOverCapacity = guests > hall.capacity;

  const handleAddonToggle = (id: string) => {
    setSelectedAddons((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const handleConfirmBooking = () => {
    if (!startDate) {
      alert("กรุณาระบุวันที่เริ่มต้นพิธีการ");
      return;
    }

    setIsChecking(true);
    setTimeout(() => {
      setIsChecking(false);
      alert(
        `✅ ตรวจสอบคิวศาลาสำเร็จ (ไม่มีคิวซ้อนทับ)\n\nส่งคำขอจองเรียบร้อยแล้ว!\nสถานะปัจจุบัน: PENDING\n\nระบบจะพาท่านไปยังหน้า "งานของฉัน" เพื่อติดตามสถานะ`,
      );
      if (onNavigateDashboard) {
        onNavigateDashboard();
      } else {
        onNavigateHome();
      }
    }, 1500);
  };

  const currentTempleName = MOCK_TEMPLES.find(
    (t) => t.id === selectedTemple,
  )?.name;

  return (
    <div className="booking-wrapper">
      <Navbar
        currentView="booking"
        isLoggedIn={isLoggedIn}
        userName={userName}
        onNavigateHome={onNavigateHome}
        onNavigateLogin={onNavigateLogin}
        onNavigateRegister={onNavigateRegister}
        onNavigateBooking={() => {}}
        onNavigateDashboard={onNavigateDashboard}
        onLogout={onLogout}
      />

      <div className="booking-header">
        <div className="booking-header-inner">
          <h1>กำหนดพิธีการและจัดเตรียมศาลา</h1>
          <p>
            ระบบประเมินทรัพยากรและค่าใช้จ่ายตามสเกลงานจริง
            พร้อมตรวจสอบคิวว่างแบบ Real-time
          </p>
        </div>
      </div>

      <div className="booking-container">
        <div className="booking-main">
          <section className="form-section">
            <div className="section-title">
              <span className="step-num">01</span>
              <h2>เลือกวัด ศาลา และวันเวลา</h2>
            </div>

            <div className="input-group">
              <label>ค้นหาและเลือกวัด</label>
              <select
                value={selectedTemple}
                onChange={(e) => setSelectedTemple(e.target.value)}
                className="clean-input"
              >
                {MOCK_TEMPLES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-row">
              <div className="input-group">
                <label>วันที่เริ่มต้นพิธี (รดน้ำศพ/สวดคืนแรก)</label>
                <input
                  type="date"
                  className="clean-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>จำนวนคืนสวดอภิธรรม</label>
                <div className="radio-group">
                  {[1, 3, 5, 7].map((n) => (
                    <button
                      key={n}
                      className={`btn-radio ${nights === n ? "active" : ""}`}
                      onClick={() => setNights(n)}
                    >
                      {n} คืน
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <label className="section-subtitle">เลือกศาลาประกอบพิธี</label>
            <div className="hall-grid">
              {availableHalls.map((h) => (
                <div
                  key={h.id}
                  className={`hall-card ${hall.id === h.id ? "selected" : ""}`}
                  onClick={() => setHall(h)}
                >
                  <div className="hall-name">{h.name}</div>
                  <div className="hall-detail">ความจุ: {h.capacity} ท่าน</div>
                  <div className="hall-price">
                    ฿{h.pricePerNight.toLocaleString()} / คืน
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="form-section">
            <div className="section-title">
              <span className="step-num">02</span>
              <h2>จำนวนผู้ร่วมพิธี (Dynamic Scaling)</h2>
            </div>
            <p className="section-desc">
              คำนวณสำหรับจัดเตรียมพื้นที่ เก้าอี้ และชุดอาหารว่าง
              (ปรับแก้ไขจำนวนแขกหน้างานได้)
            </p>

            <div className="slider-container">
              <div className="slider-header">
                <span>จำนวนแขกเฉลี่ยต่อคืน</span>
                <span className="guest-value">{guests} ท่าน</span>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className="guest-slider"
              />
              <div className="slider-labels">
                <span>10</span>
                <span>250</span>
                <span>500+</span>
              </div>
            </div>

            {isOverCapacity && (
              <div className="capacity-warning">
                ⚠️ <strong>ระบบแจ้งเตือนความจุ:</strong> ศาลาที่ท่านเลือกจุได้{" "}
                {hall.capacity} ท่าน
                ระบบจะส่งรายงานให้ทีมงานพิจารณาเพิ่มเต็นท์และเก้าอี้เสริมพื้นที่ด้านนอก
                (ท่านสามารถกดยืนยันจองต่อได้ตามปกติ)
              </div>
            )}
          </section>

          <section className="form-section">
            <div className="section-title">
              <span className="step-num">03</span>
              <h2>แพ็กเกจพิธีสวดและบริการ</h2>
            </div>
            <div className="pkg-grid-form">
              {MOCK_PACKAGES.map((p) => (
                <div
                  key={p.id}
                  className={`pkg-card-form ${pkg.id === p.id ? "selected" : ""}`}
                  onClick={() => setPkg(p)}
                >
                  <div className="pkg-name">{p.name}</div>
                  <div className="pkg-base-price">
                    ราคาฐาน ฿{p.basePrice.toLocaleString()}
                  </div>
                  <p>{p.desc}</p>
                  <div className="pkg-snack-rate">
                    + ค่ารับรอง ฿{p.snackPerHead}/ท่าน/คืน
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="form-section">
            <div className="section-title">
              <span className="step-num">04</span>
              <h2>บริการเสริมพิเศษ (Add-ons)</h2>
            </div>
            <div className="addons-list">
              {MOCK_ADDONS.map((addon) => (
                <label key={addon.id} className="addon-item">
                  <div className="addon-left">
                    <input
                      type="checkbox"
                      checked={selectedAddons.includes(addon.id)}
                      onChange={() => handleAddonToggle(addon.id)}
                    />
                    <span>{addon.name}</span>
                  </div>
                  <div className="addon-price">
                    +฿{addon.price.toLocaleString()}
                  </div>
                </label>
              ))}
            </div>
          </section>
        </div>

        <div className="booking-sidebar">
          <div className="ledger-card">
            <h3>สรุปรายการการจองพิธี</h3>

            <div className="ledger-section">
              <h4>สถานที่และกำหนดการ</h4>
              <div className="ledger-row">
                <span>วัด:</span>
                <span className="text-right">{currentTempleName}</span>
              </div>
              <div className="ledger-row">
                <span>ศาลา:</span>
                <span className="text-right">{hall.name}</span>
              </div>
              <div className="ledger-row">
                <span>ระยะเวลา:</span>
                <span className="text-right">{nights} คืน</span>
              </div>
              <div className="ledger-row">
                <span>จำนวนแขกเฉลี่ย:</span>
                <span
                  className={`text-right ${isOverCapacity ? "text-warning" : ""}`}
                >
                  {guests} ท่าน/คืน
                </span>
              </div>
            </div>

            <div className="ledger-section">
              <h4>รายละเอียดค่าใช้จ่าย (ประเมิน)</h4>
              <div className="ledger-row">
                <span>ค่าบำรุงศาลา ({nights} คืน)</span>
                <span>฿{hallTotal.toLocaleString()}</span>
              </div>
              <div className="ledger-row">
                <span>แพ็กเกจ: {pkg.name}</span>
                <span>฿{pkg.basePrice.toLocaleString()}</span>
              </div>
              <div className="ledger-row sub-row">
                <span>
                  ↳ ค่ารับรอง (฿{pkg.snackPerHead} × {guests}คน × {nights}คืน)
                </span>
                <span>฿{snackTotal.toLocaleString()}</span>
              </div>

              {selectedAddons.length > 0 && (
                <>
                  <div className="ledger-divider" />
                  {selectedAddons.map((id) => {
                    const a = MOCK_ADDONS.find((x) => x.id === id);
                    return a ? (
                      <div className="ledger-row" key={id}>
                        <span>{a.name}</span>
                        <span>฿{a.price.toLocaleString()}</span>
                      </div>
                    ) : null;
                  })}
                </>
              )}
            </div>

            <div className="ledger-total">
              <div className="total-label">ยอดประเมินราคาเบื้องต้น</div>
              <div className="total-amount">฿{grandTotal.toLocaleString()}</div>
              <div className="total-note">
                *ยังไม่ต้องชำระเงิน ระบบจะทำรายการล็อกคิวศาลา (Conflict
                Detection) เมื่อวัดอนุมัติ (CONFIRMED)
                จึงจะเปิดระบบรับชำระเงินและแนบสลิป
              </div>
            </div>

            <button
              className="btn-confirm-booking"
              onClick={handleConfirmBooking}
              disabled={isChecking}
            >
              {isChecking
                ? "⏳ กำลังล็อกคิวศาลา..."
                : "ส่งคำขอจองศาลา (PENDING) ➔"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
