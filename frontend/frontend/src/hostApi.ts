// ตัวช่วยเรียก API ฝั่งเจ้าภาพ (ชำระเงิน กำหนดการ บัตรเชิญ)
import { API_URL } from "./config";

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function hostFetch<T>(
  path: string,
  init: { method?: string; body?: unknown; form?: FormData; auth?: boolean } = {},
): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    method: init.method || "GET",
    credentials: init.auth === false ? "omit" : "include",
    headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init.form ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.message || `เกิดข้อผิดพลาด (${res.status})`, res.status, data.code);
  return data as T;
}

export const errMsg = (err: unknown, fallback = "เกิดข้อผิดพลาด") => (err instanceof Error ? err.message : fallback);

export type PayStatus = "UNPAID" | "PENDING" | "APPROVED" | "REJECTED";
export interface PaymentRow {
  _id: string;
  plan: "FULL" | "INSTALLMENT";
  installmentNo: number;
  label: string;
  amountDue: number;
  status: PayStatus;
  paidAmount?: number;
  rejectReason?: string;
  slip?: { originalName?: string };
}
export interface PaymentList {
  total: number;
  paymentStatus: "UNPAID" | "SLIP_UPLOADED" | "PARTIAL" | "PAID";
  bank: { bankName?: string; bankAccount?: string } | null;
  payments: PaymentRow[];
}

export interface HostScheduleItem {
  _id: string;
  date: string;
  time?: string;
  type: "BATHING" | "CHANT" | "CREMATION" | "MERIT" | string;
  title: string;
  persons: { name: string; role: string }[];
}
export interface HostSchedule {
  items: HostScheduleItem[];
}

export interface PublicInvite {
  deceasedName: string;
  hostName: string;
  templeName: string;
  hallName: string;
  startISO: string;
  cremationISO: string;
  nights: number;
  schedule: { date: string; time: string; type: string; title: string }[];
}

export const baht = (n: number) => `฿${Math.round(n).toLocaleString("en-US")}`;
const TH_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
export const thLongDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${TH_MONTHS[m - 1]} พ.ศ. ${y + 543}`;
};
export const ROLE_LABEL: Record<string, string> = { CHIEF: "พระประธาน", CHANT: "พระสวด", MC: "มัคนายก/พิธีกร" };
