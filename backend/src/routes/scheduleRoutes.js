// routes/scheduleRoutes.js (mount ที่ /api)
const express = require("express");
const ctrl = require("../controllers/scheduleController");
const { protect, restrictTo } = require("../middleware/auth");

const router = express.Router();

const ownerOrStaff = [protect, restrictTo("HOST", "STAFF", "OPS", "ADMIN")];
const staffOnly = [protect, restrictTo("STAFF", "OPS", "ADMIN")];

// สร้าง/ดูกำหนดการของงาน (เจ้าของงาน ตรวจซ้ำใน controller)
router.post("/bookings/:id/schedule/generate", ...staffOnly, ctrl.generate);
router.get("/bookings/:id/schedule", ...ownerOrStaff, ctrl.listByBooking);

// แก้/ลบ รายการ (ทีมงานเท่านั้น)
router.patch("/schedule-items/:id", ...staffOnly, ctrl.updateItem);
router.delete("/schedule-items/:id", ...staffOnly, ctrl.deleteItem);

module.exports = router;
