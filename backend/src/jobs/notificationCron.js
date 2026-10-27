// jobs/notificationCron.js
const cron = require("node-cron");
const { DutyAssignment } = require("../models/DutyModels");
const { Booking } = require("../models/FuneralModels");

function initCronJobs() {
  // รันทุกวันเวลา 08:00 น.
  cron.schedule("0 8 * * *", async () => {
    console.log("[CRON] เริ่มตรวจสอบคิวงานประจำวัน...");

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    try {
      // 1. อัปเดต Booking สถานะเป็น IN_PROGRESS หากถึงวันสวดวันแรก
      await Booking.updateMany(
        {
          startDate: { $gte: startOfDay, $lte: endOfDay },
          status: "CONFIRMED",
        },
        { $set: { status: "IN_PROGRESS" } }
      );

      // 2. ดึงคิวงานสวดที่มีในวันนี้
      const todayDuties = await DutyAssignment.find({
        dutyDate: { $gte: startOfDay, $lte: endOfDay },
        status: "SCHEDULED",
      })
        .populate("bookingId", "deceasedName hallName")
        .populate("mcId", "name phone")
        .populate("monkIds", "name");

      // 3. ส่ง Notification (LINE Notify / SMS / Webhook ตามระบบของคุณ)
      todayDuties.forEach((duty) => {
        console.log(
          `[NOTIFY] งานสวดคุณ: ${duty.bookingId?.deceasedName} | ศาลา: ${duty.bookingId?.hallName} | มัคนายก: ${duty.mcId?.name} | พระ: ${duty.monkIds.length} รูป`
        );
        // สามารถเพิ่มการยิง LINE Notify API หรือ Socket.io ตรงนี้ได้
      });
    } catch (err) {
      console.error("[CRON ERROR]:", err);
    }
  });
}

module.exports = initCronJobs;