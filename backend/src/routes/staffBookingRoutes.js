// routes/staffBookingRoutes.js (mount ที่ /api/staff)
const express = require("express");
const ctrl = require("../controllers/staffBookingController");
const { protect, restrictTo } = require("../middleware/auth");

const router = express.Router();
const staff = [protect, restrictTo("STAFF", "ADMIN")];

router.get("/bookings", ...staff, ctrl.list); // หน้าอนุมัติ (status=PENDING) และประวัติ (status=COMPLETED,CANCELLED)
router.patch("/bookings/:id/approve", ...staff, ctrl.approve);
router.patch("/bookings/:id/reject", ...staff, ctrl.reject);
router.get("/calendar", ...staff, ctrl.calendar);

module.exports = router;
