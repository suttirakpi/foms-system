// routes/bookingRoutes.js  (mount ที่ /api)
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const { Temple, Package, Addon, Booking } = require("../models/FuneralModels");
const HallReservation = require("../models/HallReservation");
const { nextBookingRef } = require("../models/Counter");
const { protect, restrictTo } = require("../middleware/auth");
const { ensureMasterData } = require("../seed/masterData");
const {
  isValidDateStr,
  nightDates,
  todayInBangkok,
} = require("../utils/dates");

const ALLOWED_NIGHTS = [1, 3, 5, 7];
const MAX_GUESTS = 1000;
const isId = (v) => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v);
const bad = (res, message) => res.status(400).json({ message });

// ล็อกศาลาทีละคืน (unique hallId+date) ถ้าชนจะคืนรายการวันที่ชน และไม่ทิ้งคืนที่ล็อกค้างไว้
async function lockHallNights(hallId, bookingId, dates) {
  try {
    await HallReservation.insertMany(
      dates.map((date) => ({ hallId, bookingId, date })),
    );
    return { ok: true };
  } catch (err) {
    await HallReservation.deleteMany({ bookingId }); // คืนคิวที่ล็อกไปแล้วของงานนี้
    const isDup =
      err.code === 11000 ||
      (err.writeErrors || []).some((e) => e.code === 11000);
    if (!isDup) throw err;
    const taken = await HallReservation.find({
      hallId,
      date: { $in: dates },
    }).distinct("date");
    return { ok: false, conflictDates: taken.sort() };
  }
}

// 1. GET /api/master-data - ข้อมูลวัด ศาลา แพ็กเกจ และตัวเลือก (เปิดดูได้โดยไม่ต้องล็อกอิน)
router.get("/master-data", async (req, res) => {
  try {
    await ensureMasterData();
    const [temples, packages, addons] = await Promise.all([
      Temple.find({ isActive: { $ne: false } }),
      Package.find({ isActive: { $ne: false } }).sort({ sortOrder: 1 }),
      Addon.find({ isActive: { $ne: false } }).sort({
        categoryKey: 1,
        sortOrder: 1,
      }),
    ]);
    res.json({ temples, packages, addons });
  } catch (err) {
    res
      .status(500)
      .json({ message: "ไม่สามารถดึงข้อมูลตั้งต้นได้", error: err.message });
  }
});

// 2. POST /api/bookings - สร้างคำขอจอง (ต้องล็อกอินเป็นเจ้าภาพ)
router.post("/bookings", protect, restrictTo("HOST"), async (req, res) => {
  try {
    const {
      deceasedName,
      templeId,
      hallId,
      startDate,
      nights,
      guests,
      packageId,
    } = req.body;
    const addonIds = Array.isArray(req.body.addonIds) ? req.body.addonIds : [];

    // ---- ตรวจข้อมูลที่ส่งมา ----
    if (!String(deceasedName || "").trim())
      return bad(res, "กรุณาระบุชื่อผู้วายชนม์");
    if (!isValidDateStr(startDate))
      return bad(res, "วันที่เริ่มต้องเป็นรูปแบบ YYYY-MM-DD");
    if (startDate < todayInBangkok())
      return bad(res, "ไม่สามารถเลือกวันที่ผ่านมาแล้ว");
    const n = Number(nights);
    if (!ALLOWED_NIGHTS.includes(n))
      return bad(res, "จำนวนคืนต้องเป็น 1, 3, 5 หรือ 7");
    const g = Number(guests);
    if (!Number.isInteger(g) || g < 1 || g > MAX_GUESTS)
      return bad(res, `จำนวนแขกต้องอยู่ระหว่าง 1 ถึง ${MAX_GUESTS} คน`);
    if (![templeId, hallId, packageId].every(isId) || !addonIds.every(isId))
      return bad(res, "ข้อมูลวัด ศาลา หรือแพ็กเกจไม่ถูกต้อง");

    const temple = await Temple.findById(templeId);
    const hall = temple && temple.halls.id(hallId);
    const pkg = await Package.findById(packageId);
    if (!temple || !temple.isActive || !hall || hall.isActive === false)
      return bad(res, "ไม่พบวัดหรือศาลาที่เลือก");
    if (!pkg || pkg.isActive === false) return bad(res, "ไม่พบแพ็กเกจที่เลือก");

    const uniqueAddonIds = [...new Set(addonIds)];
    const selectedAddons = await Addon.find({
      _id: { $in: uniqueAddonIds },
      isActive: { $ne: false },
    });
    if (selectedAddons.length !== uniqueAddonIds.length)
      return bad(res, "มีตัวเลือกเสริมที่ไม่ถูกต้อง");
    // ตัวเลือกที่มีหมวด เลือกได้ 1 ตัวเลือกต่อหมวด และต้องใช้ได้กับแพ็กเกจที่เลือก
    const seenCategory = new Set();
    for (const a of selectedAddons) {
      if (
        a.packageIds &&
        a.packageIds.length > 0 &&
        !a.packageIds.some((p) => p.equals(pkg._id))
      ) {
        return bad(res, `ตัวเลือก "${a.name}" ใช้กับแพ็กเกจนี้ไม่ได้`);
      }
      if (a.categoryKey) {
        if (seenCategory.has(a.categoryKey))
          return bad(
            res,
            `หมวด "${a.categoryName || a.categoryKey}" เลือกได้เพียง 1 ตัวเลือก`,
          );
        seenCategory.add(a.categoryKey);
      }
    }

    // ---- คำนวณราคาที่ฝั่งเซิร์ฟเวอร์ (ไม่เชื่อราคาจากหน้าเว็บ) ----
    const hallTotal = hall.pricePerNight * n;
    const snackTotal = pkg.snackPerHead * g * n;
    const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
    const grandTotal = hallTotal + pkg.basePrice + snackTotal + addonsTotal;

    // ---- ล็อกศาลาทีละคืน (กันจองซ้อนแม้กดพร้อมกัน) ----
    const bookingId = new mongoose.Types.ObjectId();
    const dates = nightDates(startDate, n);
    const lock = await lockHallNights(hall._id, bookingId, dates);
    if (!lock.ok) {
      return res.status(409).json({
        code: "HALL_CONFLICT",
        conflictDates: lock.conflictDates,
        message: `ศาลานี้มีการจองแล้วในวันที่ ${lock.conflictDates.join(", ")} กรุณาเลือกศาลาหรือช่วงวันอื่น`,
      });
    }

    const start = new Date(startDate); // เที่ยงคืน UTC ของวันนั้น
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + n); // วันฌาปนกิจ = วันเริ่ม + จำนวนคืน

    try {
      const newBooking = await Booking.create({
        _id: bookingId,
        bookingRef: await nextBookingRef(),
        hostId: req.user._id, // มาจาก JWT ไม่รับจาก body
        hostName: req.user.name,
        deceasedName: String(deceasedName).trim(),
        templeId: temple._id,
        templeName: temple.name,
        hallId: hall._id,
        hallName: hall.name,
        hallPricePerNight: hall.pricePerNight,
        startDate: start,
        endDate: end,
        nights: n,
        guests: g,
        packageId: pkg._id,
        packageName: pkg.name,
        packageBasePrice: pkg.basePrice,
        snackPerHead: pkg.snackPerHead,
        addons: selectedAddons.map((a) => ({
          addonId: a._id,
          name: a.name,
          price: a.price,
          categoryKey: a.categoryKey,
        })),
        pricing: { hallTotal, snackTotal, addonsTotal, grandTotal },
        status: "PENDING",
      });
      res.status(201).json(newBooking);
    } catch (err) {
      await HallReservation.deleteMany({ bookingId }); // สร้างงานไม่สำเร็จ ต้องคืนคิวที่ล็อกไว้
      throw err;
    }
  } catch (err) {
    res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดในการบันทึกการจอง", error: err.message });
  }
});

