// ข้อมูลตั้งต้น (วัด ศาลา แพ็กเกจ ตัวเลือก) ใช้ร่วมกันระหว่าง scripts/seed.js และ GET /api/master-data
// ตัวเลขราคา/ความจุเป็นค่าสมมติสำหรับทดสอบ
const { Temple, Package, Addon } = require("../models/FuneralModels");

const TEMPLES = [
  {
    name: "วัดตัวอย่างธรรมสถาน",
    province: "ชลบุรี",
    bankName: "ธนาคารกรุงไทย",
    bankAccount: "000-0-00000-0",
    halls: [
      { name: "ศาลา 1 (ขนาดเล็ก)", capacity: 80, pricePerNight: 2000 },
      { name: "ศาลา 2 (ยอดนิยม)", capacity: 150, pricePerNight: 4500 },
      { name: "ศาลา 3 (ปรับอากาศ)", capacity: 300, pricePerNight: 8000 },
    ],
  },
  {
    name: "วัดตัวอย่างพุทธาราม",
    province: "ชลบุรี",
    bankName: "ธนาคารกรุงไทย",
    bankAccount: "000-0-00000-1",
    halls: [
      { name: "ศาลาทรงธรรม (ปรับอากาศ)", capacity: 300, pricePerNight: 8000 },
      { name: "ศาลา 2", capacity: 100, pricePerNight: 3500 },
    ],
  },
  {
    name: "วัดตัวอย่างศรีสุวรรณ",
    province: "ระยอง",
    bankName: "ธนาคารกสิกรไทย",
    bankAccount: "000-0-00000-2",
    halls: [{ name: "ศาลาแสงอรุณ", capacity: 200, pricePerNight: 5500 }],
  },
];

const PACKAGES = [
  {
    name: "เศรษฐกิจ พอเพียง",
    level: "Economy",
    basePrice: 15000,
    snackPerHead: 30,
    sortOrder: 1,
    desc: "ชุดพิธีพื้นฐาน หีบศพและดอกไม้มาตรฐาน พร้อมเครื่องไทยธรรม",
    features: [
      "หีบศพและดอกไม้มาตรฐาน",
      "เครื่องไทยธรรม",
      "กำหนดการพิธีดิจิทัล",
    ],
  },
  {
    name: "มาตรฐาน สมเกียรติ",
    level: "Standard",
    basePrice: 35000,
    snackPerHead: 50,
    sortOrder: 2,
    desc: "บริการครบวงจร ชุดดอกไม้หน้าหีบมาตรฐาน เครื่องเสียง และของชำร่วย",
    features: ["ชุดเครื่องเสียงพร้อมไมค์", "ของชำร่วย", "E-Card กำหนดการ"],
    recommended: true,
  },
  {
    name: "พรีเมียม ครบวงจร",
    level: "Premium",
    basePrice: 65000,
    snackPerHead: 80,
    sortOrder: 3,
    desc: "ดูแลโดยทีมมัคนายก ดอกไม้ดีไซน์พิเศษ พร้อมภัตตาหารครบวงจร",
    features: [
      "ทีมมัคนายกกำกับตลอดงาน",
      "ดอกไม้ดีไซน์พิเศษ",
      "จัดเลี้ยงครบวงจร",
    ],
  },
];

// price 0 = รวมอยู่ในแพ็กเกจ / > 0 = อัปเกรด / มี categoryKey = เลือกได้ 1 ต่อหมวด
const ADDONS = [
  {
    categoryKey: "COFFIN",
    categoryName: "หีบศพ",
    name: "หีบมาตรฐาน ลายที่ 1",
    price: 0,
    isDefault: true,
    sortOrder: 1,
  },
  {
    categoryKey: "COFFIN",
    categoryName: "หีบศพ",
    name: "หีบมาตรฐาน ลายที่ 2",
    price: 0,
    sortOrder: 2,
  },
  {
    categoryKey: "COFFIN",
    categoryName: "หีบศพ",
    name: "หีบมาตรฐาน ลายที่ 3",
    price: 0,
    sortOrder: 3,
  },
  {
    categoryKey: "COFFIN",
    categoryName: "หีบศพ",
    name: "หีบลายไทยพรีเมียม",
    price: 3000,
    sortOrder: 4,
  },
  {
    categoryKey: "COFFIN",
    categoryName: "หีบศพ",
    name: "อัปเกรดหีบเย็นรักษาศพ (Cooling Coffin)",
    price: 8500,
    sortOrder: 5,
  },
  {
    categoryKey: "FLOWERS",
    categoryName: "ดอกไม้หน้าศพ",
    name: "ชุดดอกไม้มาตรฐาน แบบที่ 1",
    price: 0,
    isDefault: true,
    sortOrder: 1,
  },
  {
    categoryKey: "FLOWERS",
    categoryName: "ดอกไม้หน้าศพ",
    name: "ชุดดอกไม้มาตรฐาน แบบที่ 2",
    price: 0,
    sortOrder: 2,
  },
  {
    categoryKey: "FLOWERS",
    categoryName: "ดอกไม้หน้าศพ",
    name: "ชุดดอกไม้มาตรฐาน แบบที่ 3",
    price: 0,
    sortOrder: 3,
  },
  {
    categoryKey: "FLOWERS",
    categoryName: "ดอกไม้หน้าศพ",
    name: "ชุดดอกไม้ประดับพรีเมียม (Premium Flowers)",
    price: 4500,
    sortOrder: 4,
  },
  {
    name: "ชุดบรรเลงดนตรีไทยปี่พาทย์นางหงส์คืนสุดท้าย",
    price: 6000,
    sortOrder: 1,
  }, // บริการเสริมทั่วไป ไม่มีหมวด
];

// ถ้ายังไม่มีข้อมูลตั้งต้นใน DB ให้ใส่ให้ (ใช้ใน GET /master-data เหมือนต้นแบบเดิม)
async function ensureMasterData() {
  if ((await Temple.countDocuments()) === 0) await Temple.insertMany(TEMPLES);
  if ((await Package.countDocuments()) === 0)
    await Package.insertMany(PACKAGES);
  if ((await Addon.countDocuments()) === 0) await Addon.insertMany(ADDONS);
}

module.exports = { TEMPLES, PACKAGES, ADDONS, ensureMasterData };
