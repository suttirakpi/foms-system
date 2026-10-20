// รันครั้งเดียวหลังอัปเดตโค้ด: สร้างการล็อกศาลารายคืนให้ "งานเก่า" ที่จองไว้ก่อนมีระบบล็อก
// (ข้ามงานที่ยกเลิกแล้ว) ถ้าพบว่างานเก่าสองงานชนกันเอง จะแจ้งให้ตรวจสอบ ไม่ลบอะไรทิ้ง
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const { Booking } = require("../models/FuneralModels");
const HallReservation = require("../models/HallReservation");
const { nightDates, dateToStr } = require("../utils/dates");

async function main() {
  await connectDB();
  await HallReservation.syncIndexes();
  const bookings = await Booking.find({ status: { $ne: "CANCELLED" } }).sort({ createdAt: 1 });
  let added = 0, skipped = 0, conflicts = 0;
  for (const b of bookings) {
    if (await HallReservation.exists({ bookingId: b._id })) { skipped++; continue; }
    const dates = nightDates(dateToStr(b.startDate), b.nights);
    try {
      await HallReservation.insertMany(dates.map((date) => ({ hallId: b.hallId, bookingId: b._id, date })));
      added++;
    } catch (err) {
      await HallReservation.deleteMany({ bookingId: b._id });
      conflicts++;
      console.log(`ชนกับงานอื่น: ${b.bookingRef} (${dates[0]} ถึง ${dates[dates.length - 1]}) กรุณาตรวจสอบด้วยตนเอง`);
    }
  }
  console.log(`เสร็จ: เพิ่มการล็อก ${added} งาน / มีอยู่แล้ว ${skipped} งาน / ชนกัน ${conflicts} งาน`);
  await mongoose.disconnect();
}
main().catch(async (e) => { console.error(e); await mongoose.disconnect(); process.exit(1); });
