const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");

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