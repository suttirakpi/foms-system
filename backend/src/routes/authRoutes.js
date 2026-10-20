const express = require("express");
const {
  register,
  login,
  logout,
  me,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.route("/logout").get(logout).post(logout); // หน้าเว็บเรียกแบบ POST เดิมเรียก GET จึงรับทั้งคู่
router.get("/me", protect, me);

module.exports = router;
