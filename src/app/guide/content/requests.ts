import type { GuideGroup } from './types';

export const requestsGroup: GuideGroup = {
    id: 'requests',
    title: { th: 'ห้องสนทนาและคำขอใช้บริการ', en: 'Conversations and service requests' },
    sections: [
        {
            id: 'chats',
            href: '/chats',
            permission: 'chat',
            th: {
                title: 'แชททั้งหมด',
                summary: 'ดูห้องสนทนาระหว่างลูกความกับทนายแบบอ่านอย่างเดียว ใช้ตรวจสอบเมื่อมีข้อร้องเรียนหรือข้อพิพาท',
                blocks: [
                    {
                        heading: 'การใช้งาน',
                        items: [
                            'รายการแสดง 150 ห้องล่าสุด ค้นหาด้วยชื่อเคส ชื่อทนาย หรือชื่อลูกความ',
                            'สถานะ: "กำลังดำเนินการ", "รอชำระเงิน", "ปิดเคสแล้ว", "ปฏิเสธ"',
                            'กด "ดูข้อความ" เพื่ออ่านข้อความแบบเรียลไทม์ รูปและไฟล์เปิดในแท็บใหม่',
                        ],
                    },
                ],
                warnings: [
                    'แอดมินส่งข้อความในหน้านี้ไม่ได้ และข้อความจากระบบจะแสดงป้ายเป็น "ลูกความ"',
                    'ข้อความในแชทเป็นข้อมูลส่วนบุคคล ห้ามคัดลอกหรือแคปหน้าจอออกนอกระบบ',
                ],
            },
            en: {
                title: 'All chats',
                summary: 'Read-only view of client–lawyer conversations, for checking complaints or disputes.',
                blocks: [
                    {
                        heading: 'Usage',
                        items: [
                            'The list shows the 150 most recent chats. Search by case title, lawyer or client name.',
                            'Statuses: active, awaiting payment, closed, rejected.',
                            'Click "ดูข้อความ" to read messages live. Images and files open in a new tab.',
                        ],
                    },
                ],
                warnings: [
                    'Admins cannot send messages here, and system messages are labelled as the client.',
                    'Chat content is personal data. Never copy or screenshot it out of the system.',
                ],
            },
        },
        {
            id: 'service-requests',
            href: '/contract-requests',
            permission: 'requests',
            th: {
                title: 'คำขอร่างสัญญา / จดทะเบียน / SME',
                summary: 'คำขอที่ลูกค้าส่งจากฟอร์มบนเว็บหลัก ทั้งสามหน้าทำงานแบบเดียวกัน: เปิดคำขอ ติดต่อลูกค้า แล้วเปลี่ยนสถานะตามความคืบหน้า',
                blocks: [
                    {
                        heading: 'ขั้นตอน',
                        items: [
                            'เปิดคำขอจากรายการ ดูข้อมูลผู้ส่ง รายละเอียด และดาวน์โหลดไฟล์แนบ',
                            'ติดต่อลูกค้าด้วยปุ่ม "ส่งอีเมลหาลูกค้า" (เปิดโปรแกรมอีเมลของคุณ) หรือโทรตามเบอร์ที่ให้ไว้',
                            'เปลี่ยน "สถานะปัจจุบัน" ให้ตรงกับงานจริง',
                        ],
                    },
                    {
                        heading: 'สถานะของแต่ละประเภท',
                        items: [
                            'คำขอร่างสัญญา: "รอประเมิน" → "แจ้งราคาแล้ว" → "เสร็จสิ้น" หรือ "ยกเลิก" (แสดง 50 รายการล่าสุด)',
                            'คำขอจดทะเบียน: "รอตรวจสอบ" → "กำลังดำเนินการ" → "เสร็จสิ้น" หรือ "ยกเลิก"',
                            'คำขอ SME: "ใหม่" → "ติดต่อแล้ว" → "เสร็จสิ้น"',
                        ],
                    },
                ],
                warnings: [
                    'เปลี่ยนสถานะในดรอปดาวน์แล้วบันทึกทันทีโดยไม่ถามยืนยัน',
                    'ระบบไม่ส่งอีเมลหรือแจ้งเตือนลูกค้าเมื่อเปลี่ยนสถานะ ต้องแจ้งลูกค้าเอง',
                ],
            },
            en: {
                title: 'Contract / registration / SME requests',
                summary: 'Requests submitted from forms on the main site. All three pages work the same way: open the request, contact the customer, then update the status as work progresses.',
                blocks: [
                    {
                        heading: 'Steps',
                        items: [
                            'Open a request to see the sender, details and attachment download.',
                            'Contact the customer with "ส่งอีเมลหาลูกค้า" (opens your mail app) or by phone.',
                            'Set the current status to match the real progress.',
                        ],
                    },
                    {
                        heading: 'Statuses by type',
                        items: [
                            'Contract requests: awaiting assessment → quoted → completed or cancelled (latest 50 shown).',
                            'Registration requests: pending → in progress → completed or cancelled.',
                            'SME requests: new → contacted → completed.',
                        ],
                    },
                ],
                warnings: [
                    'The status dropdown saves immediately, with no confirmation.',
                    'Changing status does not email or notify the customer. Tell them yourself.',
                ],
            },
        },
        {
            id: 'interpreter-bookings',
            href: '/interpreter-bookings',
            permission: 'requests.interpreters',
            th: {
                title: 'งานล่าม',
                summary: 'งานจองล่ามที่ลูกค้าโอนเงินเข้า Lawslane แพลตฟอร์มเก็บเงินไว้ หัก GP แล้วโอนต่อให้ล่ามหลังงานเสร็จ',
                blocks: [
                    {
                        heading: 'ตรวจสลิป (แท็บ "สลิปรอตรวจ")',
                        items: [
                            'เปิดงาน ดูการ์ด "เงิน": ยอดที่ลูกค้าจ่าย GP ยอดที่ล่ามได้ ผลตรวจ SlipOK และรูปสลิป',
                            'ถ้าถูกต้อง กด "ยืนยันสลิป (ได้รับเงินแล้ว)" ระบบล็อกเวลานัดและแจ้งล่ามกับลูกค้า',
                            'ถ้าสลิปผิด กด "สลิปไม่ถูกต้อง" งานจะถูกยกเลิก ปล่อยเวลานัด และแจ้งลูกค้า',
                            'ถ้ายืนยันไม่ได้เพราะเวลานัดถูกจองไปแล้ว ให้ปฏิเสธและคืนเงินลูกค้าแทน',
                        ],
                    },
                    {
                        heading: 'ยกเลิกและคืนเงิน',
                        items: [
                            '"ยกเลิกงาน (รอคืนเงิน)" ใช้กับงานที่จ่ายแล้วแต่ต้องยกเลิก ต้องใส่เหตุผล งานจะไปอยู่แท็บ "รอคืนเงิน"',
                            'โอนเงินคืนลูกค้านอกระบบ แล้วกรอกเลขอ้างอิงในช่อง "หมายเหตุ / เหตุผล / เลขอ้างอิงการโอนคืน" กด "บันทึกว่าคืนเงินแล้ว" (ต้องมีสิทธิ์จ่ายเงินล่ามด้วย)',
                        ],
                    },
                    {
                        heading: 'สถานะงาน',
                        items: [
                            '"รอตรวจสลิป" → "ชำระแล้ว รอล่ามรับ" → "ล่ามรับงานแล้ว" → "เสร็จสิ้น"',
                            'ทางแยก: "ล่ามปฏิเสธ", "ยกเลิก", "หมดเวลา", "รอคืนเงิน" → "คืนเงินแล้ว"',
                            'งานที่เสร็จแล้วจะไปรอโอนที่เมนู "จ่ายเงินล่าม"',
                        ],
                    },
                ],
                warnings: [
                    '"ยกเลิกงาน (รอคืนเงิน)" ไม่ส่งแจ้งเตือนถึงลูกค้า ต้องแจ้งเองว่ากำลังคืนเงิน',
                    'แชทลูกค้า–ล่ามแสดง "ต้นฉบับก่อนซ่อน" ซึ่งมีช่องทางติดต่อที่ระบบซ่อนไว้ ใช้เพื่อตรวจการเลี่ยงแพลตฟอร์มเท่านั้น',
                ],
            },
            en: {
                title: 'Interpreter jobs',
                summary: 'Interpreter bookings that customers pay to Lawslane. The platform holds the money, deducts GP and pays the interpreter after the job is done.',
                blocks: [
                    {
                        heading: 'Check slips (tab "Slips to check")',
                        items: [
                            'Open the job and check the "Money" card: customer paid, GP, interpreter receives, SlipOK result and slip image.',
                            'If correct, click "ยืนยันสลิป (ได้รับเงินแล้ว)". The time slot is locked and both the interpreter and the customer are notified.',
                            'If wrong, click "สลิปไม่ถูกต้อง". The job is cancelled, the slot released and the customer notified.',
                            'If confirmation fails because the slot was taken, reject and refund the customer instead.',
                        ],
                    },
                    {
                        heading: 'Cancel and refund',
                        items: [
                            '"ยกเลิกงาน (รอคืนเงิน)" cancels a paid job (reason required) and moves it to "Refund pending".',
                            'Refund the customer outside the system, enter the transfer reference in the notes field, and click "บันทึกว่าคืนเงินแล้ว" (needs the interpreter payouts permission too).',
                        ],
                    },
                    {
                        heading: 'Job statuses',
                        items: [
                            'Slip pending → paid, waiting for interpreter → accepted → completed.',
                            'Branches: declined by interpreter, cancelled, expired, refund pending → refunded.',
                            'Completed jobs move to "Interpreter payouts" for payment.',
                        ],
                    },
                ],
                warnings: [
                    '"Cancel job (refund pending)" does not notify the customer. Tell them the refund is in progress.',
                    'The chat panel shows the original text before contact details were hidden. Use it only to check for platform bypass.',
                ],
            },
        },
    ],
};
