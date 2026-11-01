// routes/inviteRoutes.js (mount ที่ /api)
const express = require("express");
const ctrl = require("../controllers/inviteController");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.post("/bookings/:id/share", protect, ctrl.createLink);
router.delete("/bookings/:id/share", protect, ctrl.revokeLink);
router.get("/public/invite/:token", ctrl.publicView); // สาธารณะ

module.exports = router;
