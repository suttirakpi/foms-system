// รัน: npm run seed           ใส่ข้อมูลทดสอบ (ถ้าฐานข้อมูลยังว่าง)
// npm run seed:reset         ล้างฐานข้อมูลทั้งหมดแล้วใส่ใหม่ (ระวัง: ผู้ใช้ที่สมัครไว้จะหายด้วย)
require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const {
  User,
  Temple,
  Package,
  Addon,
  Booking,
  HallReservation,
  Person,
  PersonAssignment,
  TempleRule,
  syncAllIndexes,
} = require("../models");
const { TEMPLES, PACKAGES, ADDONS } = require("../seed/masterData");
const { nextBookingRef } = require("../models/Counter");
const { addDays, nightDates, todayInBangkok } = require("../utils/dates");

async function main() {
  await connectDB();
  const reset = process.argv.includes("--reset");
  if (reset) {
    await mongoose.connection.dropDatabase();
  } else if (
    (await Temple.countDocuments()) > 0 ||
    (await Package.countDocuments()) > 0
  ) {
    console.log(
      "ฐานข้อมูลมีข้อมูลอยู่แล้ว จึงไม่ได้ seed (ใช้ npm run seed:reset ถ้าต้องการล้างแล้วใส่ใหม่)",
    );
    await mongoose.disconnect();
    return;
  }
  await syncAllIndexes();

  const temples = await Temple.insertMany(TEMPLES);
  const temple = temples[0];
  const pkgs = await Package.insertMany(PACKAGES);
  await Addon.insertMany(ADDONS);

  // ผู้ใช้ทดสอบ (รหัสผ่านทุกคน: password123)
  const password = await bcrypt.hash("password123", 10);
  const users = await User.insertMany([
    {
      name: "ผู้ดูแลระบบ",
      phone: "0800000001",
      email: "admin@foms.test",
      password,
      role: "ADMIN",
      pdpaConsent: true,
    },
    {
      name: "เจ้าหน้าที่วัด",
      phone: "0800000002",
      email: "staff@foms.test",
      password,
      role: "STAFF",
      templeId: temple._id,
      pdpaConsent: true,
    },
    {
      name: "ทีมงานออร์แกไนเซอร์",
      phone: "0800000003",
      email: "ops@foms.test",
      password,
      role: "OPS",
      templeId: temple._id,
      pdpaConsent: true,
    },
    {
      name: "คุณสมชาย เจ้าภาพ",
      phone: "0800000004",
      password,
      role: "HOST",
      pdpaConsent: true,
    },
  ]);

  const templeId = temple._id;
  const monkNames = [
    "พระครูสมบูรณ์",
    "พระมหาสมศักดิ์",
    "พระใบฎีกาสมพงษ์",
    "พระอนุชิต",
    "พระสมชาย",
    "พระประสิทธิ์",
    "พระวิชัย",
    "พระสุเมธ",
    "พระธีรพล",
  ];
  const persons = await Person.insertMany([
    ...monkNames.map((name) => ({ templeId, type: "MONK", name })),
    { templeId, type: "DEACON", name: "นายสมบัติ มัคนายก" },
    { templeId, type: "DEACON", name: "นายประยูร มัคนายก" },
    { templeId, type: "MC", name: "นายวิรัช พิธีกร" },
    { templeId, type: "MC", name: "นางสาวสุดา พิธีกร" },
  ]);

  await TempleRule.insertMany([
<<<<<<< Updated upstream
    {
      templeId,
      key: "NO_CREMATION_ON_BUDDHIST_DAY",
      value: true,
      description: "ไม่ฌาปนกิจวันพระ",
    },
    {
      templeId,
      key: "MERIT_DAY_COUNT_START",
      value: "DEATH_DAY_IS_DAY_1",
      description: "วิธีนับวันทำบุญ 7/50/100 (ต้องถามวัดจริง)",
    },
    {
      templeId,
      key: "CHANT_START_TIME",
      value: "19:00",
      description: "เวลาเริ่มสวดอภิธรรมของแต่ละคืน",
    },
=======
    { templeId, key: "NO_CREMATION_ON_BUDDHIST_DAY", value: true, description: "ไม่ฌาปนกิจวันพระ (เตือนอย่างเดียว ไม่บล็อก)" },
    { templeId, key: "MERIT_DAY_COUNT_START", value: "CREMATION_DAY_IS_DAY_1", description: "นับวันฌาปนกิจเป็นวันที่ 1 → ทำบุญ 7/50/100 = +6/+49/+99 วัน" },
    { templeId, key: "CHANT_START_TIME", value: "19:00", description: "เวลาเริ่มสวดอภิธรรมของแต่ละคืน" },
    { templeId, key: "BATHING_START_TIME", value: "16:00", description: "เวลาเริ่มพิธีสรงน้ำศพ" },
    { templeId, key: "CREMATION_START_TIME", value: "10:00", description: "เวลาเริ่มพิธีฌาปนกิจ" },
>>>>>>> Stashed changes
  ]);

  // งานตัวอย่าง 1 งาน ล็อกศาลา 1 ไว้ 3 คืน ไว้ทดสอบการชน
  const host = users[3];
  const hall = temple.halls[0];
  const std = pkgs.find((p) => p.level === "Standard");
  const nights = 3,
    guests = 60;
  const startDate = addDays(todayInBangkok(), 5);
  const hallTotal = hall.pricePerNight * nights;
  const snackTotal = std.snackPerHead * guests * nights;
  const start = new Date(startDate);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + nights);
  const booking = await Booking.create({
    bookingRef: await nextBookingRef(),
    hostId: host._id,
    hostName: host.name,
    deceasedName: "ผู้วายชนม์ตัวอย่าง",
    templeId,
    templeName: temple.name,
    hallId: hall._id,
    hallName: hall.name,
    hallPricePerNight: hall.pricePerNight,
    startDate: start,
    endDate: end,
    nights,
    guests,
    packageId: std._id,
    packageName: std.name,
    packageBasePrice: std.basePrice,
    snackPerHead: std.snackPerHead,
    addons: [],
    pricing: {
      hallTotal,
      snackTotal,
      addonsTotal: 0,
      grandTotal: hallTotal + std.basePrice + snackTotal,
    },
    status: "CONFIRMED",
  });
  const dates = nightDates(startDate, nights);
  await HallReservation.insertMany(
    dates.map((date) => ({ hallId: hall._id, bookingId: booking._id, date })),
  );
  const monks = persons.filter((p) => p.type === "MONK");
  const [deacon] = persons.filter((p) => p.type === "DEACON");
  const [mc] = persons.filter((p) => p.type === "MC");
  await PersonAssignment.insertMany(
    dates.flatMap((date) => [
      { personId: monks[0]._id, bookingId: booking._id, date, role: "CHIEF" },
      { personId: monks[1]._id, bookingId: booking._id, date, role: "CHANT" },
      { personId: monks[2]._id, bookingId: booking._id, date, role: "CHANT" },
      { personId: monks[3]._id, bookingId: booking._id, date, role: "CHANT" },
      { personId: mc._id, bookingId: booking._id, date, role: "MC" },
      { personId: deacon._id, bookingId: booking._id, date, role: "MC" },
    ]),
  );

  console.log("seed สำเร็จ");
  console.log(
    `- วัด ${temples.length} แห่ง / แพ็กเกจ ${pkgs.length} / ตัวเลือก ${ADDONS.length} / บุคคล ${persons.length}`,
  );
  console.log(
    `- งานตัวอย่าง ${booking.bookingRef}: ${hall.name} วันที่ ${dates[0]} ถึง ${dates[dates.length - 1]} (ล็อกศาลาและพระไว้แล้ว ใช้ทดสอบการชน)`,
  );
  console.log(
    "- ผู้ใช้ทดสอบ (รหัสผ่าน password123): เบอร์ 0800000001 admin / 0800000002 staff / 0800000003 ops / 0800000004 host",
  );
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error("seed ล้มเหลว:", e);
  await mongoose.disconnect();
  process.exit(1);
});
