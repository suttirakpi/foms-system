const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ฟังก์ชันสร้าง JWT Token และส่ง HTTP-only Cookie
const sendTokenResponse = (user, statusCode, res) => {
  const payload = { id: user._id, role: user.role };
  // กำหนด Secret Key (ควรนำไปใส่ในไฟล์ .env)
  const token = jwt.sign(payload, process.env.JWT_SECRET || "foms_secret_key", {
    expiresIn: "7d", // Token มีอายุ 7 วัน
  });

  const options = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true, // ป้องกัน XSS Attack
  };

  res
    .status(statusCode)
    .cookie("token", token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
      },
    });
};

// [POST] /api/auth/register - ลงทะเบียนเจ้าภาพ
exports.register = async (req, res) => {
  try {
    const { name, phone, email, password, pdpaConsent } = req.body;

    if (!pdpaConsent) {
      return res
        .status(400)
        .json({ success: false, message: "กรุณายอมรับเงื่อนไข PDPA" });
    }

    // ตรวจสอบว่าเบอร์หรืออีเมลนี้มีในระบบแล้วหรือไม่
    const existingUser = await User.findOne({
      $or: [{ phone }, { email: email || null }],
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "เบอร์โทรศัพท์หรืออีเมลนี้ถูกใช้งานแล้ว",
      });
    }

    // เข้ารหัสผ่าน
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // สร้างบัญชีผู้ใช้ใหม่ (ค่าเริ่มต้น Role คือ HOST)
    const user = await User.create({
      name,
      phone,
      email,
      password: hashedPassword,
      pdpaConsent,
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการลงทะเบียน",
      error: error.message,
    });
  }
};

// [POST] /api/auth/login - เข้าสู่ระบบ
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier รับได้ทั้งเบอร์โทรหรืออีเมล

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "กรุณาระบุเบอร์โทรศัพท์/อีเมล และรหัสผ่าน",
      });
    }

    // ค้นหาผู้ใช้จากเบอร์โทรศัพท์ หรือ อีเมล
    const user = await User.findOne({
      $or: [{ phone: identifier }, { email: identifier }],
    });

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "ไม่พบข้อมูลผู้ใช้งานในระบบ" });
    }

    // ตรวจสอบรหัสผ่าน
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "รหัสผ่านไม่ถูกต้อง" });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ",
      error: error.message,
    });
  }
};

// [GET] /api/auth/logout - ออกจากระบบ
exports.logout = (req, res) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ success: true, message: "ออกจากระบบสำเร็จ" });
};
