const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
<<<<<<< Updated upstream
=======
const bookingRoutes = require("./routes/bookingRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const pricingRoutes = require("./routes/pricingRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const { AppError } = require("./utils/pricing");
>>>>>>> Stashed changes

const app = express();

// 1. เชื่อมต่อฐานข้อมูล MongoDB
connectDB();

// 2. Middlewares Setup
// ปรับ CORS ให้รองรับทั้ง localhost และ 127.0.0.1 บน Port 5173
app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // สำหรับรองรับ form-data / URL encoded
app.use(cookieParser());

// 3. API Routes
app.use("/api/auth", authRoutes);
<<<<<<< Updated upstream

// Health Check Route
app.get("/", (req, res) => {
  res.send("FOMS Backend is running successfully!");
});

// 4. Global Error Handler (ดักจับ Error ป้องกัน Server แครชเมื่อยิง API ผิดพลาด)
app.use((err, req, res, next) => {
  console.error("Backend Error Stack:", err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

module.exports = app;
=======
app.use("/api", bookingRoutes);
app.use("/api", paymentRoutes);
app.use("/api", pricingRoutes);
app.use("/api", scheduleRoutes);
app.get("/api/health", (req, res) => res.json({ ok: true }));

// error middleware ตัวสุดท้าย: แปลง error ทุกชนิดเป็น JSON ให้ client หน้าเดียว
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof AppError)
    return res
      .status(err.status)
      .json({ code: err.code, message: err.message });
  if (err.name === "MulterError")
    return res.status(400).json({
      code: "INVALID_FILE",
      message: "อัปโหลดไฟล์ไม่สำเร็จ (ไฟล์ใหญ่เกิน 5MB หรือส่งผิดช่อง)",
    });
  if (err.name === "CastError")
    return res
      .status(400)
      .json({ code: "INVALID_ID", message: "รหัสอ้างอิงไม่ถูกต้อง" });
  console.error(err);
  res.status(500).json({ code: "SERVER_ERROR", message: "เกิดข้อผิดพลาดในระบบ" });
});

module.exports = app;
>>>>>>> Stashed changes
