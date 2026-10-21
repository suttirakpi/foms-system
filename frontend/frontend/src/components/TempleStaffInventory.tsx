import React, { useMemo, useState } from "react";
import { StaffNav } from "./StaffNav";
import { AuthUser } from "../App";
import "./TempleStaffInventory.css";

interface TempleStaffInventoryProps {
  currentUser?: AuthUser | null;
  onNavigateHome?: () => void;
  onNavigateApprovals?: () => void;
  onNavigateCalendar?: () => void;
  onNavigateHistory?: () => void;
  onLogout?: () => void;
}

type StockStatus = "IN_USE" | "PARTIAL" | "LOW" | "READY";

interface InventoryItem {
  sku: string;
  name: string;
  desc: string;
  category: string;
  unit: string;
  total: number;
  ready: number;
  usingNote: string;
  status: StockStatus;
}

const STATUS_LABEL: Record<StockStatus, string> = {
  IN_USE: "กำลังใช้งาน",
  PARTIAL: "พร้อมใช้บางส่วน",
  LOW: "สต็อกต่ำ (Low Stock)",
  READY: "พร้อมใช้งาน",
};

const CATEGORY_CHIPS = [
  { label: "เครื่องไทยธรรมและสังฆทาน", count: 8 },
  { label: "เก้าอี้และโต๊ะรับรอง", count: 6 },
  { label: "อุปกรณ์ประกอบพิธีสงฆ์", count: 12 },
  { label: "ของใช้สิ้นเปลืองในพิธี", count: 7 },
  { label: "เครื่องเสียงและไฟส่องสว่าง", count: 5 },
];

const ALL_CATEGORIES = [
  ...CATEGORY_CHIPS.map((c) => c.label),
  "อุปกรณ์รักษาและประกอบพิธี",
];

const PAGE_SIZE = 8;
const TOTAL_ITEMS = 38;
const TOTAL_PAGES = 3;

// ข้อมูลตัวอย่างสำหรับขึ้นหน้าจอ รอเชื่อม API คลังอุปกรณ์
const INITIAL_ITEMS: InventoryItem[] = [
  {
    sku: "SKU-CER-001",
    name: "ชุดโต๊ะหมู่บูชาไม้สักทอง",
    desc: "หมู่ 9 ปิดทองคำเปลวแท้โบราณ ลวดลายปิดทองกระจังตาอ้อย",
    category: "อุปกรณ์ประกอบพิธีสงฆ์",
    unit: "ชุด",
    total: 4,
    ready: 1,
    usingNote: "ศาลา 1, 2, 3",
    status: "IN_USE",
  },
  {
    sku: "SKU-CHR-014",
    name: "เก้าอี้หลุยส์ไม้สักบุเบาะผ้าไหมสีงาช้าง (VIP)",
    desc: "โครงไม้สักสลักลวดลายไทย ประจำพื้นที่ประธานและแขกผู้มีเกียรติ",
    category: "เก้าอี้และโต๊ะรับรอง",
    unit: "ตัว",
    total: 200,
    ready: 50,
    usingNote: "ศาลาใหญ่ 3",
    status: "PARTIAL",
  },
  {
    sku: "SKU-SAN-005",
    name: "ชุดเครื่องไทยธรรมและผ้าไตรครองพรีเมียม",
    desc: "กล่องผ้าไหมแท้ บรรจุผ้าไตรมัสลินเกรดประณีตพร้อมย่ามและตาลปัตร",
    category: "เครื่องไทยธรรมและสังฆทาน",
    unit: "ชุด",
    total: 30,
    ready: 6,
    usingNote: "เบิกสวดพระอภิธรรม",
    status: "LOW",
  },
  {
    sku: "SKU-CHR-002",
    name: "เก้าอี้พนักพิงสีขาวมาตรฐาน",
    desc: "โครงเหล็กหนาพร้อมปลอกคลุมผ้าโทเรสีขาวสุภาพ รีดเรียบฆ่าเชื้อ",
    category: "เก้าอี้และโต๊ะรับรอง",
    unit: "ตัว",
    total: 1200,
    ready: 650,
    usingNote: "ศาลา 1 และลานพิธี",
    status: "READY",
  },
  {
    sku: "SKU-FLW-009",
    name: "ดอกไม้จันทน์เกรดประณีต (ไม้โมกธรรมชาติ)",
    desc: "งานประดิษฐ์กลีบผกาซ้อน ไม้โมกแห้งสนิท ไร้เขม่าควันดำ",
    category: "ของใช้สิ้นเปลืองในพิธี",
    unit: "ดอก",
    total: 2500,
    ready: 450,
    usingNote: "ส่งมอบเมรุหลวง",
    status: "LOW",
  },
  {
    sku: "SKU-MIC-003",
    name: "ชุดไมโครโฟนไร้สายและแท่นเทศน์พระธรรมกถึก",
    desc: "ย่านความถี่ UHF พร้อมระบบตัดสัญญาณสะท้อนเสียงสวดพระพุทธมนต์",
    category: "เครื่องเสียงและไฟส่องสว่าง",
    unit: "ชุด",
    total: 6,
    ready: 2,
    usingNote: "ศาลา 1–3, เมรุ",
    status: "IN_USE",
  },
  {
    sku: "SKU-URN-007",
    name: "พานทองเหลืองขัดเงาและผ้าคลุมลูกไม้สีงาช้าง",
    desc: "พานขนาดเส้นผ่านศูนย์กลาง 14 นิ้ว สำหรับทอดผ้าบังสุกุลและวางเครื่องไทยธรรม",
    category: "อุปกรณ์ประกอบพิธีสงฆ์",
    unit: "ชุด",
    total: 25,
    ready: 15,
    usingNote: "ศาลา 2 และ 3",
    status: "READY",
  },
  {
    sku: "SKU-COL-002",
    name: "ตู้หีบเย็นรักษาสภาพ (ดิจิทัลเทมป์ คอนโทรล)",
    desc: "ระบบควบคุมความเย็นมาตรฐานโรงพยาบาล พร้อมแผงตกแต่งลายกระจกทอง",
    category: "อุปกรณ์รักษาและประกอบพิธี",
    unit: "หลัง",
    total: 5,
    ready: 1,
    usingNote: "ศาลา 1, 2, 3 และห้องพักศพ",
    status: "IN_USE",
  },
];

