import React from 'react';
import {
    ArrowLeftCircle,
    BrainCircuit,
    Briefcase,
    Building2,
    ClipboardList,
    Database,
    FileEdit,
    FileSignature,
    FileText,
    Landmark,
    LayoutTemplate,
    Mail,
    Megaphone,
    MessageSquare,
    Package,
    Percent,
    Scale,
    ShieldCheck,
    ShoppingBag,
    Ticket,
    UserCheck,
    Users2,
} from 'lucide-react';

export type NavItem = {
    href: string;
    icon: React.ReactNode;
    label: string;
    /** ถ้าตั้งไว้ จะแสดงเมื่อผู้ใช้มีสิทธิ์นี้เท่านั้น (ดู hasPermission ใน admin-client-layout) */
    permission?: string;
    /** ลิงก์ภายนอกที่แสดงเป็นไอคอนเล็กข้างรายการ */
    externalLink?: string;
};

export type NavSection = {
    title: string;
    items: NavItem[];
};

/**
 * เมนูหลังบ้านทั้งหมด — แหล่งความจริงเดียว
 *
 * ทั้ง sidebar (desktop) และ Sheet (mobile) ใน admin-client-layout.tsx map จาก array นี้
 * เพิ่มเมนูใหม่ที่นี่ที่เดียว ไม่ต้องแก้สองที่
 */
export const navSections: NavSection[] = [
    {
        title: "จัดการผู้ใช้งาน",
        items: [
            { href: "/customers", icon: <Users2 className="h-4 w-4" />, label: "ลูกค้า" },
            { href: "/lawyers", icon: <UserCheck className="h-4 w-4" />, label: "ทนายความ" },
            { href: "/lawyer-registry", icon: <Database className="h-4 w-4" />, label: "ฐานข้อมูลทนาย" },
        ]
    },
    {
        title: "ห้องสนทนา",
        items: [
            { href: "/chats", icon: <MessageSquare className="h-4 w-4" />, label: "แชททั้งหมด" },
        ]
    },
    {
        title: "คำขอใช้บริการ",
        items: [
            { href: "/contract-requests", icon: <FileSignature className="h-4 w-4" />, label: "คำขอร่างสัญญา" },
            { href: "/registration-requests", icon: <Building2 className="h-4 w-4" />, label: "คำขอจดทะเบียน" },
            { href: "/sme-requests", icon: <Briefcase className="h-4 w-4" />, label: "คำขอ SME" },
        ]
    },
    {
        title: "แบบสำรวจ",
        items: [
            { href: "/surveys", icon: <ClipboardList className="h-4 w-4" />, label: "แบบสำรวจ SME", externalLink: "https://lawslane.com/th/survey" },
            { href: "/survey-lawyer", icon: <Scale className="h-4 w-4" />, label: "แบบสอบถาม (ทนาย)", externalLink: "https://lawslane.com/th/survey-lawyer" },
            { href: "/survey-public", icon: <Users2 className="h-4 w-4" />, label: "แบบสอบถาม (บุคคลทั่วไป)", externalLink: "https://lawslane.com/th/survey-public" },
        ]
    },
    {
        title: "เนื้อหาและการตลาด",
        items: [
            { href: "/landing-pages", icon: <LayoutTemplate className="h-4 w-4" />, label: "Landing Pages" },
            { href: "/ads", icon: <Megaphone className="h-4 w-4" />, label: "จัดการโฆษณา" },
            { href: "/content", icon: <FileEdit className="h-4 w-4" />, label: "จัดการเนื้อหา" },
            { href: "/forms", icon: <FileText className="h-4 w-4" />, label: "แบบฟอร์มกฎหมาย" },
            { href: "/legal", icon: <Scale className="h-4 w-4" />, label: "เอกสารทางกฎหมาย" },
            { href: "/knowledge", icon: <BrainCircuit className="h-4 w-4" />, label: "คลังความรู้ AI" },
        ]
    },
    {
        title: "การเงิน",
        items: [
            { href: "/financials?tab=overview", icon: <Landmark className="h-4 w-4" />, label: "ภาพรวมการเงิน", permission: "financials.overview" },
            { href: "/financials?tab=verification", icon: <ShieldCheck className="h-4 w-4" />, label: "ตรวจสอบสลิป", permission: "financials.verification" },
            { href: "/financials?tab=transactions", icon: <FileText className="h-4 w-4" />, label: "รายการธุรกรรม", permission: "financials.transactions" },
            { href: "/financials?tab=withdrawals", icon: <ArrowLeftCircle className="h-4 w-4" />, label: "คำร้องถอนเงิน", permission: "financials.withdrawals" },
            { href: "/coupons", icon: <Ticket className="h-4 w-4" />, label: "คูปองส่วนลด", permission: "coupons" },
            { href: "/gp-coupons", icon: <Percent className="h-4 w-4" />, label: "คูปอง GP ทนาย", permission: "gp_coupons" },
        ]
    },
    {
        title: "ระบบและสนับสนุน",
        items: [
            { href: "/tickets", icon: <Ticket className="h-4 w-4" />, label: "Ticket ช่วยเหลือ" },
            { href: "/email", icon: <Mail className="h-4 w-4" />, label: "ระบบอีเมล" },
        ]
    },
    {
        title: "ร้านค้าและบริการข้อมูล",
        items: [
            { href: "/books", icon: <Package className="h-4 w-4" />, label: "คลังหนังสือ", permission: "store.books" },
            { href: "/orders", icon: <ShoppingBag className="h-4 w-4" />, label: "รายการสั่งซื้อ", permission: "store.orders" },
            { href: "/rag", icon: <Database className="h-4 w-4" />, label: "มอนิเตอร์ RAG", permission: "rag" },
        ]
    }
];

/**
 * หา section ที่ครอบ path ปัจจุบัน — ใช้ตั้งค่าเริ่มต้นว่าจะกางเมนูไหน
 * เดิม default เป็น "ภาพรวม" ซึ่งเป็นชื่อ section ที่ไม่มีอยู่แล้ว ทำให้เมนูปิดหมดทุกครั้งที่เข้า
 */
export function findSectionForPath(pathname: string): string | null {
    if (!pathname || pathname === '/') return null;
    for (const section of navSections) {
        for (const item of section.items) {
            const itemPath = item.href.split('?')[0];
            if (itemPath !== '/' && pathname.startsWith(itemPath)) return section.title;
        }
    }
    return null;
}
