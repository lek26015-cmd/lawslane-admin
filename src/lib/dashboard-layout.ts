/**
 * โครงเลย์เอาต์แดชบอร์ดแบบเบนโตะ — ใช้ร่วมกันทั้งฝั่ง server (validate/บันทึก) และ client (ลากจัด)
 * ห้าม import 'server-only' ที่นี่ เพราะ DashboardBento (client) ต้องใช้ registry ชุดเดียวกัน
 */

/** s = 1 ช่อง · m = กว้าง 2 ช่อง · l = 2×2 · w = เต็มแถว */
export type WidgetSize = 's' | 'm' | 'l' | 'w';

export const WIDGET_SIZE_LABEL: Record<WidgetSize, string> = {
  s: 'เล็ก',
  m: 'กว้าง',
  l: 'ใหญ่',
  w: 'เต็มแถว',
};

export interface WidgetDef {
  id: string;
  label: string;
  defaultSize: WidgetSize;
  allowedSizes: WidgetSize[];
  /** แสดงเฉพาะ super admin (เช่นการ์ดรายได้) */
  superOnly?: boolean;
}

const STAT_SIZES: WidgetSize[] = ['s', 'm'];
const LIST_SIZES: WidgetSize[] = ['m', 'l', 'w'];

/** ลำดับในนี้ = ลำดับเริ่มต้นของแอดมินที่ยังไม่เคยปรับ — widget ใหม่ที่เพิ่มทีหลังจะต่อท้ายให้เอง */
export const WIDGET_REGISTRY: WidgetDef[] = [
  { id: 'revenue', label: 'รายได้รวม', defaultSize: 's', allowedSizes: STAT_SIZES, superOnly: true },
  { id: 'users', label: 'ผู้ใช้งานทั้งหมด', defaultSize: 's', allowedSizes: STAT_SIZES },
  { id: 'tickets', label: 'Ticket ที่เปิดอยู่', defaultSize: 's', allowedSizes: STAT_SIZES },
  { id: 'pendingLawyers', label: 'ทนายรออนุมัติ', defaultSize: 's', allowedSizes: STAT_SIZES },
  { id: 'approvedLawyers', label: 'ทนายที่ Active', defaultSize: 's', allowedSizes: STAT_SIZES },
  { id: 'requests', label: 'คำขอที่รอดำเนินการ', defaultSize: 's', allowedSizes: STAT_SIZES },
  { id: 'capdealContracts', label: 'สัญญา CapDeal', defaultSize: 's', allowedSizes: STAT_SIZES },
  { id: 'capdealSlips', label: 'สลิป CapDeal รอตรวจ', defaultSize: 's', allowedSizes: STAT_SIZES },
  { id: 'pendingLawyersTable', label: 'ทนายความรอการอนุมัติ (ตาราง)', defaultSize: 'l', allowedSizes: LIST_SIZES },
  { id: 'recentTickets', label: 'Ticket ช่วยเหลือล่าสุด', defaultSize: 'l', allowedSizes: LIST_SIZES },
];

export interface DashboardLayout {
  /** ลำดับของ widget ทั้งหมดที่แสดง (รวมที่ซ่อน — ซ่อนดูจาก hidden) */
  order: string[];
  sizes: Record<string, WidgetSize>;
  hidden: string[];
}

const SIZES: WidgetSize[] = ['s', 'm', 'l', 'w'];

export function defaultLayout(isSuperAdmin: boolean): DashboardLayout {
  const defs = WIDGET_REGISTRY.filter((w) => isSuperAdmin || !w.superOnly);
  return {
    order: defs.map((w) => w.id),
    sizes: Object.fromEntries(defs.map((w) => [w.id, w.defaultSize])),
    hidden: [],
  };
}

/**
 * รับค่าอะไรก็ได้ (จาก Firestore หรือจาก client) แล้วคืนเลย์เอาต์ที่ปลอดภัยเสมอ:
 * ทิ้ง id ที่ไม่รู้จัก/ซ้ำ, ขนาดที่ widget นั้นไม่รองรับ, และ widget superOnly ของคนที่ไม่ใช่ super admin
 * widget ที่ขาดไป (เช่นเพิ่งเพิ่มใหม่) จะถูกต่อท้ายด้วยขนาดเริ่มต้น
 */
export function normalizeLayout(raw: unknown, isSuperAdmin: boolean): DashboardLayout {
  const base = defaultLayout(isSuperAdmin);
  if (!raw || typeof raw !== 'object') return base;
  const input = raw as Partial<Record<keyof DashboardLayout, unknown>>;

  const allowed = new Map(
    WIDGET_REGISTRY.filter((w) => isSuperAdmin || !w.superOnly).map((w) => [w.id, w] as const),
  );

  const seen = new Set<string>();
  const order: string[] = [];
  if (Array.isArray(input.order)) {
    for (const id of input.order) {
      if (typeof id === 'string' && allowed.has(id) && !seen.has(id)) {
        seen.add(id);
        order.push(id);
      }
    }
  }
  for (const id of base.order) if (!seen.has(id)) order.push(id);

  const rawSizes = input.sizes && typeof input.sizes === 'object' ? (input.sizes as Record<string, unknown>) : {};
  const sizes: Record<string, WidgetSize> = {};
  for (const id of order) {
    const def = allowed.get(id)!;
    const s = rawSizes[id];
    sizes[id] =
      typeof s === 'string' && SIZES.includes(s as WidgetSize) && def.allowedSizes.includes(s as WidgetSize)
        ? (s as WidgetSize)
        : def.defaultSize;
  }

  const hidden = Array.isArray(input.hidden)
    ? Array.from(new Set(input.hidden.filter((id): id is string => typeof id === 'string' && allowed.has(id))))
    : [];

  return { order, sizes, hidden };
}
