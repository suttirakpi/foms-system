// controllers/inventoryController.js
// คลังอุปกรณ์ของวัด: ทุก query ผูกกับวัดที่เจ้าหน้าที่สังกัด (User.templeId)
const Inventory = require("../models/Inventory");

const STATUSES = ["IN_USE", "PARTIAL", "LOW", "READY"];
const bad = (res, message) => res.status(400).json({ message });

// ADMIN ที่ไม่มีวัดสังกัด ยังจัดการคลังไม่ได้ เพราะคลังต้องผูกกับวัดใดวัดหนึ่ง
function requireTemple(req, res) {
  if (!req.user.templeId) {
    bad(res, "บัญชีนี้ไม่ได้สังกัดวัด จึงจัดการคลังอุปกรณ์ไม่ได้");
    return null;
  }
  return req.user.templeId;
}

// ตรวจและทำความสะอาดข้อมูลจาก body คืน { error } หรือ { data }
function parseBody(body, { partial }) {
  const data = {};
  const text = (k) => {
    if (body[k] !== undefined) data[k] = String(body[k]).trim();
  };
  ["sku", "name", "desc", "category", "unit", "usingNote"].forEach(text);
  if (data.sku !== undefined) data.sku = data.sku.toUpperCase();

  for (const k of ["total", "ready"]) {
    if (body[k] === undefined) continue;
    const n = Number(body[k]);
    if (!Number.isInteger(n) || n < 0) return { error: `${k === "total" ? "จำนวนทั้งหมด" : "จำนวนพร้อมใช้"}ต้องเป็นจำนวนเต็มตั้งแต่ 0` };
    data[k] = n;
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return { error: "สถานะไม่ถูกต้อง" };
    data.status = body.status;
  }
  if (!partial) {
    if (!data.sku) return { error: "กรุณาระบุรหัสพัสดุ" };
    if (!data.name) return { error: "กรุณาระบุชื่อรายการ" };
    if (data.total === undefined || data.ready === undefined) return { error: "กรุณาระบุจำนวน" };
  } else if (data.sku === "" || data.name === "") {
    return { error: "รหัสพัสดุและชื่อรายการห้ามเว้นว่าง" };
  }
  if (data.total !== undefined && data.ready !== undefined && data.ready > data.total)
    return { error: "จำนวนพร้อมใช้ต้องไม่เกินจำนวนทั้งหมด" };
  return { data };
}

// GET /api/staff/inventory
exports.list = async (req, res, next) => {
  try {
    const templeId = requireTemple(req, res);
    if (!templeId) return;
    res.json(await Inventory.find({ templeId }).sort({ sku: 1 }).lean());
  } catch (err) {
    next(err);
  }
};

// POST /api/staff/inventory
exports.create = async (req, res, next) => {
  try {
    const templeId = requireTemple(req, res);
    if (!templeId) return;
    const { error, data } = parseBody(req.body || {}, { partial: false });
    if (error) return bad(res, error);
    try {
      res.status(201).json(await Inventory.create({ ...data, templeId }));
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ message: `รหัสพัสดุ ${data.sku} มีอยู่แล้ว` });
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

// PATCH /api/staff/inventory/:sku
exports.update = async (req, res, next) => {
  try {
    const templeId = requireTemple(req, res);
    if (!templeId) return;
    const { error, data } = parseBody(req.body || {}, { partial: true });
    if (error) return bad(res, error);
    const sku = String(req.params.sku).toUpperCase();
    const current = await Inventory.findOne({ templeId, sku });
    if (!current) return res.status(404).json({ message: "ไม่พบรายการพัสดุ" });
    // ตรวจ ready <= total กับค่าที่รวมกับของเดิมแล้ว (ส่งมาแค่ฟิลด์เดียวก็ตรวจได้)
    const total = data.total ?? current.total;
    const ready = data.ready ?? current.ready;
    if (ready > total) return bad(res, "จำนวนพร้อมใช้ต้องไม่เกินจำนวนทั้งหมด");
    Object.assign(current, data);
    try {
      await current.save();
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ message: `รหัสพัสดุ ${data.sku} มีอยู่แล้ว` });
      throw err;
    }
    res.json(current);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/staff/inventory/:sku
exports.remove = async (req, res, next) => {
  try {
    const templeId = requireTemple(req, res);
    if (!templeId) return;
    const deleted = await Inventory.findOneAndDelete({
      templeId,
      sku: String(req.params.sku).toUpperCase(),
    });
    if (!deleted) return res.status(404).json({ message: "ไม่พบรายการพัสดุ" });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
