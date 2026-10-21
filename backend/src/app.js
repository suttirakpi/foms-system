// app.js - ตั้งค่า Express (แยกจาก server.js เพื่อให้เขียนเทสต์ได้)
// ถ้าโปรเจกต์ของท่านมี server.js เดิมอยู่แล้ว ให้เทียบกับไฟล์นี้: ต้องมี cors(credentials), cookieParser และต่อ route ตามด้านล่าง
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");
const bookingRoutes = require("./routes/bookingRoutes");

const app = express();

const origins = (
  process.env.CLIENT_ORIGIN || "http://localhost:5173,http://localhost:3000"
)
  .split(",")
  .map((s) => s.trim());
app.use(cors({ origin: origins, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api", bookingRoutes);
app.get("/api/health", (req, res) => res.json({ ok: true }));

module.exports = app;
