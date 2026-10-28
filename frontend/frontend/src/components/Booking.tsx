import React, { useState, useEffect } from "react";
import { Navbar } from "./Navbar";
import { AuthUser } from "../App";
import "./Booking.css";
import { API_URL } from "../config";

interface BookingProps {
  isLoggedIn?: boolean;
  userName?: string;
  currentUser?: AuthUser | null;
  onNavigateHome: () => void;
  onNavigateLogin: () => void;
  onNavigateRegister: () => void;
  onNavigateDashboard?: () => void;
  onLogout?: () => void;
}

interface HallData {
  _id: string;
  name: string;
  capacity: number;
  pricePerNight: number;
}

interface TempleData {
  _id: string;
  name: string;
  halls: HallData[];
}

interface PackageData {
  _id: string;
  name: string;
  basePrice: number;
  snackPerHead: number;
  desc: string;
}

interface AddonData {
  _id: string;
  name: string;
  price: number;
}

export const Booking: React.FC<BookingProps> = ({
  isLoggedIn,
  userName,
  currentUser,
  onNavigateHome,
  onNavigateLogin,
  onNavigateRegister,
  onNavigateDashboard,
  onLogout,
}) => {
  // States สำหรับข้อมูลจาก Database
  const [temples, setTemples] = useState<TempleData[]>([]);
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [addons, setAddons] = useState<AddonData[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // States สำหรับฟอร์มการจอง
  const [deceasedName, setDeceasedName] = useState("");
  const [selectedTempleId, setSelectedTempleId] = useState("");
  const [hall, setHall] = useState<HallData | null>(null);
  const [startDate, setStartDate] = useState("");
  const [nights, setNights] = useState(3);
  const [guests, setGuests] = useState(100);
  const [pkg, setPkg] = useState<PackageData | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. ดึงข้อมูลวัด ศาลา แพ็กเกจ บริการเสริมจาก Database
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        setLoadingData(true);
        const res = await fetch(`${API_URL}/api/master-data`);
        if (!res.ok) throw new Error("ไม่สามารถเชื่อมต่อฐานข้อมูลได้");
        const data = await res.json();

        setTemples(data.temples || []);
        setPackages(data.packages || []);
        setAddons(data.addons || []);

        if (data.temples?.length > 0) {
          setSelectedTempleId(data.temples[0]._id);
          setHall(data.temples[0].halls?.[0] || null);
        }
        if (data.packages?.length > 0) {
          // เลือกแพ็กเกจมาตรฐานเป็นค่าเริ่มต้น
          setPkg(data.packages[1] || data.packages[0]);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "เกิดข้อผิดพลาดในการดึงข้อมูล");
      } finally {
        setLoadingData(false);
      }
    };

    fetchMasterData();
  }, []);

  const currentTemple = temples.find((t) => t._id === selectedTempleId);
  const availableHalls = currentTemple ? currentTemple.halls : [];

  // อัปเดตศาลาเมื่อเปลี่ยนวัด
  const handleTempleChange = (templeId: string) => {
    setSelectedTempleId(templeId);
    const foundTemple = temples.find((t) => t._id === templeId);
    if (foundTemple && foundTemple.halls.length > 0) {
      setHall(foundTemple.halls[0]);
    } else {
      setHall(null);
    }
  };

  const handleAddonToggle = (id: string) => {
    setSelectedAddons((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  // คำนวณราคาแบบเรียลไทม์จากข้อมูลจริงใน DB
  const hallTotal = (hall?.pricePerNight || 0) * nights;
  const snackTotal = (pkg?.snackPerHead || 0) * guests * nights;
  const addonsTotal = selectedAddons.reduce((sum, addonId) => {
    const found = addons.find((a) => a._id === addonId);
    return sum + (found ? found.price : 0);
  }, 0);
  const grandTotal =
    hallTotal + (pkg?.basePrice || 0) + snackTotal + addonsTotal;

  const isOverCapacity = hall ? guests > hall.capacity : false;

  // 2. ส่งข้อมูลการจองไปบันทึกลง MongoDB
  const handleConfirmBooking = async () => {
    if (!deceasedName.trim()) {
      alert("กรุณาระบุชื่อ-นามสกุลของผู้วายชนม์");
      return;
    }
    if (!startDate) {
      alert("กรุณาระบุวันที่เริ่มต้นพิธีการ");
      return;
    }
    if (!hall || !pkg) {
      alert("กรุณาเลือกศาลาและแพ็กเกจ");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          hostId: currentUser?._id || currentUser?.id,
          hostName: currentUser?.name || "เจ้าภาพทั่วไป",
          deceasedName: deceasedName.trim(),
          templeId: selectedTempleId,
          hallId: hall._id,
          startDate,
          nights,
          guests,
          packageId: pkg._id,
          addonIds: selectedAddons,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "ไม่สามารถบันทึกการจองได้");
      }

      alert(
        `✅ บันทึกคำขอจองลงฐานข้อมูลสำเร็จ!\nรหัสอ้างอิง: ${data.bookingRef}\nสถานะปัจจุบัน: ${data.status}`,
      );

      if (onNavigateDashboard) {
        onNavigateDashboard();
      } else {
        onNavigateHome();
      }
    } catch (err: any) {
      alert(`❌ ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

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
            พร้อมตรวจสอบคิวว่างจากฐานข้อมูลแบบ Real-time
          </p>
        </div>
      </div>

      {loadingData ? (
        <div style={{ textAlign: "center", padding: "4rem" }}>
          กำลังดึงข้อมูลวัด ศาลา และแพ็กเกจจากฐานข้อมูล...
        </div>
      ) : errorMsg ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#ba1a1a" }}>
          {errorMsg}
        </div>
      ) : (
        <div className="booking-container">
          <div className="booking-main">
            <section className="form-section">
              <div className="section-title">
                <span className="step-num">01</span>
                <h2>ข้อมูลผู้วายชนม์ เลือกวัด ศาลา และวันเวลา</h2>
              </div>

              <div className="input-group" style={{ marginBottom: "1.25rem" }}>
                <label>
                  ชื่อ-นามสกุล ผู้วายชนม์ (สำหรับออกกำหนดการและ E-Card) *
                </label>
                <input
                  type="text"
                  className="clean-input"
                  placeholder="เช่น คุณพ่อสมเกียรติ ภักดี"
                  value={deceasedName}
                  onChange={(e) => setDeceasedName(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label>ค้นหาและเลือกวัด</label>
                <select
                  value={selectedTempleId}
                  onChange={(e) => handleTempleChange(e.target.value)}
                  className="clean-input"
                >
                  {temples.map((t) => (
                    <option key={t._id} value={t._id}>
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
                        type="button"
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
                    key={h._id}
                    className={`hall-card ${hall?._id === h._id ? "selected" : ""}`}
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

              {isOverCapacity && hall && (
                <div className="capacity-warning">
                  ⚠️ <strong>ระบบแจ้งเตือนความจุ:</strong> ศาลาที่ท่านเลือกจุได้{" "}
                  {hall.capacity} ท่าน
                  ระบบจะส่งรายงานให้ทีมงานพิจารณาเพิ่มเต็นท์และเก้าอี้เสริมพื้นที่ด้านนอก
                </div>
              )}
            </section>

            <section className="form-section">
              <div className="section-title">
                <span className="step-num">03</span>
                <h2>แพ็กเกจพิธีสวดและบริการ</h2>
              </div>
              <div className="pkg-grid-form">
                {packages.map((p) => (
                  <div
                    key={p._id}
                    className={`pkg-card-form ${pkg?._id === p._id ? "selected" : ""}`}
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
                {addons.map((addon) => (
                  <label key={addon._id} className="addon-item">
                    <div className="addon-left">
                      <input
                        type="checkbox"
                        checked={selectedAddons.includes(addon._id)}
                        onChange={() => handleAddonToggle(addon._id)}
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
                  <span>ผู้วายชนม์:</span>
                  <span className="text-right">{deceasedName || "-"}</span>
                </div>
                <div className="ledger-row">
                  <span>วัด:</span>
                  <span className="text-right">{currentTemple?.name}</span>
                </div>
                <div className="ledger-row">
                  <span>ศาลา:</span>
                  <span className="text-right">{hall?.name}</span>
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
                  <span>แพ็กเกจ: {pkg?.name}</span>
                  <span>฿{(pkg?.basePrice || 0).toLocaleString()}</span>
                </div>
                <div className="ledger-row sub-row">
                  <span>
                    ↳ ค่ารับรอง (฿{pkg?.snackPerHead} × {guests}คน × {nights}
                    คืน)
                  </span>
                  <span>฿{snackTotal.toLocaleString()}</span>
                </div>

                {selectedAddons.length > 0 && (
                  <>
                    <div className="ledger-divider" />
                    {selectedAddons.map((id) => {
                      const a = addons.find((x) => x._id === id);
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
                <div className="total-amount">
                  ฿{grandTotal.toLocaleString()}
                </div>
                <div className="total-note">
                  *ระบบจะตรวจสอบคิวศาลาซ้อนทับในฐานข้อมูลทันทีเมื่อกดยืนยัน
                </div>
              </div>

              <button
                className="btn-confirm-booking"
                onClick={handleConfirmBooking}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "⏳ กำลังตรวจสอบคิวและบันทึกข้อมูล..."
                  : "ส่งคำขอจองศาลา (PENDING) ➔"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
