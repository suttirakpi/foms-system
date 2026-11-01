// routes/opsRoutes.js (mount ที่ /api/ops) — ทีมจัดงานหน้างาน (OPS) และผู้ดูแลระบบ
const express = require("express");
const ctrl = require("../controllers/opsController");
const { protect, restrictTo } = require("../middleware/auth");

const router = express.Router();
const ops = [protect, restrictTo("OPS", "ADMIN")];

router.get("/jobs", ...ops, ctrl.jobs);
router.get("/bookings/:id/board", ...ops, ctrl.board);
router.get("/bookings/:id/summary", ...ops, ctrl.summary);
router.post("/bookings/:id/steps/init", ...ops, ctrl.initSteps);
router.patch("/steps/:id/complete", ...ops, ctrl.completeStep);

router.post("/bookings/:id/vendors", ...ops, ctrl.addVendor);
router.post("/bookings/:id/vendors/seed", ...ops, ctrl.seedVendors);
router.patch("/vendors/:id", ...ops, ctrl.updateVendor);

router.post("/bookings/:id/ledger", ...ops, ctrl.addEnvelope);
router.patch("/ledger/:id/void", ...ops, ctrl.voidEnvelope);

router.get("/bookings/:id/assignments", ...ops, ctrl.assignments);
router.post("/bookings/:id/assignments", ...ops, ctrl.assign);
router.delete("/assignments/:id", ...ops, ctrl.unassign);

// เจ้าหน้าที่วัดปิดงานแทนได้ (หน้าประวัติของเจ้าหน้าที่ดึงงานที่เสร็จสิ้น)
router.patch("/bookings/:id/status", protect, restrictTo("OPS", "STAFF", "ADMIN"), ctrl.setStatus);

module.exports = router;
