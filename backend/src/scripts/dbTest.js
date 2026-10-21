// รัน: npm run test:db  — พิสูจน์ว่า unique index กันจองซ้ำได้จริง (ใช้ฐานข้อมูลแยกชื่อ foms_test)
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const {
  User,
  HallReservation,
  PersonAssignment,
  StepLog,
  Notification,
  syncAllIndexes,
} = require("../models");
const { nextBookingRef } = require("../models/Counter");

const TEST_URI =
  process.env.MONGO_TEST_URI || "mongodb://127.0.0.1:27017/foms_test";
let failed = 0;
const oid = () => new mongoose.Types.ObjectId();

async function check(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}
async function expectDuplicate(p) {
  try {
    await p;
  } catch (e) {
    assert.equal(
      e.code,
      11000,
      `ควรได้ duplicate key 11000 แต่ได้: ${e.message}`,
    );
    return;
  }
  assert.fail("ควรเกิด duplicate key error แต่บันทึกสำเร็จ");
}
const user = (over) => ({
  name: "t",
  password: "x",
  pdpaConsent: true,
  ...over,
});

async function main() {
  await connectDB(TEST_URI);
  await mongoose.connection.dropDatabase();
  await syncAllIndexes();

  console.log("\nศาลา: unique (hallId, date)");
  const hallA = oid(),
    hallB = oid(),
    b1 = oid(),
    b2 = oid();
  await HallReservation.create({
    hallId: hallA,
    bookingId: b1,
    date: "2026-07-12",
  });
  await check("ล็อกศาลาเดียวกันวันเดียวกันซ้ำ ต้อง error", () =>
    expectDuplicate(
      HallReservation.create({
        hallId: hallA,
        bookingId: b2,
        date: "2026-07-12",
      }),
    ),
  );
  await check("ศาลาคนละหลัง วันเดียวกัน ล็อกได้", async () => {
    await HallReservation.create({
      hallId: hallB,
      bookingId: b2,
      date: "2026-07-12",
    });
  });
  await check("ศาลาเดิม คนละวัน ล็อกได้", async () => {
    await HallReservation.create({
      hallId: hallA,
      bookingId: b2,
      date: "2026-07-13",
    });
  });
  await check("สองคนกดจองพร้อมกัน ได้แค่คนเดียว", async () => {
    const hallC = oid();
    const r = await Promise.allSettled([
      HallReservation.create({
        hallId: hallC,
        bookingId: oid(),
        date: "2026-08-01",
      }),
      HallReservation.create({
        hallId: hallC,
        bookingId: oid(),
        date: "2026-08-01",
      }),
    ]);
    assert.equal(r.filter((x) => x.status === "fulfilled").length, 1);
  });

  console.log("\nพระ/มัคนายก: unique (personId, date)");
  const monk = oid();
  await PersonAssignment.create({
    personId: monk,
    bookingId: b1,
    date: "2026-07-12",
    role: "CHIEF",
  });
  await check("พระรูปเดียวกันวันเดียวกัน คนละงาน ต้อง error", () =>
    expectDuplicate(
      PersonAssignment.create({
        personId: monk,
        bookingId: b2,
        date: "2026-07-12",
        role: "CHANT",
      }),
    ),
  );
  await check("พระรูปเดิม คนละวัน จัดได้", async () => {
    await PersonAssignment.create({
      personId: monk,
      bookingId: b1,
      date: "2026-07-13",
      role: "CHANT",
    });
  });

  console.log("\nอื่น ๆ");
  await check("เลขงานรันต่อเนื่อง FOMS-ปี พ.ศ.-0001, 0002", async () => {
    const a = await nextBookingRef(),
      b = await nextBookingRef();
    assert.match(a, /^FOMS-\d{4}-0001$/);
    assert.match(b, /^FOMS-\d{4}-0002$/);
  });
  await check(
    "ผู้ใช้ที่ไม่มีอีเมล สมัครได้หลายคน (แก้บั๊ก #1 ระดับ DB)",
    async () => {
      await User.create(user({ phone: "0811111111" }));
      await User.create(user({ phone: "0822222222" }));
    },
  );
  await check("เบอร์โทรซ้ำไม่ได้", () =>
    expectDuplicate(User.create(user({ phone: "0811111111" }))),
  );
  await check("อีเมลซ้ำไม่ได้ (ไม่สนตัวพิมพ์เล็กใหญ่)", async () => {
    await User.create(user({ phone: "0833333333", email: "dup@foms.test" }));
    await expectDuplicate(
      User.create(user({ phone: "0844444444", email: "DUP@foms.test" })),
    );
  });
  await check(
    "role นอกสัญญาถูกปฏิเสธ (เช่น TEMPLE_STAFF ของเดิม)",
    async () => {
      const err = new User(
        user({ phone: "0855555555", role: "TEMPLE_STAFF" }),
      ).validateSync();
      assert.ok(err && err.errors.role);
    },
  );
  await check("ติ๊กสเต็ปเดิมซ้ำในวันเดียวกัน ต้อง error", async () => {
    const bk = oid(),
      u = oid();
    await StepLog.create({
      bookingId: bk,
      date: "2026-07-12",
      step: "CHANTING",
      doneBy: u,
    });
    await expectDuplicate(
      StepLog.create({
        bookingId: bk,
        date: "2026-07-12",
        step: "CHANTING",
        doneBy: u,
      }),
    );
  });
  await check(
    "แจ้งเตือน dedupeKey ซ้ำต้อง error / ไม่มี key สร้างได้หลายรายการ",
    async () => {
      const mk = () =>
        Notification.create({
          userId: oid(),
          type: "CHANT_REMINDER",
          title: "t",
          message: "m",
          dedupeKey: "k1",
        });
      await mk();
      await expectDuplicate(mk());
      await Notification.create({
        userId: oid(),
        type: "STATUS_CHANGE",
        title: "t",
        message: "m",
      });
      await Notification.create({
        userId: oid(),
        type: "STATUS_CHANGE",
        title: "t",
        message: "m",
      });
    },
  );

  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  console.log(failed === 0 ? "\nผ่านทั้งหมด" : `\nไม่ผ่าน ${failed} รายการ`);
  process.exit(failed === 0 ? 0 : 1);
}
main().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
