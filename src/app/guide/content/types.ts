/**
 * โครงข้อมูลคู่มือแอดมิน (/guide)
 *
 * เนื้อหาแยกไฟล์ตามหมวดเมนูใน src/config/nav.tsx — แก้ระบบหน้าไหนให้แก้ไฟล์หมวดนั้นคู่กัน
 * ภาษาไทยเป็นหลัก ภาษาอังกฤษแปลตามให้ตรงกัน (หลังบ้านสลับ TH/EN ได้ ดู lib/admin-i18n)
 */
export type GuideBody = {
    title: string;
    /** หนึ่งถึงสองประโยค: หน้านี้ไว้ทำอะไร */
    summary: string;
    blocks: { heading: string; items: string[] }[];
    /** ข้อควรระวัง แสดงเป็นกล่องสีเหลือง */
    warnings?: string[];
};

export type GuideSection = {
    id: string;
    /** ลิงก์ไปหน้าที่อธิบาย (ถ้ามี) */
    href?: string;
    /** รหัสสิทธิ์ใน src/lib/permissions.ts ที่ต้องมีจึงเห็นเมนูนี้ */
    permission?: string;
    th: GuideBody;
    en: GuideBody;
};

export type GuideGroup = {
    id: string;
    title: { th: string; en: string };
    sections: GuideSection[];
};
