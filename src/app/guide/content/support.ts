import type { GuideGroup } from './types';

export const supportGroup: GuideGroup = {
    id: 'support',
    title: { th: 'ระบบและสนับสนุน', en: 'System and support' },
    sections: [
        {
            id: 'tickets',
            href: '/tickets',
            permission: 'support',
            th: {
                title: 'Ticket ช่วยเหลือ',
                summary: 'เรื่องที่ผู้ใช้แจ้งเข้ามา ตอบผ่านแชทในแต่ละ Ticket และปิดเมื่อแก้เสร็จ',
                blocks: [
                    {
                        heading: 'ตอบ Ticket',
                        items: [
                            'แท็บ "รอดำเนินการ" → เปิด Ticket อ่าน "สรุปข้อมูล" (หัวข้อ รายละเอียด ผู้แจ้ง เคสที่เกี่ยวข้อง)',
                            'พิมพ์ตอบในแชท แนบไฟล์ได้ ปุ่มแปลช่วยแปลข้อความเป็นอังกฤษ',
                            'แก้เสร็จแล้วกด "Mark as Resolved" ผู้ใช้จะได้รับแจ้งเตือน',
                        ],
                    },
                    {
                        heading: 'Ticket ขอใช้บริการล่าม',
                        items: [
                            'Ticket หัวข้อ "ขอใช้บริการล่าม" มีแผง "ลิงก์ชำระเงินค่าล่าม" (ต้องมีสิทธิ์งานล่าม)',
                            'เลือกล่ามที่อนุมัติแล้ว บริการ คู่ภาษา ชื่อรายการ ยอด (100–2,000,000 บาท) และวันงาน',
                            'กด "สร้างลิงก์และส่งในแชท" ลิงก์ใช้ได้ 7 วัน ลูกค้าได้แจ้งเตือน เมื่อแนบสลิปแล้วงานจะไปรอตรวจที่ "งานล่าม"',
                        ],
                    },
                ],
                warnings: [
                    '"Mark as Resolved" ไม่ถามยืนยัน และเปิด Ticket กลับไม่ได้ ช่องแชทจะถูกปิด ตรวจให้แน่ใจก่อนกด',
                    'ช่องค้นหาค้นจากต้นหัวข้อปัญหาและแยกตัวพิมพ์เล็ก/ใหญ่',
                ],
            },
            en: {
                title: 'Support tickets',
                summary: 'Issues reported by users. Reply in each ticket\'s chat and close it once resolved.',
                blocks: [
                    {
                        heading: 'Answer a ticket',
                        items: [
                            'Tab "Pending" → open a ticket and read the summary (topic, details, reporter, related case).',
                            'Reply in the chat and attach files. The translate button renders a message in English.',
                            'When fixed, click "Mark as Resolved". The user is notified.',
                        ],
                    },
                    {
                        heading: 'Interpreter service tickets',
                        items: [
                            'Tickets titled "ขอใช้บริการล่าม" show an interpreter payment link panel (needs the interpreter jobs permission).',
                            'Choose an approved interpreter, service, language pair, item name, amount (100–2,000,000 baht) and job date.',
                            'Click "สร้างลิงก์และส่งในแชท". The link lasts 7 days and the customer is notified. Once they attach a slip, the job appears under "Interpreter jobs" for review.',
                        ],
                    },
                ],
                warnings: [
                    '"Mark as Resolved" has no confirmation and cannot be reopened; the chat input closes. Be sure before clicking.',
                    'Search matches the start of the topic and is case-sensitive.',
                ],
            },
        },
        {
            id: 'email',
            href: '/email',
            permission: 'support',
            th: {
                title: 'ระบบอีเมล',
                summary: 'ส่งอีเมลจาก noreply@lawslane.com ถึงคนเดียวหรือหลายคน และดูประวัติการส่ง',
                blocks: [
                    {
                        heading: 'ส่งอีเมล',
                        items: [
                            'แท็บ "เขียนอีเมลใหม่" → "ส่งถึง": ระบุอีเมลเฉพาะ / ผู้ใช้ทั้งหมด / ทนายความทั้งหมด',
                            'กรอกหัวข้อและเนื้อหา (ข้อความธรรมดา ขึ้นบรรทัดใหม่ได้) → "ส่งอีเมล"',
                            'แท็บ "ประวัติการส่ง" ดู 50 รายการล่าสุด',
                            'แท็บ "กล่องข้อความเข้า" คือคำขอ SME ล่าสุด ไม่ใช่กล่องอีเมลจริง กด "ตอบกลับ" เพื่อร่างอีเมลตอบ',
                        ],
                    },
                ],
                warnings: [
                    'กดส่งแล้วส่งทันที ไม่มีขั้นยืนยันและยกเลิกไม่ได้ อ่านทวนก่อนทุกครั้ง',
                    '"ผู้ใช้ทั้งหมด" และ "ทนายความทั้งหมด" ส่งได้สูงสุด 100 คนแรกเท่านั้น และ "ผู้ใช้ทั้งหมด" รวมทนายและแอดมินด้วย',
                ],
            },
            en: {
                title: 'Email',
                summary: 'Send email from noreply@lawslane.com to one or many people, and see send history.',
                blocks: [
                    {
                        heading: 'Send email',
                        items: [
                            'Tab "Compose" → recipients: a specific email / all users / all lawyers.',
                            'Enter subject and body (plain text, line breaks kept) → send.',
                            '"History" shows the latest 50 sends.',
                            '"Inbox" lists recent SME requests, not a real mailbox. Click "ตอบกลับ" to draft a reply.',
                        ],
                    },
                ],
                warnings: [
                    'Sending is immediate, with no confirmation and no undo. Proofread every time.',
                    '"All users" and "All lawyers" reach only the first 100 people, and "All users" includes lawyers and admins.',
                ],
            },
        },
    ],
};