// 3. GET /api/bookings/my - งานของผู้ใช้ที่ล็อกอินอยู่ (ไม่รับ hostId จาก query แล้ว)
router.get("/bookings/my", protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ hostId: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(bookings);
  } catch (err) {
    res
      .status(500)
      .json({ message: "ไม่สามารถดึงข้อมูลงานของท่านได้", error: err.message });
  }
});

// โหลดงานตาม :id และตรวจว่าเป็นเจ้าของ (หรือเจ้าหน้าที่/แอดมิน) ถ้าไม่ผ่านจะตอบ error ให้เอง
async function loadOwnedBooking(req, res) {
  if (!isId(req.params.id)) {
    bad(res, "รหัสงานไม่ถูกต้อง");
    return null;
  }
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    res.status(404).json({ message: "ไม่พบงานที่ระบุ" });
    return null;
  }
  const isOwner = booking.hostId && booking.hostId.equals(req.user._id);
  const isStaff = ["STAFF", "ADMIN"].includes(req.user.role);
  if (!isOwner && !isStaff) {
    res.status(403).json({ message: "ท่านไม่มีสิทธิ์จัดการงานนี้" });
    return null;
  }
  return booking;
}

// 4. PATCH /api/bookings/:id/slip - แนบสลิปโอนเงิน
// หมายเหตุ: ยังคง status = PAID ตามต้นแบบเดิมเพื่อให้หน้าเว็บทำงาน (M4-07 จะเปลี่ยนเป็นให้เจ้าหน้าที่ตรวจก่อน)
router.patch("/bookings/:id/slip", protect, async (req, res) => {
  try {
    const booking = await loadOwnedBooking(req, res);
    if (!booking) return;
    if (["CANCELLED", "COMPLETED"].includes(booking.status))
      return bad(res, "งานนี้ไม่สามารถแนบสลิปได้แล้ว");
    const { paymentSlipUrl } = req.body;
    if (!String(paymentSlipUrl || "").trim())
      return bad(res, "กรุณาแนบหลักฐานการชำระเงิน");
    booking.paymentSlipUrl = paymentSlipUrl;
    booking.paymentStatus = "SLIP_UPLOADED";
    booking.status = "PAID";
    await booking.save();
    res.json(booking);
  } catch (err) {
    res
      .status(500)
      .json({ message: "ส่งหลักฐานการชำระเงินไม่สำเร็จ", error: err.message });
  }
});

// 5. PATCH /api/bookings/:id/cancel - ยกเลิกคำขอจอง (คืนคิวศาลาด้วย)
router.patch("/bookings/:id/cancel", protect, async (req, res) => {
  try {
    const booking = await loadOwnedBooking(req, res);
    if (!booking) return;
    if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
      return bad(res, "ไม่สามารถยกเลิกงานในสถานะนี้ได้");
    }
    booking.status = "CANCELLED";
    if (req.body && req.body.reason)
      booking.cancelReason = String(req.body.reason);
    await booking.save();
    await HallReservation.deleteMany({ bookingId: booking._id });
    res.json(booking);
  } catch (err) {
    res
      .status(500)
      .json({ message: "ไม่สามารถยกเลิกการจองได้", error: err.message });
  }
});

module.exports = router;
