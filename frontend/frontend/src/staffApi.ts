// ตัวช่วยเรียก API ฝั่งเจ้าหน้าที่วัด (/api/staff/...) ใช้ร่วมกันทั้ง 4 หน้า
import { API_URL } from "./config";

export async function staffFetch<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${API_URL}/api/staff${path}`, {
    method: init.method || "GET",
    credentials: "include",
    headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `เกิดข้อผิดพลาด (${res.status})`);
  return data as T;
}

// งานจองที่ backend ส่งมาให้หน้าอนุมัติ/ประวัติ (GET /api/staff/bookings)
export interface StaffBooking {
  id: string;
  bookingRef: string;
  status: "PENDING" | "CONFIRMED" | "PAID" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  paymentStatus: string;
  submittedAt: string; // ISO
  flag: "URGENT" | "NORMAL" | "OVER_CAPACITY";
  hostName: string;
  hostPhone: string;
  deceasedName: string;
  templeName: string;
  hallName: string;
  hallCapacity: number;
  packageName: string;
  addons: string[];
  startISO: string;
  cremationISO: string;
  nights: number;
  guests: number;
  grandTotal: number;
  rejectReason: string;
  cancelReason: string;
}

const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

// "2026-07-18" -> "18 ก.ค. 2569"
export function thaiDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${TH_MONTHS[m - 1]} ${y + 543}`;
}

// ช่วงวันสวด เช่น "13 – 17 ก.ค. 2569" (คืนแรก ถึง คืนสุดท้าย = วันฌาปนกิจ − 1)
export function thaiRange(startISO: string, cremationISO: string): string {
  const last = new Date(`${cremationISO}T00:00:00Z`);
  last.setUTCDate(last.getUTCDate() - 1);
  const endISO = last.toISOString().slice(0, 10);
  if (endISO <= startISO) return thaiDate(startISO);
  const [sy, sm, sd] = startISO.split("-").map(Number);
  const [ey, em, ed] = endISO.split("-").map(Number);
  if (sy === ey && sm === em) return `${sd} – ${ed} ${TH_MONTHS[em - 1]} ${ey + 543}`;
  return `${sd} ${TH_MONTHS[sm - 1]} – ${ed} ${TH_MONTHS[em - 1]} ${ey + 543}`;
}

// ISO timestamp -> "12 ก.ค. 09:15 น." (เวลาไทย)
export function thaiDateTime(iso: string): string {
  const parts = new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
  return `${parts} น.`;
}
