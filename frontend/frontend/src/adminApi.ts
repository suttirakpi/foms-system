// ตัวช่วยเรียก API ฝั่งผู้ดูแลระบบ (/api/admin/...) และชนิดข้อมูลที่ backend ส่งมา
import { API_URL } from "./config";

export class ApiError extends Error {
  status: number;
  code?: string;
  data: Record<string, unknown>;
  constructor(message: string, status: number, data: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = typeof data.code === "string" ? data.code : undefined;
    this.data = data;
  }
}

export async function adminFetch<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${API_URL}/api/admin${path}`, {
    method: init.method || "GET",
    credentials: "include",
    headers:
      init.body !== undefined
        ? { "Content-Type": "application/json" }
        : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new ApiError(
      data.message || `เกิดข้อผิดพลาด (${res.status})`,
      res.status,
      data,
    );
  return data as T;
}

export const errMsg = (err: unknown, fallback = "เกิดข้อผิดพลาด") =>
  err instanceof Error ? err.message : fallback;

export type Role = "ADMIN" | "STAFF" | "OPS" | "HOST";
export const ROLES: Role[] = ["ADMIN", "STAFF", "OPS", "HOST"];
export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Super Admin",
  STAFF: "Temple Staff",
  OPS: "Operations Team",
  HOST: "Host",
};

export interface AdminUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: Role;
  isActive: boolean;
  templeId: string;
  templeName: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminHall {
  _id: string;
  name: string;
  capacity: number;
  pricePerNight: number;
  kind?: "HALL" | "CREMATORIUM";
  isActive?: boolean;
  code?: string;
  description?: string;
  equipment?: string;
  feeNote?: string;
}

export interface AdminTemple {
  _id: string;
  name: string;
  address?: string;
  province?: string;
  bankName?: string;
  bankAccount?: string;
  isActive?: boolean;
  halls: AdminHall[];
}

export interface AdminPackage {
  _id: string;
  name: string;
  level: "Economy" | "Standard" | "Premium";
  basePrice: number;
  snackPerHead: number;
  desc: string;
  features?: string[];
  recommended?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}

export interface AdminAddon {
  _id: string;
  name: string;
  price: number;
  categoryKey?: string;
  categoryName?: string;
  packageIds?: string[];
  isDefault?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}

export type PersonType = "MONK" | "DEACON" | "MC";
export const PERSON_LABEL: Record<PersonType, string> = {
  MONK: "พระสงฆ์",
  DEACON: "มัคนายก",
  MC: "พิธีกร",
};
export interface AdminPerson {
  _id: string;
  templeId: string;
  type: PersonType;
  name: string;
  title?: string;
  isActive: boolean;
}

export interface AuditRow {
  _id: string;
  actorName: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId: string;
  summary: string;
  createdAt: string;
}

// มูลค่างานจองรายเดือน (6 เดือนล่าสุด ไม่รวมงานที่ยกเลิก) — เดือนในรูป "YYYY-MM"
export interface MonthlyPoint {
  month: string;
  bookings: number;
  amount: number;
}

export interface Overview {
  users: { total: number; active: number; byRole: Record<string, number> };
  bookings: { total: number; byStatus: Record<string, number> };
  revenue: { approved: number; pendingSlips: number };
  temples: {
    total: number;
    active: number;
    halls: number;
    hallsActive: number;
  };
  recentBookings: {
    _id: string;
    bookingRef: string;
    hostName: string;
    deceasedName: string;
    templeName: string;
    hallName: string;
    status: string;
    startDate: string;
    nights: number;
    pricing: { grandTotal: number };
    createdAt: string;
  }[];
  recentAudit: AuditRow[];
  monthly?: MonthlyPoint[]; // backend รุ่นเก่าอาจไม่ส่งมา
}

export interface SystemInfo {
  appName: string;
  appVersion: string;
  nodeVersion: string;
  environment: string;
  uptimeSeconds: number;
  serverTime: string;
  database: { state: string; name: string };
  counts: { users: number; bookings: number; temples: number; audit: number };
}

export const baht = (n: number) => `฿${Math.round(n).toLocaleString("en-US")}`;

export const fmtDateTime = (iso?: string | null) =>
  iso
    ? new Intl.DateTimeFormat("th-TH", {
        timeZone: "Asia/Bangkok",
        day: "numeric",
        month: "short",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(iso)) + " น."
    : "—";

export const fmtDate = (iso?: string | null) =>
  iso
    ? new Intl.DateTimeFormat("th-TH", {
        timeZone: "UTC",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(iso))
    : "—";

export const BOOKING_STATUS_LABEL: Record<string, string> = {
  PENDING: "รออนุมัติ",
  CONFIRMED: "อนุมัติแล้ว",
  PAID: "ชำระแล้ว",
  IN_PROGRESS: "กำลังดำเนินพิธี",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
};

export const ACTION_LABEL: Record<string, string> = {
  CREATE: "เพิ่ม",
  UPDATE: "แก้ไข",
  ACTIVATE: "เปิดใช้งาน",
  DEACTIVATE: "ระงับ",
  RULES_UPDATE: "บันทึกกฎ",
  PASSWORD_CHANGE: "เปลี่ยนรหัสผ่าน",
};
export const ENTITY_LABEL: Record<string, string> = {
  USER: "ผู้ใช้",
  TEMPLE: "วัด",
  HALL: "ศาลา",
  PACKAGE: "แพ็กเกจ",
  ADDON: "ตัวเลือก",
  PERSON: "บุคลากร",
  RULES: "กฎวัด",
  SYSTEM: "ระบบ",
};
