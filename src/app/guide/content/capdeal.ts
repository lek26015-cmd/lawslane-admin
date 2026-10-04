import type { GuideGroup } from './types';

export const capdealGroup: GuideGroup = {
    id: 'capdeal',
    title: { th: 'CapDeal', en: 'CapDeal' },
    sections: [
        {
            id: 'capdeal-contracts',
            href: '/capdeal/contracts',
            permission: 'capdeal.contracts',
            th: {
                title: 'สัญญา CapDeal',
                summary: 'ดูสัญญาที่ผู้ใช้สร้างบน CapDeal และสัญญาจ้างทนายจากเว็บหลัก (อ่านอย่างเดียว)',
                blocks: [
                    {
                        heading: 'การใช้งาน',
                        items: [
                            'ค้นหาจากชื่อ งาน หรือ ID สัญญา แสดง 100 ฉบับล่าสุด',
                            'ไอคอนตา "ดูสัญญา" เปิดรายละเอียด: งาน ค่าตอบแทน คู่สัญญา สถานะการลงนาม และเอกสารแนบ',
                            'สถานะ: ฉบับร่าง → รอลงนาม → ลงนามแล้ว → สำเร็จ/เสร็จสิ้น หรือ ยกเลิกแล้ว',
                        ],
                    },
                ],
                warnings: [
                    'แอดมินแก้หรือลบสัญญาไม่ได้ และปุ่ม "ตัวกรอง" / "ส่งออก CSV" ยังไม่ทำงาน',
                    'ระบบซ่อนลายเซ็น เลขบัตร และ PIN ลิงก์แชร์ไว้โดยตั้งใจ ห้ามขอข้อมูลเหล่านี้จากผู้ใช้ผ่านช่องทางอื่น',
                ],
            },
            en: {
                title: 'CapDeal contracts',
                summary: 'View contracts users create on CapDeal and lawyer engagement contracts from the main site (read-only).',
                blocks: [
                    {
                        heading: 'Usage',
                        items: [
                            'Search by title, job or contract ID. The latest 100 are shown.',
                            'The eye icon opens details: job, fee, parties, signing status and attachments.',
                            'Statuses: draft → awaiting signature → signed → succeeded/completed, or cancelled.',
                        ],
                    },
                ],
                warnings: [
                    'Admins cannot edit or delete contracts, and the Filter / Export CSV buttons do not work yet.',
                    'Signatures, ID numbers and share-link PINs are hidden on purpose. Never ask users for them through other channels.',
                ],
            },
        },
        {
            id: 'capdeal-finance',
            href: '/capdeal/finance',
            permission: 'capdeal.finance',
            th: {
                title: 'การเงิน CapDeal',
                summary: 'ภาพรวมรายได้ของดีลที่สำเร็จ และคิวตรวจสลิปของดีลที่รอชำระ',
                blocks: [
                    {
                        heading: 'ตรวจสลิป',
                        items: [
                            'แท็บ "ตรวจสอบสลิป" → "ดูสลิป" เทียบรูปสลิปกับยอดที่ต้องชำระ',
                            '"ยืนยันยอดเงิน" เปิดใช้ดีลและแจ้งเจ้าของดีล',
                            '"ปฏิเสธสลิป" ต้องระบุเหตุผล เจ้าของดีลได้รับแจ้งเตือนพร้อมเหตุผล',
                        ],
                    },
                ],
                warnings: [
                    'ถ้าแท็บตรวจสลิปว่างหรือโหลดไม่ขึ้น ให้แจ้งทีมพัฒนา อาจเป็นปัญหาสิทธิ์การอ่านข้อมูล ไม่ได้แปลว่าไม่มีสลิปค้าง',
                    'ดีลที่ปฏิเสธสลิปแล้วยังค้างอยู่ในคิว และดีลที่ยืนยันแล้วไม่ถูกนับในยอดรายได้ภาพรวม',
                    'ปุ่ม "30 วันล่าสุด" และ "ส่งออกรายงาน" ยังไม่ทำงาน',
                ],
            },
            en: {
                title: 'CapDeal finance',
                summary: 'Revenue overview for succeeded deals, and the slip-check queue for deals awaiting payment.',
                blocks: [
                    {
                        heading: 'Check slips',
                        items: [
                            'Tab "Slip check" → "ดูสลิป": compare the slip with the amount due.',
                            '"ยืนยันยอดเงิน" activates the deal and notifies its owner.',
                            '"ปฏิเสธสลิป" requires a reason; the owner is notified with it.',
                        ],
                    },
                ],
                warnings: [
                    'If the slip tab is empty or fails to load, tell the dev team. It may be a data-access issue, not an empty queue.',
                    'Rejected deals stay in the queue, and approved deals are not counted in the revenue overview.',
                    'The "Last 30 days" and "Export report" buttons do not work yet.',
                ],
            },
        },
        {
            id: 'capdeal-plans',
            href: '/capdeal/plans',
            permission: 'capdeal.plans',
            th: {
                title: 'แพ็กเกจและสิทธิ์ (CapDeal)',
                summary: 'กำหนดสิทธิ์ของแพ็กเกจ Free / Lite / Pro / Scale และมอบแพ็กเกจให้ลูกค้ารายคน',
                blocks: [
                    {
                        heading: 'สิทธิ์ที่ตั้งได้',
                        items: [
                            '"สร้างสัญญา (ฉบับ/เดือน)"',
                            '"AI อ่านแคปแชท (ครั้ง/เดือน)" — "อัตโนมัติ" = จำนวนสัญญา × 3 (อย่างน้อย 10)',
                            '"แนบเอกสารท้ายสัญญา" และ "ไม่มีลายน้ำ Lawslane"',
                        ],
                    },
                    {
                        heading: 'มอบแพ็กเกจรายคน',
                        items: [
                            'แท็บ "ลูกค้ารายคน" ค้นด้วยอีเมลหรือ UID ตารางแสดงแพลน Stripe ปัจจุบันของลูกค้าด้วย',
                            'ลูกค้าได้แพ็กเกจที่สูงกว่าระหว่างที่จ่ายผ่าน Stripe กับที่แอดมินมอบ',
                        ],
                    },
                ],
                warnings: ['การมอบหรือถอนไม่ยกเลิกหรือเปลี่ยนการเรียกเก็บเงินใน Stripe'],
            },
            en: {
                title: 'Plans and entitlements (CapDeal)',
                summary: 'Set what Free / Lite / Pro / Scale include and grant plans to individual customers.',
                blocks: [
                    {
                        heading: 'Settings',
                        items: [
                            'Contracts per month.',
                            'AI chat-screenshot scans per month. "Auto" = contracts × 3 (minimum 10).',
                            'Contract attachments and removing the Lawslane watermark.',
                        ],
                    },
                    {
                        heading: 'Grant to a customer',
                        items: [
                            'Tab "Individual customers": search by email or UID. The table also shows the customer\'s current Stripe plan.',
                            'The customer gets the higher of their Stripe plan and the granted plan.',
                        ],
                    },
                ],
                warnings: ['Granting or revoking does not cancel or change Stripe billing.'],
            },
        },
    ],
};
