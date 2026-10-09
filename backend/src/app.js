const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
// สมมติว่าสร้างไฟล์ดึงการเชื่อมต่อ DB ไว้ที่ config/db.js แล้ว
// const connectDB = require('./config/db');

const authRoutes = require("./routes/authRoutes");

const app = express();
const PORT = process.env.PORT || 5000;
const connectDB = require("./config/db");
connectDB(); // เปิดใช้งานเมื่อตั้งค่า DB เสร็จ

// Middlewares
app.use(cors({ origin: "http://localhost:5173", credentials: true })); // อนุญาตให้ Frontend รับ Cookie ได้
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("FOMS Backend is running!");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
