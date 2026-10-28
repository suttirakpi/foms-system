// controllers/dutyController.js
const { DutyAssignment, Staff } = require("../models/DutyModels");
const { Booking } = require("../models/FuneralModels");

// Helper: ตรวจสอบ Conflict วันเดียวกัน
async function checkConflict(dutyDate, monkIds = [], mcId = null, excludeAssignmentId = null) {
  const startOfDay = new Date(dutyDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(dutyDate);
  endOfDay.setHours(23, 59, 59, 999);

  const query = {
    dutyDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $ne: "CANCELLED" },
  };

  if (excludeAssignmentId) {
    query._id = { $ne: excludeAssignmentId };
  }

  const existingAssignments = await DutyAssignment.find(query);

  const busyMonks = new Set();
  let busyMc = null;

  existingAssignments.forEach((assign) => {
    assign.monkIds.forEach((mId) => busyMonks.add(mId.toString()));
    if (assign.mcId) busyMc = assign.mcId.toString();
  });

  const monkConflicts = monkIds.filter((id) => busyMonks.has(id.toString()));
  const mcConflict = mcId && busyMc === mcId.toString() ? mcId : null;

  return {
    hasConflict: monkConflicts.length > 0 || !!mcConflict,
    monkConflicts,
    mcConflict,
  };
}

// 1. POST /api/duty/assign — มอบหมายคิวงาน
exports.assignDuty = async (req, res) => {
  try {
    const { bookingId, dutyDate, monkIds, mcId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "ไม่พบข้อมูลการจอง" });

    // ตรวจสอบ Conflict
    const conflictResult = await checkConflict(dutyDate, monkIds, mcId);
    if (conflictResult.hasConflict) {
      return res.status(400).json({
        message: "พบข้อขัดแย้ง คิวงานซ้ำซ้อนในวันที่กำหนด",
        conflicts: conflictResult,
      });
    }

    const assignment = await DutyAssignment.findOneAndUpdate(
      { bookingId, dutyDate: new Date(dutyDate) },
      { templeId: booking.templeId, monkIds, mcId, status: "SCHEDULED" },
      { upsert: true, new: true }
    );

    return res.status(200).json({ success: true, data: assignment });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
// controllers/dutyController.js
const { DutyAssignment } = require("../models/DutyModels");
const { Booking } = require("../models/FuneralModels");

// Helper Function: ตรวจสอบ Conflict วันเดียวกัน
async function checkConflict(dutyDate, monkIds = [], mcId = null, excludeAssignmentId = null) {
  const startOfDay = new Date(dutyDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(dutyDate);
  endOfDay.setHours(23, 59, 59, 999);

  const query = {
    dutyDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $ne: "CANCELLED" },
  };

  if (excludeAssignmentId) {
    query._id = { $ne: excludeAssignmentId };
  }

  const existingAssignments = await DutyAssignment.find(query);

  const busyMonks = new Set();
  let busyMc = null;

  existingAssignments.forEach((assign) => {
    assign.monkIds.forEach((mId) => busyMonks.add(mId.toString()));
    if (assign.mcId) busyMc = assign.mcId.toString();
  });

  const monkConflicts = monkIds.filter((id) => busyMonks.has(id.toString()));
  const mcConflict = mcId && busyMc === mcId.toString() ? mcId : null;

  return {
    hasConflict: monkConflicts.length > 0 || !!mcConflict,
    monkConflicts,
    mcConflict,
  };
}

// 2. จัดคิวงาน (Assign)
exports.assignDuty = async (req, res) => {
  try {
    const { bookingId, dutyDate, monkIds, mcId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "ไม่พบข้อมูลการจอง" });

    const conflictResult = await checkConflict(dutyDate, monkIds, mcId);
    if (conflictResult.hasConflict) {
      return res.status(400).json({
        message: "พบข้อขัดแย้ง คิวงานซ้ำซ้อนในวันที่กำหนด",
        conflicts: conflictResult,
      });
    }

    const assignment = await DutyAssignment.findOneAndUpdate(
      { bookingId, dutyDate: new Date(dutyDate) },
      { templeId: booking.templeId, monkIds, mcId, status: "SCHEDULED" },
      { upsert: true, new: true }
    );

    return res.status(200).json({ success: true, data: assignment });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// 3. สลับคิวงาน (Swap)
exports.swapDuty = async (req, res) => {
  try {
    const { assignmentIdA, assignmentIdB } = req.body;

    const assignA = await DutyAssignment.findById(assignmentIdA);
    const assignB = await DutyAssignment.findById(assignmentIdB);

    if (!assignA || !assignB) {
      return res.status(404).json({ message: "ไม่พบข้อมูลรายการจัดคิวที่ต้องการสลับ" });
    }

    const conflictA = await checkConflict(assignA.dutyDate, assignB.monkIds, assignB.mcId, assignA._id);
    const conflictB = await checkConflict(assignB.dutyDate, assignA.monkIds, assignA.mcId, assignB._id);

    if (conflictA.hasConflict || conflictB.hasConflict) {
      return res.status(400).json({
        message: "ไม่สามารถสลับคิวได้ เนื่องจากบุคลากรติดคิวอื่นในวันดังกล่าว",
        conflictA,
        conflictB,
      });
    }

    const tempMonks = assignA.monkIds;
    const tempMc = assignA.mcId;

    assignA.monkIds = assignB.monkIds;
    assignA.mcId = assignB.mcId;

    assignB.monkIds = tempMonks;
    assignB.mcId = tempMc;

    await assignA.save();
    await assignB.save();

    return res.status(200).json({ success: true, message: "สลับคิวงานเรียบร้อยแล้ว", data: { assignA, assignB } });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// 4. ตรวจสอบสถานะงาน (Status)
exports.getBookingDutyStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "ไม่พบข้อมูลการจอง" });

    const assignments = await DutyAssignment.find({ bookingId })
      .populate("monkIds", "name phone")
      .populate("mcId", "name phone")
      .sort({ dutyDate: 1 });

    return res.status(200).json({
      bookingRef: booking.bookingRef,
      bookingStatus: booking.status,
      paymentStatus: booking.paymentStatus,
      totalNights: booking.nights,
      assignedNights: assignments.length,
      assignments,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};