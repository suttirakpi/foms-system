// routes/paymentRoutes.js (mount ที่ /api)
const express = require("express");
const ctrl = require("../controllers/paymentController");
const { protect, restrictTo } = require("../middleware/auth");

const router = express.Router();

const ownerOrStaff = [protect, restrictTo("HOST", "STAFF", "ADMIN")];
const adminOrStaff = [protect, restrictTo("ADMIN", "STAFF")];

// เจ้าภาพ (ต้องเป็นเจ้าของงาน — ตรวจซ้ำใน controller)
router.post("/bookings/:id/payment-plan", ...ownerOrStaff, ctrl.createPlan);
router.get("/bookings/:id/payments", ...ownerOrStaff, ctrl.listByBooking);
router.post("/payments/:id/slip", ...ownerOrStaff, ctrl.uploadMiddleware, ctrl.uploadSlip);

// แอดมิน/ทีมงาน
router.get("/payments/pending", ...adminOrStaff, ctrl.listPending);
router.patch("/payments/:id/review", ...adminOrStaff, ctrl.review);

// ดูรูปสลิป (แอดมิน หรือเจ้าภาพเจ้าของงาน — ตรวจซ้ำใน controller)
router.get("/payments/:id/slip", ...ownerOrStaff, ctrl.getSlip);

module.exports = router;
