// routes/adminRoutes.js (mount ที่ /api/admin) — เฉพาะผู้ดูแลระบบ (ADMIN)
const express = require("express");
const ctrl = require("../controllers/adminController");
const { protect, restrictTo } = require("../middleware/auth");

const router = express.Router();
router.use(protect, restrictTo("ADMIN"));

router.get("/overview", ctrl.overview);

router.get("/users", ctrl.listUsers);
router.post("/users", ctrl.createUser);
router.patch("/users/:id", ctrl.updateUser);

router.get("/temples", ctrl.listTemples);
router.post("/temples", ctrl.createTemple);
router.patch("/temples/:id", ctrl.updateTemple);
router.post("/temples/:id/halls", ctrl.createHall);
router.patch("/temples/:id/halls/:hallId", ctrl.updateHall);

router.get("/packages", ctrl.listPackages);
router.post("/packages", ctrl.createPackage);
router.patch("/packages/:id", ctrl.updatePackage);

router.get("/addons", ctrl.listAddons);
router.post("/addons", ctrl.createAddon);
router.patch("/addons/:id", ctrl.updateAddon);

router.get("/persons", ctrl.listPersons);
router.post("/persons", ctrl.createPerson);
router.patch("/persons/:id", ctrl.updatePerson);

router.get("/rules", ctrl.getRules);
router.put("/rules", ctrl.putRules);

router.get("/audit", ctrl.listAudit);
router.get("/system", ctrl.system);
router.post("/me/password", ctrl.changeOwnPassword);

module.exports = router;
