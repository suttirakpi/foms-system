// routes/hostStepRoutes.js (mount ที่ /api) — เจ้าภาพยืนยันขั้นตอนที่ทีมจัดงานติ๊กเสร็จ
const express = require("express");
const ctrl = require("../controllers/hostStepController");
const { protect, restrictTo } = require("../middleware/auth");

const router = express.Router();
const host = [protect, restrictTo("HOST")];

router.get("/bookings/:id/step-confirmations", ...host, ctrl.list);
router.patch("/bookings/:id/step-confirmations/confirm-all", ...host, ctrl.confirmAll);
router.patch("/run-steps/:id/confirm", ...host, ctrl.decide);

module.exports = router;
