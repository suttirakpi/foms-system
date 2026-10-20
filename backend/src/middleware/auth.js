// middleware/auth.js
// protect    = ต้องล็อกอิน (ตรวจ JWT จาก cookie "token" หรือ header Authorization: Bearer ...)
// restrictTo = จำกัดตามบทบาท เช่น restrictTo("STAFF", "ADMIN")
const jwt = require("jsonwebtoken");
const User = require("../models/User");

function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production") {
    throw new Error("ต้องตั้งค่า JWT_SECRET ใน .env เมื่อรันแบบ production");
  }
  return "foms_dev_secret_do_not_use_in_production"; // ใช้ตอนพัฒนาเท่านั้น
}

function readCookie(req, name) {
  if (req.cookies && req.cookies[name]) return req.cookies[name];
  const header = req.headers.cookie; // เผื่อยังไม่ได้ใช้ cookie-parser
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

function getToken(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) return auth.slice(7);
  return readCookie(req, "token");
}

const protect = async (req, res, next) => {
  try {
    const token = getToken(req);
    if (!token || token === "none") {
      return res
        .status(401)
        .json({ success: false, message: "กรุณาเข้าสู่ระบบก่อนใช้งาน" });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch {
      return res.status(401).json({
        success: false,
        message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่",
      });
    }
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "ไม่พบบัญชีผู้ใช้หรือบัญชีถูกปิดใช้งาน",
      });
    }
    // ใช้ req.user ในทุก route แทนการเชื่อค่าที่หน้าเว็บส่งมา
    req.user = {
      id: user._id.toString(),
      _id: user._id,
      name: user.name,
      role: user.role,
      templeId: user.templeId,
    };
    next();
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "ตรวจสอบสิทธิ์ไม่สำเร็จ",
      error: err.message,
    });
  }
};

const restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ success: false, message: "ท่านไม่มีสิทธิ์ใช้งานส่วนนี้" });
    }
    next();
  };

module.exports = { protect, restrictTo, getJwtSecret };
