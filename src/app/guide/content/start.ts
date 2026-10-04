import type { GuideGroup } from './types';

export const startGroup: GuideGroup = {
    id: 'start',
    title: { th: 'เริ่มต้นใช้งาน', en: 'Getting started' },
    sections: [
        {
            id: 'login',
            href: '/login',
            th: {
                title: 'เข้าสู่ระบบและสิทธิ์การเข้าถึง',
                summary: 'หลังบ้านใช้บัญชีที่ Super Admin สร้างให้เท่านั้น เมนูที่เห็นขึ้นกับสิทธิ์ที่ได้รับ ไม่เห็นเมนูไหนแปลว่ายังไม่มีสิทธิ์หน้านั้น',
                blocks: [
                    {
                        heading: 'เข้าสู่ระบบ',
                        items: [
                            'กรอกอีเมลและรหัสผ่าน แล้วผ่านการยืนยัน Cloudflare Turnstile จากนั้นกด "เข้าสู่ระบบ"',
                            'ระบบจำการเข้าสู่ระบบไว้ 5 วัน ครบแล้วต้องล็อกอินใหม่',
                            'ลืมรหัสผ่าน: กด "ลืมรหัสผ่าน?" → "ส่งลิงก์รีเซ็ต" ลิงก์จะส่งไปที่อีเมลที่ใช้ล็อกอิน (ระบบแสดงว่าส่งสำเร็จเสมอแม้อีเมลไม่มีในระบบ เพื่อไม่ให้คนนอกเดาอีเมลได้)',
                        ],
                    },
                    {
                        heading: 'ระดับผู้ดูแล',
                        items: [
                            '"ผู้ดูแลระบบสูงสุด" (Super Admin) เห็นทุกเมนู และเป็นคนเดียวที่สร้าง/แก้/ถอนสิทธิ์แอดมิน เปลี่ยนบทบาทผู้ใช้ และลบบัญชีลูกค้าได้',
                            '"ผู้ดูแลระบบ" (Administrator) เห็นเฉพาะเมนูที่ถูกติ๊กสิทธิ์ไว้ สิทธิ์เป็นลำดับชั้น เช่นได้สิทธิ์ "การเงิน" ทั้งหมดก็เข้าทุกแท็บการเงินได้',
                            'ทุกหัวข้อในคู่มือนี้มีป้ายรหัสสิทธิ์กำกับ ใช้ตรวจว่าต้องขอสิทธิ์อะไรจาก Super Admin',
                        ],
                    },
                ],
                warnings: [
                    'ปุ่ม "ออกจากระบบ" ออกจากเบราว์เซอร์นี้แล้ว แต่ถ้าใช้เครื่องร่วมกับผู้อื่น ให้ปิดเบราว์เซอร์และล้างคุกกี้ด้วย',
                    'บัญชีแอดมินต้องเป็นอีเมล @lawslane.com ที่ Super Admin สร้างจากหน้า "จัดการผู้ดูแลระบบ" เท่านั้น สมัครเองไม่ได้',
                ],
            },
            en: {
                title: 'Signing in and access rights',
                summary: 'The back office only accepts accounts created by a Super Admin. The menu shows only what you have permission for; a missing menu item means you lack that permission.',
                blocks: [
                    {
                        heading: 'Sign in',
                        items: [
                            'Enter your email and password, pass the Cloudflare Turnstile check, then sign in.',
                            'You stay signed in for 5 days, then you must sign in again.',
                            'Forgot your password: click "ลืมรหัสผ่าน?" → "ส่งลิงก์รีเซ็ต". The link goes to your sign-in email. The screen always reports success, even for unknown emails, so outsiders cannot probe which emails exist.',
                        ],
                    },
                    {
                        heading: 'Admin levels',
                        items: [
                            'Super Admin sees every menu, and is the only role that can create, edit or revoke admins, change user roles, and delete customer accounts.',
                            'Administrator sees only the menus that were ticked for them. Permissions are hierarchical: holding all of "Finance" opens every finance tab.',
                            'Each topic in this guide shows its permission code, so you know what to ask a Super Admin for.',
                        ],
                    },
                ],
                warnings: [
                    'Logging out signs you out of this browser. On a shared computer, also close the browser and clear its cookies.',
                    'Admin accounts must be @lawslane.com addresses created by a Super Admin under "Administrators". You cannot sign up yourself.',
                ],
            },
        },
        {
            id: 'dashboard',
            href: '/',
            th: {
                title: 'แดชบอร์ด',
                summary: 'หน้าแรกหลังล็อกอิน สรุปงานที่รอทำทั้งระบบ กดการ์ดใดก็จะไปหน้าที่เกี่ยวข้อง',
                blocks: [
                    {
                        heading: 'การ์ดสถิติ',
                        items: [
                            '"ผู้ใช้งานทั้งหมด" และผู้สมัครใหม่ใน 7 วัน',
                            '"Ticket ที่เปิดอยู่" — เรื่องที่ยังรอตอบ',
                            '"ทนายรออนุมัติ" / "ทนายที่ Active" และ "ล่ามรออนุมัติ"',
                            '"คำขอที่รอดำเนินการ" — รวมคำขอจดทะเบียน ร่างสัญญา และ SME (กดแล้วไปหน้าคำขอจดทะเบียน อีกสองประเภทเปิดจากเมนู)',
                            '"สัญญา CapDeal" และ "สลิป CapDeal รอตรวจ"',
                            '"งานล่ามรอดำเนินการ" — สลิปที่ต้องตรวจ งานรอคืนเงิน และงานที่รอโอนให้ล่าม',
                        ],
                    },
                    {
                        heading: 'ตารางด้านล่าง',
                        items: [
                            '"ทนายความรอการอนุมัติ" 5 รายล่าสุด กด "ดูใบสมัคร" เพื่อตรวจเอกสาร',
                            '"Ticket ช่วยเหลือล่าสุด" 5 เรื่องที่ยังเปิดอยู่',
                        ],
                    },
                ],
                warnings: [
                    'การ์ด "รายได้รวม" (เห็นเฉพาะ Super Admin) ยังไม่เปิดใช้งาน',
                    'ถ้าตัวเลขทุกการ์ดเป็น 0 พร้อมกัน อาจเป็นเพราะโหลดข้อมูลไม่สำเร็จ ให้รีเฟรชหน้าก่อนสรุปว่าไม่มีงาน',
                ],
            },
            en: {
                title: 'Dashboard',
                summary: 'The first page after sign-in. It summarises pending work across the system; click any card to open the related page.',
                blocks: [
                    {
                        heading: 'Stat cards',
                        items: [
                            'Total users, plus new sign-ups in the last 7 days.',
                            'Open tickets awaiting a reply.',
                            'Lawyers awaiting approval, active lawyers, and interpreters awaiting approval.',
                            'Pending requests: registration, contract and SME requests combined. The card opens registration requests; open the other two from the menu.',
                            'CapDeal contracts and CapDeal slips awaiting review.',
                            'Interpreter work pending: slips to check, refunds pending, and jobs awaiting payout.',
                        ],
                    },
                    {
                        heading: 'Tables',
                        items: [
                            'The 5 latest lawyers awaiting approval. Click "ดูใบสมัคร" to review documents.',
                            'The 5 latest open support tickets.',
                        ],
                    },
                ],
                warnings: [
                    'The "Total revenue" card (Super Admin only) is not live yet.',
                    'If every card shows 0 at once, data may have failed to load. Refresh before concluding there is no work.',
                ],
            },
        },
        {
            id: 'administrators',
            href: '/settings/administrators',
            th: {
                title: 'จัดการผู้ดูแลระบบ (Super Admin)',
                summary: 'สร้างบัญชีแอดมินใหม่ กำหนดสิทธิ์รายเมนู และถอนสิทธิ์ เปิดจากเมนูชื่อผู้ใช้ด้านล่างซ้าย → "ตั้งค่า" → ผู้ดูแลระบบ',
                blocks: [
                    {
                        heading: 'เพิ่มผู้ดูแลระบบ',
                        items: [
                            'กด "เพิ่มผู้ดูแลระบบ" กรอกชื่อ อีเมล @lawslane.com และรหัสผ่านอย่างน้อย 6 ตัว',
                            'เลือกระดับ "ผู้ดูแลทั่วไป (Admin)" หรือ "ผู้ดูแลสูงสุด (Super Admin)"',
                            'ติ๊กเฉพาะสิทธิ์ที่งานของคนนั้นต้องใช้ แล้วกด "สร้างบัญชี" — ส่งอีเมลและรหัสผ่านให้เจ้าตัวทางช่องทางที่ปลอดภัย',
                            'นี่เป็นฟอร์มเดียวในหลังบ้านที่สร้างบัญชีล็อกอินได้จริง',
                        ],
                    },
                    {
                        heading: 'แก้ไขหรือถอนสิทธิ์',
                        items: [
                            '"แก้ไขสิทธิ์" → ติ๊กสิทธิ์ใหม่ → "บันทึกการเปลี่ยนแปลง" ผู้ถูกแก้จะถูกออกจากระบบและต้องล็อกอินใหม่จึงเห็นสิทธิ์ใหม่',
                            '"ถอนสิทธิ์ผู้ดูแลระบบ" ทำให้เข้าหลังบ้านไม่ได้ทันที แต่บัญชีผู้ใช้ยังอยู่',
                            'ทุกการแก้สิทธิ์ถูกบันทึกไว้ในประวัติการตรวจสอบ',
                        ],
                    },
                ],
                warnings: [
                    'แก้หรือถอนสิทธิ์ตัวเองไม่ได้ และแก้บัญชี Super Admin หลักไม่ได้',
                    'ให้สิทธิ์น้อยที่สุดที่พอทำงาน โดยเฉพาะสิทธิ์การเงินและ Super Admin',
                ],
            },
            en: {
                title: 'Administrators (Super Admin)',
                summary: 'Create admin accounts, set per-menu permissions and revoke access. Open it from your name at the bottom left → Settings → Administrators.',
                blocks: [
                    {
                        heading: 'Add an administrator',
                        items: [
                            'Click "เพิ่มผู้ดูแลระบบ" and enter a name, a @lawslane.com email and a password of at least 6 characters.',
                            'Choose "Admin" or "Super Admin".',
                            'Tick only the permissions this person needs, then click "สร้างบัญชี". Send them the email and password over a secure channel.',
                            'This is the only form in the back office that creates a real login account.',
                        ],
                    },
                    {
                        heading: 'Edit or revoke',
                        items: [
                            '"แก้ไขสิทธิ์" → tick the new permissions → save. The person is signed out and must sign in again to get the new permissions.',
                            '"ถอนสิทธิ์ผู้ดูแลระบบ" blocks back-office access immediately; the user account itself stays.',
                            'Every permission change is written to the audit log.',
                        ],
                    },
                ],
                warnings: [
                    'You cannot edit or revoke yourself, and nobody can edit the main Super Admin.',
                    'Grant the least access that does the job, especially finance permissions and Super Admin.',
                ],
            },
        },
        {
            id: 'settings',
            href: '/settings',
            th: {
                title: 'ตั้งค่าส่วนตัวและการแจ้งเตือน',
                summary: 'เมนูชื่อผู้ใช้ → "ตั้งค่า" มีแท็บต่างๆ ของการตั้งค่า',
                blocks: [
                    {
                        heading: 'ใช้งานได้',
                        items: [
                            'การแจ้งเตือน: ตั้งอีเมลรับแจ้งเตือน และเลือกว่าจะรับเรื่องผู้ใช้ใหม่ Ticket ใหม่ หรือการชำระเงิน',
                            'การเงิน: ค่าธรรมเนียมแพลตฟอร์มของทนาย (การ์ด "รอบการจ่ายเงิน" ยังไม่ทำงาน)',
                            'ผู้ดูแลระบบ: ดูหัวข้อ "จัดการผู้ดูแลระบบ"',
                            'สลับภาษาหลังบ้าน TH/EN ได้จากปุ่มมุมขวาบน ระบบจำไว้ต่อเบราว์เซอร์',
                        ],
                    },
                ],
                warnings: [
                    'แท็บ "ทั่วไป" (ชื่อเว็บ ภาษา โหมดบำรุงรักษา) ยังไม่บันทึกจริง แม้จะขึ้นข้อความว่าบันทึกสำเร็จ',
                ],
            },
            en: {
                title: 'Personal settings and notifications',
                summary: 'Your name menu → Settings holds the settings tabs.',
                blocks: [
                    {
                        heading: 'What works',
                        items: [
                            'Notifications: set the email for alerts and choose new-user, new-ticket and payment alerts.',
                            'Finance: the lawyer platform fee (the "payout cycle" card does not work yet).',
                            'Administrators: see "Administrators".',
                            'Switch the back-office language TH/EN with the toggle at the top right. It is remembered per browser.',
                        ],
                    },
                ],
                warnings: [
                    'The "General" tab (site name, language, maintenance mode) does not save yet, even though it shows a success message.',
                ],
            },
        },
    ],
};