const EMPTY_FORM: InventoryItem = {
  sku: "",
  name: "",
  desc: "",
  category: ALL_CATEGORIES[0],
  unit: "ชุด",
  total: 0,
  ready: 0,
  usingNote: "",
  status: "READY",
};

const num = (n: number) => n.toLocaleString("en-US");

export const TempleStaffInventory: React.FC<TempleStaffInventoryProps> = ({
  currentUser,
  onNavigateHome,
  onNavigateApprovals,
  onNavigateCalendar,
  onNavigateHistory,
  onLogout,
}) => {
  const [items, setItems] = useState<InventoryItem[]>(INITIAL_ITEMS);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<InventoryItem | null>(null);
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 3500);
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (category !== "ALL" && i.category !== category) return false;
      if (status !== "ALL" && i.status !== status) return false;
      if (!q) return true;
      return [i.sku, i.name, i.usingNote].some((v) =>
        v.toLowerCase().includes(q),
      );
    });
  }, [items, search, category, status]);

  const filtering = search.trim() !== "" || category !== "ALL" || status !== "ALL";
  // หน้า 1 มีข้อมูลตัวอย่างจริง หน้าอื่นรอข้อมูลจาก API
  const shown = filtering || page === 1 ? visible : [];

  const openAdd = () => {
    setEditingSku(null);
    setForm({ ...EMPTY_FORM });
  };
  const openEdit = (item: InventoryItem) => {
    setEditingSku(item.sku);
    setForm({ ...item });
  };

  const saveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const clean: InventoryItem = {
      ...form,
      sku: form.sku.trim().toUpperCase(),
      name: form.name.trim(),
      ready: Math.min(form.ready, form.total),
    };
    if (!clean.sku || !clean.name) return;
    if (editingSku === null && items.some((i) => i.sku === clean.sku)) {
      flash(`รหัสพัสดุ ${clean.sku} มีอยู่แล้ว`);
      return;
    }
    setItems((prev) =>
      editingSku === null
        ? [...prev, clean]
        : prev.map((i) => (i.sku === editingSku ? clean : i)),
    );
    setForm(null);
    flash(
      editingSku === null
        ? "เพิ่มรายการอุปกรณ์แล้ว (ข้อมูลจำลอง ยังไม่บันทึกลงระบบ)"
        : "แก้ไขรายการแล้ว (ข้อมูลจำลอง ยังไม่บันทึกลงระบบ)",
    );
  };

  const exportCsv = () => {
    const head = ["SKU", "รายการ", "หมวดหมู่", "ทั้งหมด", "พร้อมใช้", "ใช้งานอยู่", "สถานะ"];
    const rows = visible.map((i) => [
      i.sku,
      i.name,
      i.category,
      i.total,
      i.ready,
      i.total - i.ready,
      STATUS_LABEL[i.status],
    ]);
    const csv = [head, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="inv-wrapper">
      <StaffNav
        active="inventory"
        userName={currentUser?.name}
        onNavigateHome={onNavigateHome}
        onNavigateApprovals={onNavigateApprovals}
        onNavigateCalendar={onNavigateCalendar}
        onNavigateHistory={onNavigateHistory}
        onLogout={onLogout}
      />

      <div className="inv-container">
        <div className="inv-breadcrumb">
          <span className="inv-link" onClick={onNavigateHome}>
            หน้าหลัก
          </span>
          {" / "}
          <span>เจ้าหน้าที่วัด</span>
          {" / "}
          <strong>คลังอุปกรณ์พิธีการ</strong>
        </div>
        <span className="inv-pretitle">
          TEMPLE OPERATIONS & CEREMONIAL INVENTORY · วัดศรีสุคต พระอารามหลวง
        </span>

        <div className="inv-title-row">
          <div>
            <h1 className="inv-title">
              บริหารคลังอุปกรณ์พิธีการ <small>(Inventory Management)</small>
            </h1>
            <p className="inv-subtitle">
              ระบบควบคุม ตรวจสอบสถานะคงคลัง และบันทึกการเบิก-ส่งคืนศาสนภัณฑ์สำหรับพิธีบำเพ็ญกุศลและฌาปนกิจ
              บัญชีการเบิกจ่ายกำกับศาลา 1–3 และเมรุหลวง
            </p>
          </div>
          <div className="inv-actions">
            <button className="inv-btn" type="button" onClick={exportCsv}>
              ⤓ ส่งออกรายงานคลัง (Export CSV)
            </button>
            <button className="inv-btn dark" type="button" onClick={openAdd}>
              + เพิ่มรายการอุปกรณ์ (Add Item)
            </button>
          </div>
        </div>

        <section className="inv-stats">
          <div className="inv-stat">
            <div className="inv-stat-top">
              <span>หมวดบัญชีพัสดุ 01</span>
              <b>01</b>
            </div>
            <h3>จำนวนรายการอุปกรณ์ทั้งหมด</h3>
            <div className="inv-stat-value">
              38 <small>หมวดรายการ</small>
            </div>
            <p>รวมทั้งสิ้น 3,420 ชิ้น/ชุด ในคลังศาสนสมบัติส่วนกลาง</p>
            <div className="inv-stat-foot">
              <span>อัตราพร้อมให้บริการ</span>
              <em>พร้อมใช้งาน 94.2%</em>
            </div>
          </div>
          <div className="inv-stat">
            <div className="inv-stat-top">
              <span>ประจำการพิธีกรรม 02</span>
              <b>02</b>
            </div>
            <h3>กำลังใช้งานในพิธีการ</h3>
            <div className="inv-stat-value">
              12 <small>รายการหลัก</small>
            </div>
            <p>จัดสรรให้ ศาลา 1, ศาลา 2, ศาลา 3 และเมรุหลวง ประจำคืนนี้</p>
            <div className="inv-stat-foot">
              <span>กำหนดการส่งมอบกลับ</span>
              <em>รอบส่งคืนถัดไป: 21:30 น.</em>
            </div>
          </div>
          <div className="inv-stat danger">
            <div className="inv-stat-top">
              <span>เกณฑ์เตือนสำรอง 03</span>
              <b>03</b>
            </div>
            <h3>แจ้งเตือนสต็อกใกล้หมด</h3>
            <div className="inv-stat-value">
              3 <small>รายการขาดแคลน</small>
            </div>
            <p>ดอกไม้จันทน์ (450 ดอก), ผ้าบังสุกุลพรีเมียม (8 ชุด), น้ำอบไทย (12 ขวด)</p>
            <div className="inv-stat-foot">
              <span>ต้องจัดซื้อ / สั่งผลิตเพิ่ม</span>
              <em className="urgent">ด่วนพิเศษ</em>
            </div>
          </div>
        </section>

        <section className="inv-toolbar">
          <div className="inv-search-row">
            <input
              className="inv-search"
              type="search"
              placeholder="ค้นหารหัสพัสดุ, ชื่ออุปกรณ์, หรือสถานที่ใช้งาน..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <select
              className="inv-select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">สถานะทั้งหมด (ทุกสภาวะ)</option>
              <option value="READY">พร้อมใช้งาน</option>
              <option value="IN_USE">กำลังใช้งาน</option>
              <option value="PARTIAL">พร้อมใช้บางส่วน</option>
              <option value="LOW">สต็อกต่ำ (Low Stock)</option>
            </select>
            <button
              className="inv-btn"
              type="button"
              onClick={() =>
                flash("เปิดแบบฟอร์มตรวจนับสต็อกประจำวัน (ข้อมูลจำลอง ยังไม่เชื่อมระบบ)")
              }
            >
              ☑ ตรวจนับสต็อกประจำวัน (Daily Stock Audit)
            </button>
          </div>
          <div className="inv-chips">
            <button
              type="button"
              className={`inv-chip ${category === "ALL" ? "active" : ""}`}
              onClick={() => {
                setCategory("ALL");
                setPage(1);
              }}
            >
              ทั้งหมด ({TOTAL_ITEMS})
            </button>
            {CATEGORY_CHIPS.map((c) => (
              <button
                key={c.label}
                type="button"
                className={`inv-chip ${category === c.label ? "active" : ""}`}
                onClick={() => {
                  setCategory(c.label);
                  setPage(1);
                }}
              >
                {c.label} ({c.count})
              </button>
            ))}
          </div>
        </section>

        <section className="inv-table-card">
          <div className="inv-table-scroll">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>
                    รหัสพัสดุ
                    <br />
                    (SKU)
                  </th>
                  <th>รายการอุปกรณ์ / รายละเอียดจำเพาะ:</th>
                  <th>หมวดหมู่</th>
                  <th className="r">ทั้งหมด</th>
                  <th className="r">พร้อมใช้</th>
                  <th className="r">ใช้งานอยู่</th>
                  <th className="c">สถานะ:</th>
                  <th className="r">การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((i) => {
                  const low = i.status === "LOW";
                  return (
                    <tr key={i.sku}>
                      <td className={`inv-sku ${low ? "red" : ""}`}>{i.sku}</td>
                      <td>
                        <div className="inv-name">{i.name}</div>
                        <div className="inv-desc">{i.desc}</div>
                      </td>
                      <td className="inv-cat">{i.category}</td>
                      <td className="r inv-strong">
                        {num(i.total)} {i.unit}
                      </td>
                      <td className={`r inv-strong ${low ? "red" : ""}`}>
                        {num(i.ready)} {i.unit}
                      </td>
                      <td className="r inv-using">
                        <b>
                          {num(i.total - i.ready)} {i.unit}
                        </b>
                        <span>({i.usingNote})</span>
                      </td>
                      <td className="c">
                        <span className={`inv-badge ${i.status.toLowerCase()}`}>
                          {STATUS_LABEL[i.status]}
                        </span>
                      </td>
                      <td className="r inv-links">
                        <button type="button" onClick={() => openEdit(i)}>
                          แก้ไข
                        </button>
                        {low ? (
                          <button
                            type="button"
                            className="red"
                            onClick={() =>
                              flash(`ส่งคำขอสั่งเพิ่ม ${i.name} แล้ว (ข้อมูลจำลอง)`)
                            }
                          >
                            สั่งเพิ่ม
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              flash(`ประวัติการเบิก ${i.sku} ยังไม่เชื่อมระบบ`)
                            }
                          >
                            ประวัติเบิก
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={8} className="inv-empty">
                      {filtering
                        ? "ไม่พบรายการที่ตรงกับเงื่อนไข"
                        : "หน้านี้ยังไม่มีข้อมูล (ข้อมูลตัวอย่างมีเฉพาะหน้า 1)"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="inv-pager">
            <span>
              {filtering ? (
                <>
                  พบ <b>{visible.length}</b> รายการ
                </>
              ) : (
                <>
                  แสดงรายการที่ <b>{(page - 1) * PAGE_SIZE + 1}</b> ถึง{" "}
                  <b>{Math.min(page * PAGE_SIZE, TOTAL_ITEMS)}</b> จากทั้งหมด{" "}
                  <b>{TOTAL_ITEMS}</b> รายการ
                </>
              )}
            </span>
            <div className="inv-pages">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                ก่อนหน้า
              </button>
              {Array.from({ length: TOTAL_PAGES }, (_, k) => k + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={p === page ? "active" : ""}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                disabled={page === TOTAL_PAGES}
                onClick={() => setPage(page + 1)}
              >
                ถัดไป
              </button>
            </div>
          </div>
        </section>

        <section className="inv-rules">
          <span className="inv-rules-icon">⛨</span>
          <div>
            <strong>ระเบียบคลังและการจัดซื้อจัดจ้างศาสนสมบัติ วัดศรีสุคต พระอารามหลวง</strong>
            <p>
              การเบิกใช้อุปกรณ์ประกอบพิธีสงฆ์ทุกชนิด
              ต้องผ่านการลงนามอนุมัติโดยพิธีกรหรือมัคนายกประจำศาลา
              และบันทึกหมายเลขอ้างอิงงานจอง (Booking Ref ID)
              ทุกครั้งเพื่อความโปร่งใสและตรวจสอบได้ในระบบ Audit Ledger
              กรณีอุปกรณ์ชำรุดหรือสูญหาย ต้องทำบันทึกรายงานต่อกองงานศาสนสมบัติภายใน 24 ชั่วโมง
            </p>
          </div>
        </section>
      </div>

      <footer className="inv-footer">
        <div className="inv-footer-inner">
          <div>
            <strong>FOMS · Funeral Operations Management System</strong>
            <p>
              กองงานศาสนสมบัติและบริหารคลังศาสนภัณฑ์ วัดศรีสุคต พระอารามหลวง ·
              Liturgical Supply Office
            </p>
          </div>
          <div className="inv-footer-right">
            <span>
              เอกสารกำกับทางราชการสำหรับเจ้าหน้าที่สงฆ์และฝ่ายธุรการ
              เพื่อการบริหารจัดการภายใน
            </span>
            <em>© 2025 FOMS Temple Operations Network. สงวนลิขสิทธิ์ตามระเบียบมหาเถรสมาคม.</em>
          </div>
        </div>
      </footer>

      {form && (
        <div className="inv-modal-bg" onMouseDown={() => setForm(null)}>
          <form
            className="inv-modal"
            onMouseDown={(e) => e.stopPropagation()}
            onSubmit={saveForm}
          >
            <h2>{editingSku === null ? "เพิ่มรายการอุปกรณ์" : "แก้ไขรายการอุปกรณ์"}</h2>
            <label>
              รหัสพัสดุ (SKU)
              <input
                value={form.sku}
                disabled={editingSku !== null}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                required
              />
            </label>
            <label>
              ชื่ออุปกรณ์
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label>
              รายละเอียดจำเพาะ
              <input
                value={form.desc}
                onChange={(e) => setForm({ ...form, desc: e.target.value })}
              />
            </label>
            <label>
              หมวดหมู่
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {ALL_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <div className="inv-modal-grid">
              <label>
                หน่วย
                <input
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                />
              </label>
              <label>
                ทั้งหมด
                <input
                  type="number"
                  min={0}
                  value={form.total}
                  onChange={(e) =>
                    setForm({ ...form, total: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                พร้อมใช้
                <input
                  type="number"
                  min={0}
                  max={form.total}
                  value={form.ready}
                  onChange={(e) =>
                    setForm({ ...form, ready: Number(e.target.value) })
                  }
                />
              </label>
            </div>
            <label>
              ใช้งานอยู่ที่ (สถานที่)
              <input
                value={form.usingNote}
                onChange={(e) => setForm({ ...form, usingNote: e.target.value })}
              />
            </label>
            <label>
              สถานะ
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as StockStatus })
                }
              >
                {(Object.keys(STATUS_LABEL) as StockStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
            <div className="inv-modal-foot">
              <button type="button" className="inv-btn" onClick={() => setForm(null)}>
                ยกเลิก
              </button>
              <button type="submit" className="inv-btn dark">
                บันทึก
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && <div className="inv-toast">{toast}</div>}
    </div>
  );
};
