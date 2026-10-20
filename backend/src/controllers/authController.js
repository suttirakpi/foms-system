const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getJwtSecret } = require("../middleware/auth");

const COOKIE_DAYS = 7;

// สร้าง JWT แล้วส่งเป็น HTTP-only cookie (ไม่ส่ง token ใน body เพื่อให้ JavaScript ฝั่งเว็บอ่านไม่ได้)
const sendTokenResponse = (user, statusCode, res) => {
  const token = jwt.sign({ id: user._id, role: user.role }, getJwtSecret(), {
    expiresIn: `${COOKIE_DAYS}d`,
  });

  const options = {
    expires: new Date(Date.now() + COOKIE_DAYS * 24 * 60 * 60 * 1000),
    httpOnly: true, // ป้องกัน XSS
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production", // production ต้องเป็น https
  };

  res
    .status(statusCode)
    .cookie("token", token, options)
    .json({
      success: true,
      user: { id: user._id, name: user.name, role: user.role },
    });
};

// เบอร์โทร: เก็บเป็นตัวเลขล้วน (081-234-5678 กับ 0812345678 ถือเป็นเบอร์เดียวกัน)
const normalizePhone = (p) => String(p || "").replace(/\D/g, "");
const isValidPhone = (p) => /^0\d{8,9}$/.test(p);

// [POST] /api/auth/register - ลงทะเบียนเจ้าภาพ
exports.register = async (req, res) => {
  try {
    const { name, password, pdpaConsent } = req.body;
    const phone = normalizePhone(req.body.phone);
    const email =
      String(req.body.email || "")
        .trim()
        .toLowerCase() || undefined;

    if (!String(name || "").trim()) {
      return res
        .status(400)
        .json({ success: false, message: "กรุณาระบุชื่อ-นามสกุล" });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: "เบอร์โทรศัพท์ไม่ถูกต้อง (ตัวเลข 9-10 หลัก ขึ้นต้นด้วย 0)",
      });
    }
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
      });
    }
    if (!pdpaConsent) {
      return res
        .status(400)
        .json({ success: false, message: "กรุณายอมรับเงื่อนไข PDPA" });
    }

    // แก้บั๊ก: เดิมใช้ { email: email || null } ซึ่งไปตรงกับผู้ใช้ทุกคนที่ไม่มีอีเมล
    // ตอนนี้ใส่เงื่อนไขอีเมลเฉพาะตอนที่ผู้สมัครกรอกอีเมลมาเท่านั้น
    const conditions = [{ phone }];
    if (email) conditions.push({ email });
    const existingUser = await User.findOne({ $or: conditions });
    if (existingUser) {
      const samePhone = existingUser.phone === phone;
      return res.status(400).json({
        success: false,
        message: samePhone
          ? "เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว"
          : "อีเมลนี้ถูกใช้งานแล้ว",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // role บังคับเป็น HOST เสมอ (ไม่รับ role จากหน้าเว็บ กันสมัครเป็น ADMIN เอง)
    const user = await User.create({
      name: String(name).trim(),
      phone,
      email,
      password: hashedPassword,
      pdpaConsent: true,
      role: "HOST",
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "เบอร์โทรศัพท์หรืออีเมลนี้ถูกใช้งานแล้ว",
      });
    }
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการลงทะเบียน",
      error: error.message,
    });
  }
};

// [POST] /api/auth/login - เข้าสู่ระบบ (identifier = เบอร์โทรหรืออีเมล)
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "กรุณาระบุเบอร์โทรศัพท์/อีเมล และรหัสผ่าน",
      });
    }

    const id = String(identifier).trim();
    const query = id.includes("@")
      ? { email: id.toLowerCase() }
      : { phone: normalizePhone(id) };

    // password ถูกซ่อนไว้โดยค่าเริ่มต้น ต้องขอมาตรง ๆ
    const user = await User.findOne(query).select("+password");

    // ข้อความเดียวกันทั้งกรณีไม่พบผู้ใช้และรหัสผ่านผิด (ไม่บอกว่ามีบัญชีนี้อยู่หรือไม่)
    const invalid = () =>
      res.status(401).json({
        success: false,
        message: "เบอร์โทรศัพท์/อีเมล หรือรหัสผ่านไม่ถูกต้อง",
      });

    if (!user || !user.isActive) return invalid();
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return invalid();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ",
      error: error.message,
    });
  }
};

// [GET|POST] /api/auth/logout - ออกจากระบบ (รับทั้ง GET และ POST)
exports.logout = (req, res) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  res.status(200).json({ success: true, message: "ออกจากระบบสำเร็จ" });
};

// [GET] /api/auth/me - ข้อมูลผู้ใช้ที่ล็อกอินอยู่ (ให้หน้าเว็บเช็กเซสชันตอนเปิดหน้า)
exports.me = (req, res) => {
  res.json({
    success: true,
    user: { id: req.user.id, name: req.user.name, role: req.user.role },
  });
};
