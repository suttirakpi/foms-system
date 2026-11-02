// controllers/hostStepController.js
// เจ้าภาพยืนยันว่าขั้นตอนที่ทีมจัดงาน (OPS) ติ๊กว่าเสร็จ "เสร็จจริง"
//   GET   /api/bookings/:id/step-confirmations          ขั้นตอนที่รอยืนยัน + ความคืบหน้า
//   PATCH /api/run-steps/:id/confirm                      body { decision: "CONFIRM" | "DISPUTE", note? }
//   PATCH /api/bookings/:id/step-confirmations/confirm-all  ยืนยันทุกขั้นที่รออยู่
const { Booking, RunStep } = require("../models");

const isId = (v) => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v);
const bad = (res, message) => res.status(400).json({ message });

const wrap = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    next(err);
  }
};

// เจ้าของงานเท่านั้น
async function loadOwnBooking(req, res, id) {
  if (!isId(id)) return void bad(res, "รหัสงานไม่ถูกต้อง");
  const booking = await Booking.findById(id).lean();
  if (!booking || !booking.hostId || String(booking.hostId) !== String(req.user._id))
    return void res.status(404).json({ message: "ไม่พบงานที่ระบุ" });
  return booking;
}

const dto = (s) => ({
  id: String(s._id), date: s.date, n: s.n, time: s.time, title: s.title, desc: s.desc, status: s.status,
  doneByName: s.doneByName, doneAt: s.doneAt, disputeNote: s.disputeNote,
});

exports.list = wrap(async (req, res) => {
  const booking = await loadOwnBooking(req, res, req.params.id);
  if (!booking) return;
  const steps = await RunStep.find({ bookingId: booking._id }).sort({ date: 1, n: 1 }).lean();
  res.json({
    pending: steps.filter((s) => s.status === "review").map(dto), // รอเจ้าภาพกดยืนยัน
    disputed: steps.filter((s) => s.status === "disputed").map(dto), // เจ้าภาพแจ้งแล้ว รอทีมจัดงานติ๊กใหม่
    confirmed: steps.filter((s) => s.status === "done").length,
    total: steps.length,
  });
});

exports.decide = wrap(async (req, res) => {
  if (!isId(req.params.id)) return bad(res, "รหัสขั้นตอนไม่ถูกต้อง");
  const step = await RunStep.findById(req.params.id).lean();
  if (!step) return res.status(404).json({ message: "ไม่พบขั้นตอน" });
  const booking = await loadOwnBooking(req, res, String(step.bookingId));
  if (!booking) return;

  const decision = req.body && req.body.decision;
  if (decision === "CONFIRM") {
    const ok = await RunStep.findOneAndUpdate(
      { _id: step._id, status: "review" },
      { status: "done", confirmedBy: req.user._id, confirmedByName: req.user.name, confirmedAt: new Date(), disputeNote: "" },
      { new: true },
    );
    if (!ok) return res.status(409).json({ message: "ขั้นตอนนี้ไม่ได้อยู่ในสถานะรอยืนยัน" });
    return res.json(dto(ok));
  }
  if (decision === "DISPUTE") {
    const note = String((req.body && req.body.note) || "").trim();
    if (!note) return bad(res, "กรุณาระบุเหตุผลที่ยังไม่เสร็จ");
    const ok = await RunStep.findOneAndUpdate(
      { _id: step._id, status: "review" },
      { status: "disputed", disputeNote: note },
      { new: true },
    );
    if (!ok) return res.status(409).json({ message: "ขั้นตอนนี้ไม่ได้อยู่ในสถานะรอยืนยัน" });
    return res.json(dto(ok));
  }
  return bad(res, 'decision ต้องเป็น "CONFIRM" หรือ "DISPUTE"');
});

exports.confirmAll = wrap(async (req, res) => {
  const booking = await loadOwnBooking(req, res, req.params.id);
  if (!booking) return;
  const r = await RunStep.updateMany(
    { bookingId: booking._id, status: "review" },
    { status: "done", confirmedBy: req.user._id, confirmedByName: req.user.name, confirmedAt: new Date(), disputeNote: "" },
  );
  res.json({ confirmed: r.modifiedCount });
});
