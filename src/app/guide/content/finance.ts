import type { GuideGroup } from './types';

export const financeGroup: GuideGroup = {
    id: 'finance',
    title: { th: 'การเงิน', en: 'Finance' },
    sections: [
        {
            id: 'financials',
            href: '/financials?tab=overview',
            permission: 'financials',
            th: {
                title: 'ภาพรวมการเงิน / ตรวจสลิป / ธุรกรรม / ถอนเงิน',
                summary: 'ปัจจุบันลูกความโอนค่าบริการตรงให้ทนาย และทนายกดยืนยันได้รับเงินเอง หน้านี้จึงใช้ดูภาพรวมและเคลียร์รายการรูปแบบเก่าที่ยังค้างอยู่',
                blocks: [
                    {
                        heading: 'แท็บ "ตรวจสลิป"',
                        items: [
                            'แสดงสลิปที่ยังรอตรวจ (นัดหมาย แชท/คดี ค่าบริการเพิ่มเติม งวดผ่อน)',
                            '"ดูสลิป" ตรวจสลิปกับ SlipOK เทียบยอดและชื่อผู้รับ ถ้าขึ้น "ข้อมูลไม่ตรงกัน (Mismatch)" ห้ามอนุมัติจนกว่าจะตรวจกับลูกค้า',
                            '"อนุมัติ" เปิดเคสหรือบันทึกงวดว่าชำระแล้ว ระบบโพสต์ข้อความยืนยันในแชทและอีเมลแจ้งทนายกับลูกความ',
                            '"ปฏิเสธ" มีเฉพาะค่าบริการเพิ่มเติม ต้องใส่เหตุผล (ลูกความเห็น) ลูกความแนบสลิปใหม่ได้',
                        ],
                    },
                    {
                        heading: 'แท็บ "ธุรกรรม" และ "ภาพรวม"',
                        items: [
                            '"ธุรกรรม" ดูรายการนัดหมาย แชท และใบแจ้งหนี้ล่าสุด พร้อมหลักฐาน อ่านอย่างเดียว',
                            '"ภาพรวม" แสดงกราฟรายเดือน',
                        ],
                    },
                    {
                        heading: 'แท็บ "คำร้องถอนเงิน"',
                        items: [
                            'ใช้กับคำร้องถอนเงินแบบเก่าที่ยังค้าง ระบบคำนวณ "ยอดคงเหลือจริง" ให้ใหม่ทุกครั้ง',
                            'โอนเงินนอกระบบก่อน แล้วจึงกด "อนุมัติ" (ระบบไม่โอนเงินและไม่แจ้งทนาย)',
                            'อนุมัติไม่ได้ถ้ายอดต่ำกว่า ฿1,000 หรือเกินยอดคงเหลือ (ป้ายแดง "เกินยอดคงเหลือ")',
                        ],
                    },
                ],
                warnings: [
                    'ตัวเลข "รายได้แพลตฟอร์ม" คำนวณจาก GP 15% แบบเก่า ไม่ใช่รายได้ที่เก็บได้จริงในโมเดลปัจจุบัน และกราฟรายเดือนรวมเดือนเดียวกันของทุกปีเข้าด้วยกัน',
                    'กด "ดูสลิป" หรือ "ตรวจสอบอีกครั้ง" แต่ละครั้งใช้โควตา SlipOK ของเดือนนั้น ระบบเตือนเมื่อใกล้ครบ',
                    'รายการประเภท "ใบแจ้งหนี้" อนุมัติจากหน้านี้ไม่ได้',
                ],
            },
            en: {
                title: 'Finance overview / slips / transactions / withdrawals',
                summary: 'Clients now pay lawyers directly and lawyers confirm receipt themselves. This page is for the overview and for clearing leftover items from the old model.',
                blocks: [
                    {
                        heading: 'Tab "Slip check"',
                        items: [
                            'Lists slips awaiting review (appointments, chats/cases, additional fees, installments).',
                            '"ดูสลิป" checks the slip with SlipOK against amount and receiver. If it shows "Mismatch", do not approve until you have checked with the customer.',
                            '"อนุมัติ" opens the case or marks the installment paid, posts a confirmation in the chat, and emails the lawyer and client.',
                            '"ปฏิเสธ" exists only for additional fees. The reason is shown to the client, who can upload a new slip.',
                        ],
                    },
                    {
                        heading: 'Tabs "Transactions" and "Overview"',
                        items: [
                            '"Transactions" lists recent appointments, chats and invoices with evidence. Read-only.',
                            '"Overview" shows a monthly chart.',
                        ],
                    },
                    {
                        heading: 'Tab "Withdrawals"',
                        items: [
                            'For leftover withdrawal requests from the old model. The real available balance is recalculated each time.',
                            'Transfer the money outside the system first, then click approve. The system neither transfers money nor notifies the lawyer.',
                            'Approval is blocked below ฿1,000 or above the available balance (red "exceeds balance" badge).',
                        ],
                    },
                ],
                warnings: [
                    '"Platform revenue" figures use the old 15% GP formula and are not real collected revenue under the current model. The monthly chart also merges the same month across years.',
                    'Every "ดูสลิป" or re-check uses that month\'s SlipOK quota. The system warns as you near the limit.',
                    'Invoice rows cannot be approved from this page.',
                ],
            },
        },
        {
            id: 'interpreter-payouts',
            href: '/interpreter-payouts',
            permission: 'financials.interpreterPayouts',
            th: {
                title: 'จ่ายเงินล่าม',
                summary: 'ตั้งค่า GP ของล่าม และบันทึกการโอนค่าจ้างให้ล่ามสำหรับงานที่เสร็จแล้ว',
                blocks: [
                    {
                        heading: 'ตั้งค่า GP',
                        items: [
                            'กรอก "GP (%)" ระหว่าง 0–50 แล้วกด "บันทึก" ถ้ายังไม่เคยตั้ง ระบบใช้ 15%',
                            'มีผลกับการจองใหม่เท่านั้น งานเดิมใช้ GP ตอนจอง',
                        ],
                    },
                    {
                        heading: 'โอนเงินให้ล่าม',
                        items: [
                            'ส่วน "ยอดรอโอนให้ล่าม" รวมงานที่เสร็จแล้วแยกตามล่าม แสดงยอดลูกค้าจ่าย GP และ "ต้องโอน"',
                            'โอนเงินเข้าบัญชีที่แสดงบนการ์ดนอกระบบ',
                            'กรอก "เลขอ้างอิงการโอน" แล้วกด "บันทึกว่าโอนแล้ว" ระบบแจ้งล่ามว่า "โอนค่าจ้างแล้ว"',
                        ],
                    },
                ],
                warnings: [
                    'ปุ่มบันทึกไม่ได้โอนเงินจริง ต้องโอนให้เสร็จก่อนจึงกด',
                    'ถ้าการ์ดขึ้น "ล่ามยังไม่ตั้งบัญชีรับเงิน" ให้ติดต่อล่ามให้ตั้งบัญชีก่อน',
                    'ถ้าขึ้นว่ามีงานที่จ่ายไปแล้ว ให้โหลดหน้าใหม่ อาจมีแอดมินอีกคนบันทึกไปแล้ว',
                ],
            },
            en: {
                title: 'Interpreter payouts',
                summary: 'Set the interpreter GP and record payouts to interpreters for completed jobs.',
                blocks: [
                    {
                        heading: 'Set GP',
                        items: [
                            'Enter "GP (%)" between 0 and 50 and click Save. If never set, 15% is used.',
                            'It only applies to new bookings; existing jobs keep the GP from booking time.',
                        ],
                    },
                    {
                        heading: 'Pay an interpreter',
                        items: [
                            '"Amount due to interpreters" groups completed jobs per interpreter, showing customer paid, GP and amount to transfer.',
                            'Transfer to the bank account on the card, outside the system.',
                            'Enter the transfer reference and click "บันทึกว่าโอนแล้ว". The interpreter is notified that payment was sent.',
                        ],
                    },
                ],
                warnings: [
                    'The button does not transfer money. Finish the transfer first, then record it.',
                    'If the card says the interpreter has no bank account set, ask them to add one first.',
                    'If it says some jobs are already paid, reload the page; another admin may have recorded it.',
                ],
            },
        },
        {
            id: 'coupons',
            href: '/coupons',
            permission: 'coupons',
            th: {
                title: 'คูปองส่วนลด',
                summary: 'สร้างโค้ดส่วนลดให้ลูกค้า แบบลดเป็นบาทหรือเปอร์เซ็นต์',
                blocks: [
                    {
                        heading: 'สร้างคูปอง',
                        items: [
                            '"สร้างคูปอง" → รหัส (ระบบแปลงเป็นตัวพิมพ์ใหญ่) → ประเภท "จำนวนเงินคงที่ (บาท)" หรือ "เปอร์เซ็นต์ (%)" → มูลค่า → วันหมดอายุ (บังคับ) → จำนวนครั้งที่ใช้ได้ (เว้นว่าง = ไม่จำกัด)',
                            'ปุ่มวงกลมในตารางเปิด/ปิดคูปอง',
                        ],
                    },
                ],
                warnings: [
                    'กดบันทึกหลังแก้ไขจะเปิดใช้งานคูปองอีกครั้งเสมอ ถ้าต้องการให้ปิดไว้ ให้กดปิดอีกรอบหลังแก้',
                    'ระบบไม่ตรวจรหัสซ้ำ และไม่กันเปอร์เซ็นต์เกิน 100 ตรวจเองก่อนบันทึก',
                    'ลบแล้วกู้คืนไม่ได้',
                ],
            },
            en: {
                title: 'Discount coupons',
                summary: 'Create discount codes for customers, as a fixed baht amount or a percentage.',
                blocks: [
                    {
                        heading: 'Create a coupon',
                        items: [
                            '"สร้างคูปอง" → code (converted to upper case) → type fixed amount or percent → value → expiry date (required) → usage limit (blank = unlimited).',
                            'The circle button in the table turns a coupon on or off.',
                        ],
                    },
                ],
                warnings: [
                    'Saving an edit always re-enables the coupon. If it should stay off, switch it off again after editing.',
                    'There is no duplicate-code check and no cap at 100%. Check before saving.',
                    'Deleting cannot be undone.',
                ],
            },
        },
        {
            id: 'gp-coupons',
            href: '/gp-coupons',
            permission: 'gp_coupons',
            th: {
                title: 'คูปอง GP ทนาย',
                summary: 'คูปองลดอัตรา GP ให้ทนายเฉพาะราย สร้างที่หน้านี้ แล้วมอบให้ทนายที่หน้าโปรไฟล์ทนาย',
                blocks: [
                    {
                        heading: 'ขั้นตอน',
                        items: [
                            '"สร้างคูปอง GP" → รหัส → คำอธิบาย → "อัตรา GP ใหม่ (%)" → วันหมดอายุ (ไม่บังคับ)',
                            'ไปที่ ทนายความ → ดูโปรไฟล์ → "มอบหมายคูปอง GP" เพื่อผูกคูปองกับทนาย',
                            'คอลัมน์ "ทนายที่ได้รับ" บอกจำนวนทนายที่ผูกคูปองนี้',
                        ],
                    },
                ],
                warnings: [
                    'บันทึกหลังแก้ไขจะเปิดใช้งานคูปองอีกครั้งเสมอ',
                    'ในโมเดลที่ลูกความโอนตรงให้ทนาย ให้ตรวจกับทีมก่อนว่าคูปอง GP ยังมีผลกับการคิดเงินส่วนไหน',
                ],
            },
            en: {
                title: 'Lawyer GP coupons',
                summary: 'Coupons that lower the GP rate for specific lawyers. Create them here, then assign them on the lawyer profile page.',
                blocks: [
                    {
                        heading: 'Steps',
                        items: [
                            '"สร้างคูปอง GP" → code → description → new GP rate (%) → expiry (optional).',
                            'Go to Lawyers → profile → "มอบหมายคูปอง GP" to link the coupon to a lawyer.',
                            'The "Lawyers assigned" column shows how many lawyers hold the coupon.',
                        ],
                    },
                ],
                warnings: [
                    'Saving an edit always re-enables the coupon.',
                    'Under the direct-payment model, check with the team which charges GP coupons still affect.',
                ],
            },
        },
    ],
};
