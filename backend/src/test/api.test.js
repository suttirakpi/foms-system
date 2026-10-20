// รัน: npm test — ทดสอบ API จริงผ่าน HTTP (ใช้ฐานข้อมูลแยกชื่อ foms_test)
// เน้นจุดที่เคยเป็นบั๊ก: สมัครซ้ำไม่มีอีเมล, จองโดยไม่ล็อกอิน, ออกจากระบบ, ดู/แก้งานคนอื่น, จองซ้อน
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
process.env.NODE_ENV = "test";
const app = require("../app");
const connectDB = require("../config/db");
const { syncAllIndexes } = require("../models");
const { Temple, Package } = require("../models/FuneralModels");
const { ensureMasterData } = require("../seed/masterData");
const { addDays, todayInBangkok } = require("../utils/dates");

const TEST_URI =
  process.env.MONGO_TEST_URI || "mongodb://127.0.0.1:27017/foms_test";
let server, base, temple, hall, pkgStd;

async function api(method, path, { body, cookie } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const sc = res.headers.get("set-cookie");
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* ไม่มี body */
  }
  return { status: res.status, data, cookie: sc ? sc.split(";")[0] : null };
}
const register = (phone, name = "ทดสอบ", extra = {}) =>
  api("POST", "/api/auth/register", {
    body: { name, phone, password: "password123", pdpaConsent: true, ...extra },
  });

const day = (n) => addDays(todayInBangkok(), n);
const bookingBody = (over = {}) => ({
  deceasedName: "ผู้วายชนม์ทดสอบ",
  templeId: String(temple._id),
  hallId: String(hall._id),
  startDate: day(10),
  nights: 3,
  guests: 50,
  packageId: String(pkgStd._id),
  addonIds: [],
  ...over,
});

