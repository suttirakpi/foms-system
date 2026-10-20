const mongoose = require("mongoose");
const User = require("./User");
const { Temple, Package, Addon, Booking } = require("./FuneralModels");
const { Counter } = require("./Counter");
const HallReservation = require("./HallReservation");
const Person = require("./Person");
const PersonAssignment = require("./PersonAssignment");
const ScheduleItem = require("./ScheduleItem");
const StepLog = require("./StepLog");
const Notification = require("./Notification");
const TempleRule = require("./TempleRule");

const models = {
  User,
  Temple,
  Package,
  Addon,
  Booking,
  Counter,
  HallReservation,
  Person,
  PersonAssignment,
  ScheduleItem,
  StepLog,
  Notification,
  TempleRule,
};

// สร้าง index ทุกตัวให้ตรงกับ schema (เรียกก่อนเทสต์/seed)
async function syncAllIndexes() {
  await Promise.all(Object.values(models).map((m) => m.syncIndexes()));
}

module.exports = { ...models, syncAllIndexes, mongoose };
