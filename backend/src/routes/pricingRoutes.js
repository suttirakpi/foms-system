// routes/pricingRoutes.js (mount ที่ /api)
const express = require("express");
const ctrl = require("../controllers/pricingController");
const { protect, restrictTo } = require("../middleware/auth");

const router = express.Router();

// หน้าจอง (สไลเดอร์แขก) เรียกได้ทุกคนที่ login
router.post("/pricing/calc", protect, ctrl.calc);

// ดูราคาใหม่/ส่วนต่าง ก่อนกดยืนยันแก้ไข (เจ้าภาพ) และตอนปรับแขกหน้างาน (ทีมงาน)
router.post("/bookings/:id/recalc", protect, restrictTo("HOST", "STAFF", "ADMIN"), ctrl.recalc);

module.exports = router;
