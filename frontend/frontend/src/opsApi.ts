// ตัวช่วยเรียก API ฝั่งทีมจัดงาน (/api/ops/...) และ API กำหนดการเดิม (/api/bookings/:id/schedule)
import { API_URL } from "./config";

export class ApiError extends Error {
  status: number;
  code?: string;
  count?: number;
  constructor(message: string, status: number, data: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = typeof data.code === "string" ? data.code : undefined;
    this.count = typeof data.count === "number" ? data.count : undefined;
  }
}

export async function opsFetch<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    method: init.method || "GET",
    credentials: "include",
    headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.message || `เกิดข้อผิดพลาด (${res.status})`, res.status, data);
  return data as T;
}

export const errMsg = (err: unknown, fallback = "เกิดข้อผิดพลาด") => (err instanceof Error ? err.message : fallback);

export interface OpsJob {
  id: string;
  bookingRef: string;
  status: "CONFIRMED" | "PAID" | "IN_PROGRESS" | "COMPLETED" | string;
  deceasedName: string;
  hostName: string;
  templeName: string;
  hallName: string;
  startISO: string;
  cremationISO: string;
  nights: number;
  guests: number;
  packageName: string;
  tonight: number | "cremation" | null;
}

export type StepStatus = "wait" | "active" | "done";
export interface OpsStep {
  id: string;
  n: number;
  time: string;
  range: string;
  title: string;
  desc: string;
  status: StepStatus;
  doneByName: string;
  doneAt?: string;
}

export type VendorStatus = "SHIPPING" | "ARRIVED" | "RECEIVED";
export interface OpsVendor {
  id: string;
  category: string;
  title: string;
  partner: string;
  expectedTime: string;
  detail: string;
  status: VendorStatus;
  receivedByName: string;
  receivedAt?: string;
  ref: string;
  note: string;
}

export interface OpsBoard {
  job: OpsJob;
  date: string;
  dateKind: "CHANT" | "CREMATION";
  nights: string[];
  live: boolean;
  steps: OpsStep[];
  vendors: OpsVendor[];
  scheduleItems: { id: string; time: string; type: string; title: string }[];
}

export interface OpsSummary {
  job: OpsJob;
  nights: { date: string; kind: "CHANT" | "CREMATION"; stepsTotal: number; stepsDone: number }[];
  steps: { total: number; done: number };
  vendors: { total: number; received: number };
  assignments: number;
  canStart: boolean;
  canComplete: boolean;
}

export interface OpsPerson {
  id: string;
  name: string;
  type: "MONK" | "DEACON" | "MC";
  title: string;
}
export interface OpsAssignment {
  id: string;
  date: string;
  role: "CHIEF" | "MC" | "CHANT";
  personId: string;
  name: string;
}
export interface ScheduleList {
  bookingId: string;
  items: { _id: string; date: string; time?: string; type: string; title: string; persons: { name: string; role: string }[] }[];
}

export const pad = (n: number) => String(n).padStart(2, "0");

const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
export const thDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${TH_MONTHS[m - 1]} ${y + 543}`;
};
export const hhmm = (iso?: string) =>
  iso
    ? new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso)) + " น."
    : "";

export const ROLE_LABEL: Record<string, string> = { CHIEF: "พระประธาน", CHANT: "พระสวด", MC: "มัคนายก/พิธีกร" };
export const TYPE_LABEL: Record<string, string> = { BATHING: "พิธีสรงน้ำศพ", CHANT: "สวดพระอภิธรรม", CREMATION: "ฌาปนกิจ", MERIT: "ทำบุญอุทิศ" };
export const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "อนุมัติแล้ว รอเริ่มพิธี",
  PAID: "ชำระแล้ว รอเริ่มพิธี",
  IN_PROGRESS: "กำลังดำเนินพิธี",
  COMPLETED: "ปิดงานแล้ว",
};
