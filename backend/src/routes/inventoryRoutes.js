// routes/inventoryRoutes.js (mount ที่ /api/staff)
const express = require("express");
const ctrl = require("../controllers/inventoryController");
const { protect, restrictTo } = require("../middleware/auth");

const router = express.Router();
const staff = [protect, restrictTo("STAFF", "ADMIN")];

router.get("/inventory", ...staff, ctrl.list);
router.post("/inventory", ...staff, ctrl.create);
router.patch("/inventory/:sku", ...staff, ctrl.update);
router.delete("/inventory/:sku", ...staff, ctrl.remove);

module.exports = router;
