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
    Settings,
    ShieldCheck,
    ShoppingBag,
    Ticket,
    UserCheck,
    Users2,
    GraduationCap,
    Languages,
    HandCoins
} from 'lucide-react';

export type NavItem = {
    href: string;
    icon: React.ReactNode;
    label: string;
    /** ชื่อเมนูภาษาอังกฤษ (หลังบ้านสลับภาษาได้ ดู admin-i18n) */
    labelEn: string;
    /** ถ้าตั้งไว้ จะแสดงเมื่อผู้ใช้มีสิทธิ์นี้เท่านั้น (ดู hasPermission ใน admin-client-layout) */
    permission?: string;
    /** ลิงก์ภายนอกที่แสดงเป็นไอคอนเล็กข้างรายการ */
    externalLink?: string;
};

export type NavSection = {
    title: string;
    titleEn: string;
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
        titleEn: "User Management",
        items: [
            { href: "/customers", icon: <Users2 className="h-4 w-4" />, label: "ลูกค้า", labelEn: "Customers", permission: "users.customers" },
            { href: "/lawyers", icon: <UserCheck className="h-4 w-4" />, label: "ทนายความ", labelEn: "Lawyers", permission: "users.lawyers" },
            { href: "/lawyer-registry", icon: <Database className="h-4 w-4" />, label: "ฐานข้อมูลทนาย", labelEn: "Lawyer Registry", permission: "users.registry" },
            { href: "/interpreters", icon: <Languages className="h-4 w-4" />, label: "ล่าม", labelEn: "Interpreters", permission: "users.interpreters" },
        ]
    },
    {
        title: "ห้องสนทนา",
        titleEn: "Conversations",
        items: [
            { href: "/chats", icon: <MessageSquare className="h-4 w-4" />, label: "แชททั้งหมด", labelEn: "All Chats", permission: "chat" },
        ]
    },
    {
        title: "คำขอใช้บริการ",
        titleEn: "Service Requests",
        items: [
            { href: "/contract-requests", icon: <FileSignature className="h-4 w-4" />, label: "คำขอร่างสัญญา", labelEn: "Contract Requests", permission: "requests" },
            { href: "/registration-requests", icon: <Building2 className="h-4 w-4" />, label: "คำขอจดทะเบียน", labelEn: "Registration Requests", permission: "requests" },
            { href: "/sme-requests", icon: <Briefcase className="h-4 w-4" />, label: "คำขอ SME", labelEn: "SME Requests", permission: "requests" },
            { href: "/interpreter-bookings", icon: <Languages className="h-4 w-4" />, label: "งานล่าม", labelEn: "Interpreter Jobs", permission: "requests.interpreters" },
        ]
    },
    {
        title: "แบบสำรวจ",
        titleEn: "Surveys",
        items: [
            { href: "/surveys", icon: <ClipboardList className="h-4 w-4" />, label: "แบบสำรวจ SME", labelEn: "SME Survey", externalLink: "https://lawslane.com/th/survey" , permission: "surveys" },
            { href: "/survey-lawyer", icon: <Scale className="h-4 w-4" />, label: "แบบสอบถาม (ทนาย)", labelEn: "Survey (Lawyers)", externalLink: "https://lawslane.com/th/survey-lawyer" , permission: "surveys" },
            { href: "/survey-public", icon: <Users2 className="h-4 w-4" />, label: "แบบสอบถาม (บุคคลทั่วไป)", labelEn: "Survey (Public)", externalLink: "https://lawslane.com/th/survey-public" , permission: "surveys" },
        ]
    },
    {
        title: "เนื้อหาและการตลาด",
        titleEn: "Content & Marketing",
        items: [
            { href: "/landing-pages", icon: <LayoutTemplate className="h-4 w-4" />, label: "Landing Pages", labelEn: "Landing Pages", permission: "content" },
            { href: "/ads", icon: <Megaphone className="h-4 w-4" />, label: "จัดการโฆษณา", labelEn: "Ads", permission: "content" },
            { href: "/content", icon: <FileEdit className="h-4 w-4" />, label: "จัดการเนื้อหา", labelEn: "Content", permission: "content" },
            { href: "/forms", icon: <FileText className="h-4 w-4" />, label: "แบบฟอร์มกฎหมาย", labelEn: "Legal Forms", permission: "content" },
            { href: "/legal", icon: <Scale className="h-4 w-4" />, label: "เอกสารทางกฎหมาย", labelEn: "Legal Documents", permission: "content" },
            { href: "/knowledge", icon: <BrainCircuit className="h-4 w-4" />, label: "คลังความรู้ AI", labelEn: "AI Knowledge Base", permission: "rag" },
        ]
    },
    {
        title: "การเงิน",
        titleEn: "Finance",
        items: [
            { href: "/financials?tab=overview", icon: <Landmark className="h-4 w-4" />, label: "ภาพรวมการเงิน", labelEn: "Finance Overview", permission: "financials.overview" },
            { href: "/financials?tab=verification", icon: <ShieldCheck className="h-4 w-4" />, label: "ตรวจสอบสลิป", labelEn: "Slip Verification", permission: "financials.verification" },
            { href: "/financials?tab=transactions", icon: <FileText className="h-4 w-4" />, label: "รายการธุรกรรม", labelEn: "Transactions", permission: "financials.transactions" },
            { href: "/financials?tab=withdrawals", icon: <ArrowLeftCircle className="h-4 w-4" />, label: "คำร้องถอนเงิน", labelEn: "Withdrawals", permission: "financials.withdrawals" },
            { href: "/interpreter-payouts", icon: <HandCoins className="h-4 w-4" />, label: "จ่ายเงินล่าม", labelEn: "Interpreter Payouts", permission: "financials.interpreterPayouts" },
            { href: "/coupons", icon: <Ticket className="h-4 w-4" />, label: "คูปองส่วนลด", labelEn: "Discount Coupons", permission: "coupons" },
            { href: "/gp-coupons", icon: <Percent className="h-4 w-4" />, label: "คูปอง GP ทนาย", labelEn: "Lawyer GP Coupons", permission: "gp_coupons" },
        ]
    },
    {
        title: "ระบบและสนับสนุน",
        titleEn: "System & Support",
        items: [
            { href: "/tickets", icon: <Ticket className="h-4 w-4" />, label: "Ticket ช่วยเหลือ", labelEn: "Support Tickets", permission: "support" },
            { href: "/email", icon: <Mail className="h-4 w-4" />, label: "ระบบอีเมล", labelEn: "Email", permission: "support" },
        ]
    },
    {
        // ยกมาจาก lawlanes-education ตอนรวมหลังบ้าน (Module 4 เป็นต้นไป)
        title: "การศึกษา",
        titleEn: "Education",
        items: [
            { href: "/education/courses", icon: <GraduationCap className="h-4 w-4" />, label: "คอร์สเรียน", labelEn: "Courses", permission: "education.courses" },
            { href: "/education/exams", icon: <ClipboardList className="h-4 w-4" />, label: "ข้อสอบ", labelEn: "Exams", permission: "education.exams" },
            { href: "/settings/education", icon: <Settings className="h-4 w-4" />, label: "ตั้งค่า Education", labelEn: "Education Settings", permission: "education.settings" },
        ]
    },
    {
        // ยกมาจาก lawslane-capdeal ตอนรวมหลังบ้าน (Module 7)
        title: "CapDeal",
        titleEn: "CapDeal",
        items: [
            { href: "/capdeal/contracts", icon: <FileSignature className="h-4 w-4" />, label: "สัญญา CapDeal", labelEn: "CapDeal Contracts", permission: "capdeal.contracts" },
            { href: "/capdeal/finance", icon: <Landmark className="h-4 w-4" />, label: "การเงิน CapDeal", labelEn: "CapDeal Finance", permission: "capdeal.finance" },
        ]
    },
    {
        title: "ร้านค้าและบริการข้อมูล",
        titleEn: "Store & Data Services",
        items: [
            { href: "/books", icon: <Package className="h-4 w-4" />, label: "คลังหนังสือ", labelEn: "Bookstore", permission: "store.books" },
            { href: "/orders", icon: <ShoppingBag className="h-4 w-4" />, label: "รายการสั่งซื้อ", labelEn: "Orders", permission: "store.orders" },
            { href: "/rag", icon: <Database className="h-4 w-4" />, label: "มอนิเตอร์ RAG", labelEn: "RAG Monitor", permission: "rag" },
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