before(async () => {
  await connectDB(TEST_URI);
  await mongoose.connection.dropDatabase();
  await syncAllIndexes();
  await ensureMasterData();
  temple = await Temple.findOne();
  hall = temple.halls[0];
  pkgStd = await Package.findOne({ level: "Standard" });
  await new Promise((r) => {
    server = app.listen(0, r);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await new Promise((r) => server.close(r));
});

test("บั๊ก #1: สมัครสองคนโดยไม่ใส่อีเมล ต้องสมัครได้ทั้งคู่", async () => {
  const a = await register("081-111-1111");
  const b = await register("082-222-2222");
  assert.equal(a.status, 201);
  assert.equal(
    b.status,
    201,
    `คนที่สองควรสมัครได้ แต่ได้ ${b.status}: ${b.data && b.data.message}`,
  );
});

test("เบอร์โทรซ้ำ (แม้เขียนต่างรูปแบบ) สมัครไม่ได้", async () => {
  const r = await register("0811111111");
  assert.equal(r.status, 400);
});

test("ตรวจข้อมูลสมัคร: รหัสผ่านสั้น / เบอร์ผิด / ไม่ติ๊ก PDPA", async () => {
  assert.equal(
    (
      await api("POST", "/api/auth/register", {
        body: {
          name: "x",
          phone: "0833333333",
          password: "short",
          pdpaConsent: true,
        },
      })
    ).status,
    400,
  );
  assert.equal((await register("12345")).status, 400);
  assert.equal(
    (
      await api("POST", "/api/auth/register", {
        body: {
          name: "x",
          phone: "0833333333",
          password: "password123",
          pdpaConsent: false,
        },
      })
    ).status,
    400,
  );
});

test("สมัครแล้วไม่สามารถตั้ง role เป็น ADMIN เองได้", async () => {
  const r = await register("0844444444", "แฮกเกอร์", { role: "ADMIN" });
  assert.equal(r.status, 201);
  assert.equal(r.data.user.role, "HOST");
});

test("ล็อกอินด้วยเบอร์ (มีขีด) ได้ / รหัสผ่านผิดได้ 401 / รหัสผ่านไม่ปรากฏใน response", async () => {
  const ok = await api("POST", "/api/auth/login", {
    body: { identifier: "081-111-1111", password: "password123" },
  });
  assert.equal(ok.status, 200);
  assert.ok(ok.cookie && ok.cookie.startsWith("token="));
  assert.equal(JSON.stringify(ok.data).includes("password"), false);
  assert.equal(ok.data.token, undefined);
  const wrong = await api("POST", "/api/auth/login", {
    body: { identifier: "0811111111", password: "wrong-pass" },
  });
  assert.equal(wrong.status, 401);
});

test("/me ต้องล็อกอิน", async () => {
  assert.equal((await api("GET", "/api/auth/me")).status, 401);
  const l = await api("POST", "/api/auth/login", {
    body: { identifier: "0811111111", password: "password123" },
  });
  const me = await api("GET", "/api/auth/me", { cookie: l.cookie });
  assert.equal(me.status, 200);
});

test("บั๊ก #6: ออกจากระบบรับทั้ง POST และ GET", async () => {
  assert.equal((await api("POST", "/api/auth/logout")).status, 200);
  assert.equal((await api("GET", "/api/auth/logout")).status, 200);
});

test("บั๊ก #5: จองโดยไม่ล็อกอินไม่ได้", async () => {
  const r = await api("POST", "/api/bookings", { body: bookingBody() });
  assert.equal(r.status, 401);
});

test("master-data เปิดดูได้โดยไม่ต้องล็อกอิน และมีตัวเลือกแบบมีหมวด", async () => {
  const r = await api("GET", "/api/master-data");
  assert.equal(r.status, 200);
  assert.ok(r.data.temples.length > 0 && r.data.packages.length === 3);
  assert.ok(r.data.addons.some((a) => a.categoryKey === "COFFIN"));
});

test("จองสำเร็จ: hostId มาจาก JWT ไม่ใช่ body, ราคาคำนวณฝั่งเซิร์ฟเวอร์, เลขงานรันต่อเนื่อง", async () => {
  const host = await api("POST", "/api/auth/login", {
    body: { identifier: "0811111111", password: "password123" },
  });
  const r = await api("POST", "/api/bookings", {
    cookie: host.cookie,
    body: {
      ...bookingBody(),
      hostId: "000000000000000000000000",
      hostName: "ปลอมชื่อ",
      pricing: { grandTotal: 1 },
    },
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  assert.equal(r.data.hostId, host.data.user.id);
  assert.notEqual(r.data.hostName, "ปลอมชื่อ");
  const expected =
    hall.pricePerNight * 3 + pkgStd.basePrice + pkgStd.snackPerHead * 50 * 3;
  assert.equal(r.data.pricing.grandTotal, expected);
  assert.match(r.data.bookingRef, /^FOMS-\d{4}-0001$/);
});

test("ตรวจข้อมูลจอง: คืน/แขก/วันที่ผ่านมา/หมวดตัวเลือกซ้ำ ต้อง 400", async () => {
  const host = await api("POST", "/api/auth/login", {
    body: { identifier: "0811111111", password: "password123" },
  });
  const post = (over) =>
    api("POST", "/api/bookings", {
      cookie: host.cookie,
      body: bookingBody({ startDate: day(30), ...over }),
    });
  assert.equal((await post({ nights: 2 })).status, 400);
  assert.equal((await post({ guests: 0 })).status, 400);
  assert.equal((await post({ startDate: day(-1) })).status, 400);
  assert.equal((await post({ deceasedName: " " })).status, 400);
  assert.equal((await post({ hallId: "abc" })).status, 400);
  const addons = (await api("GET", "/api/master-data")).data.addons
    .filter((a) => a.categoryKey === "COFFIN")
    .slice(0, 2);
  assert.equal(
    (await post({ addonIds: addons.map((a) => a._id) })).status,
    400,
    "หมวดเดียวกันเลือก 2 ตัวไม่ได้",
  );
});

test("ชนวันที่จองไว้แล้ว ได้ 409 พร้อมรายการวันที่ชน / วันที่ต่อกันพอดีจองได้", async () => {
  const host = await api("POST", "/api/auth/login", {
    body: { identifier: "0811111111", password: "password123" },
  });
  // งานแรกจอง day(10)..day(12) แล้ว
  const clash = await api("POST", "/api/bookings", {
    cookie: host.cookie,
    body: bookingBody({ startDate: day(11), nights: 3 }),
  });
  assert.equal(clash.status, 409);
  assert.deepEqual(clash.data.conflictDates, [day(11), day(12)]);
  const next = await api("POST", "/api/bookings", {
    cookie: host.cookie,
    body: bookingBody({ startDate: day(13), nights: 1 }),
  });
  assert.equal(next.status, 201, "จองต่อจากวันสุดท้ายของงานเดิมได้");
});

test("สองคนกดจองศาลาเดียวกันพร้อมกัน ได้แค่คนเดียว", async () => {
  const a = await api("POST", "/api/auth/login", {
    body: { identifier: "0811111111", password: "password123" },
  });
  const b = await api("POST", "/api/auth/login", {
    body: { identifier: "0822222222", password: "password123" },
  });
  const body = bookingBody({ startDate: day(60), nights: 3 });
  const [r1, r2] = await Promise.all([
    api("POST", "/api/bookings", { cookie: a.cookie, body }),
    api("POST", "/api/bookings", { cookie: b.cookie, body }),
  ]);
  assert.deepEqual([r1.status, r2.status].sort(), [201, 409]);
});

test("บั๊ก #2: /bookings/my เห็นเฉพาะงานของตัวเอง (ส่ง hostId ของคนอื่นก็ไม่ได้ผล)", async () => {
  const a = await api("POST", "/api/auth/login", {
    body: { identifier: "0811111111", password: "password123" },
  });
  const b = await api("POST", "/api/auth/login", {
    body: { identifier: "0822222222", password: "password123" },
  });
  const mine = await api("GET", `/api/bookings/my?hostId=${a.data.user.id}`, {
    cookie: b.cookie,
  });
  assert.equal(mine.status, 200);
  assert.ok(mine.data.every((x) => x.hostId === b.data.user.id));
  assert.equal((await api("GET", "/api/bookings/my")).status, 401);
});

test("บั๊ก #2: ยกเลิก/แนบสลิปงานของคนอื่นไม่ได้ (403)", async () => {
  const a = await api("POST", "/api/auth/login", {
    body: { identifier: "0811111111", password: "password123" },
  });
  const b = await api("POST", "/api/auth/login", {
    body: { identifier: "0822222222", password: "password123" },
  });
  const aBookings = (await api("GET", "/api/bookings/my", { cookie: a.cookie }))
    .data;
  const id = aBookings[0]._id;
  assert.equal(
    (await api("PATCH", `/api/bookings/${id}/cancel`, { cookie: b.cookie }))
      .status,
    403,
  );
  assert.equal(
    (
      await api("PATCH", `/api/bookings/${id}/slip`, {
        cookie: b.cookie,
        body: { paymentSlipUrl: "x.jpg" },
      })
    ).status,
    403,
  );
  assert.equal((await api("PATCH", `/api/bookings/${id}/cancel`)).status, 401);
});

test("ยกเลิกแล้วคืนคิวศาลา จองวันเดิมซ้ำได้ / ยกเลิกซ้ำไม่ได้", async () => {
  const c = await register("0855555555", "คนยกเลิก");
  const body = bookingBody({ startDate: day(90), nights: 3 });
  const created = await api("POST", "/api/bookings", {
    cookie: c.cookie,
    body,
  });
  assert.equal(created.status, 201);
  assert.equal(
    (await api("POST", "/api/bookings", { cookie: c.cookie, body })).status,
    409,
  );
  const cancelled = await api(
    "PATCH",
    `/api/bookings/${created.data._id}/cancel`,
    { cookie: c.cookie },
  );
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.data.status, "CANCELLED");
  assert.equal(
    (await api("POST", "/api/bookings", { cookie: c.cookie, body })).status,
    201,
    "คืนคิวแล้วต้องจองซ้ำได้",
  );
  assert.equal(
    (
      await api("PATCH", `/api/bookings/${created.data._id}/cancel`, {
        cookie: c.cookie,
      })
    ).status,
    400,
  );
});

test("แนบสลิป: เจ้าของแนบได้ / ต้องมีหลักฐาน / งานที่ยกเลิกแล้วแนบไม่ได้", async () => {
  const d = await register("0866666666", "คนแนบสลิป");
  const created = await api("POST", "/api/bookings", {
    cookie: d.cookie,
    body: bookingBody({ startDate: day(120), nights: 1 }),
  });
  assert.equal(
    (
      await api("PATCH", `/api/bookings/${created.data._id}/slip`, {
        cookie: d.cookie,
        body: {},
      })
    ).status,
    400,
  );
  const ok = await api("PATCH", `/api/bookings/${created.data._id}/slip`, {
    cookie: d.cookie,
    body: { paymentSlipUrl: "slip.jpg" },
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.paymentStatus, "SLIP_UPLOADED");
  const e = await register("0877777777", "คนยกเลิกก่อน");
  const c2 = await api("POST", "/api/bookings", {
    cookie: e.cookie,
    body: bookingBody({ startDate: day(150), nights: 1 }),
  });
  await api("PATCH", `/api/bookings/${c2.data._id}/cancel`, {
    cookie: e.cookie,
  });
  assert.equal(
    (
      await api("PATCH", `/api/bookings/${c2.data._id}/slip`, {
        cookie: e.cookie,
        body: { paymentSlipUrl: "x.jpg" },
      })
    ).status,
    400,
  );
});
