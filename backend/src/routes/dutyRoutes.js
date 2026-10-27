// routes/dutyRoutes.js
const express = require("express");
const router = express.Router();
const dutyController = require("../controllers/dutyController");

// กำหนด Endpoint
router.post("/assign", dutyController.assignDuty);
router.post("/swap", dutyController.swapDuty);
router.get("/status/:bookingId", dutyController.getBookingDutyStatus);

module.exports = router;
