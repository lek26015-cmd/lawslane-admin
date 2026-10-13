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
                summary: 'ดู GP ของล่าม (อ่านอย่างเดียว) และบันทึกการโอนค่าจ้างให้ล่ามสำหรับงานที่เสร็จแล้ว',
                blocks: [
                    {
                        heading: 'GP',
                        items: [
                            'หน้านี้แสดง GP ปัจจุบันอย่างเดียว ถ้ายังไม่เคยตั้ง ระบบใช้ 15% · แก้ GP ได้ที่ "ราคาแพ็กเกจ" แท็บ "GP ล่าม" (Super Admin เท่านั้น)',
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
                summary: 'View the interpreter GP (read-only) and record payouts to interpreters for completed jobs.',
                blocks: [
                    {
                        heading: 'GP',
                        items: [
                            'This page only shows the current GP (15% if never set). Change it under "ราคาแพ็กเกจ" → "GP ล่าม" (Super Admin only).',
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
        {
            id: 'plan-pricing',
            href: '/pricing',
            superAdminOnly: true,
            th: {
                title: 'ราคาแพ็กเกจ และต้นทุนระบบ',
                summary: 'หน้าเดียวมี 2 แท็บ: "ตั้งราคา" (แพ็กเกจรายเดือน, จ่ายครั้งเดียว, GP ล่าม) และ "ต้นทุนระบบ" (เนื้อหาทั้งไฟล์ต้นทุน Excel แบบอ่านง่าย) ใช้ตัวเลือกสถานการณ์และสมมติฐานต้นทุนชุดเดียวกัน เห็นเฉพาะ Super Admin',
                blocks: [
                    {
                        heading: 'โครงหน้า: แท็บบนสุด + คู่มือ + ปุ่ม ⓘ',
                        items: [
                            'แท็บบนสุด "ตั้งราคา" | "ต้นทุนระบบ" — แท็บที่เปิดจำไว้ใน URL (/pricing?view=costs&section=...) รีเฟรชแล้วอยู่ที่เดิม · /pricing/costs พาไปแท็บต้นทุนระบบ',
                            'ตัวเลือกสถานการณ์ (เริ่มต้น/เติบโต/ขยาย) และกล่อง "สมมติฐานต้นทุน" ด้านล่าง ใช้ร่วมกันทั้งสองแท็บ แก้แล้วตัวเลขทั้งสองแท็บเปลี่ยนทันทีโดยไม่ต้องโหลดใหม่',
                            '"คู่มือหน้านี้" (กดเพื่อกาง) อธิบายว่าหน้านี้คืออะไร ตัวเลขไหลยังไง ควรแก้อะไรเมื่อไร และอะไรมีผลจริง',
                            'ทุกช่องที่แก้ได้มีปุ่ม ⓘ บอก 4 อย่าง: คืออะไร / ทำงานยังไง / ควรแก้เมื่อไร / แก้แล้วกระทบอะไร (ตัวเลขไหนในหน้าขยับ + ผลกับเว็บจริง) — ผลกระทบของช่องสมมติฐานคำนวณจากโมเดลจริง',
                            'ป้ายผลกับเว็บจริง 3 แบบ: "แค่ตัวเลขประมาณ — ไม่กระทบเว็บ" (สมมติฐานทั้งหมด) · "เก็บไว้ ยังไม่ใช้จริง" (Wittaya, AI Plus, แพ็กเครดิต, E-Book/ค่าส่ง, ราคาร่าง) · "มีผลจริงทันที" (ราคา CapDeal/ทนายที่บันทึกผ่าน Stripe, GP ล่าม)',
                            'กล่องยืนยันก่อนบันทึกทุกอัน สรุปผลกระทบของเฉพาะช่องที่แก้อีกครั้ง',
                            'การ์ดสินค้าทุกใบบอก "บริการนี้คืออะไร" (โควตาจริงจากโค้ด) และ "ราคานี้แสดงที่ไหน" พร้อมลิงก์ไปหน้าจริง (เปิดแท็บใหม่) ถ้าหน้านั้นยังใช้ราคาในโค้ดจะเขียนกำกับไว้',
                        ],
                    },
                    {
                        heading: 'แท็บ "ต้นทุนระบบ" (8 แท็บย่อย)',
                        items: [
                            'ภาพรวม: ตาราง 3 สถานการณ์ (ผู้ใช้ บัญชีจ่ายเงิน ค่าส่วนกลาง ค่ารันรวม รายได้ กำไรขั้นต้น) แผนภาพการไหลของตัวเลข และข้อสังเกตอัตโนมัติ',
                            'สรุปต่อเว็บ: ต้นทุนตรงของแต่ละเว็บ + ค่าส่วนกลางที่ปันตามสัดส่วนการเข้าชม รายได้ประมาณ และกำไรขั้นต้น (docs/Lalin/สิทธิคนทำงานไม่ถูกปัน)',
                            'Margin ต่อแพลน: ตารางกำไรทุกแพลน (รวม Business ร่าง และแพลนฟรี) อ่านอย่างเดียว แก้ราคาที่แท็บตั้งราคา',
                            'ค่ารันรายเดือน: ทุกบริการทุกแถว แยกส่วนกลาง/รายเว็บ พร้อมยอดรวม ค่าคงที่/ขั้นบันได ค่าธรรมเนียม ค่า AI และ USD',
                            'ปริมาณใช้งาน / ต้นทุนต่อหน่วย / ราคาบริการ (แถวเหลือง ⚠ = ยังไม่ยืนยัน) / หมายเหตุ 13 ข้อ',
                            'ต่างจากไฟล์ Excel: ค่าธรรมเนียม Stripe บวก VAT 7% และงานล่ามคิดค่าธรรมเนียม Beam แทน Stripe + Connect + ฿10 (ตั้ง VAT = 0 แล้วตรงไฟล์ ยกเว้นแถวงานล่าม)',
                        ],
                    },
                    {
                        heading: 'แท็บ "แพ็กเกจรายเดือน"',
                        items: [
                            'CapDeal และทนาย (ป้าย Stripe): เปลี่ยนราคา = สร้าง Price ใหม่ใน Stripe ใช้กับคนที่สมัครใหม่เท่านั้น ผู้สมัครเดิมจ่ายราคาเดิม',
                            'Wittaya และลูกค้า AI Plus (ป้าย "ยังไม่เปิดขายบนเว็บ"): บันทึกราคาลงระบบไว้ก่อน ไม่สร้างอะไรใน Stripe ไม่มีผลกับลูกค้า',
                            'ช่องว่าง = ไม่ขาย · จำนวนเต็มบาท 1–1,000,000',
                            'ใต้ช่องราคาแสดงต่อบัญชีต่อเดือน: ต้นทุน AI ใช้เต็มโควตา/ใช้เฉลี่ย, ค่าธรรมเนียม Stripe, ค่าส่วนกลาง, กำไรและ margin และ "ราคาต่ำสุดตามเป้า" ตัวเลขสีแดง = ขาดทุน',
                            'รายปีคิดค่าธรรมเนียมครั้งเดียวต่อปีแล้วหาร 12',
                            '"ตรวจการเปลี่ยนแปลง" → ดูราคาเดิม → ใหม่ (Stripe แสดงจำนวนผู้สมัครเดิมด้วย) → ติ๊กยืนยัน → บันทึก',
                            'ระหว่างที่ CapDeal/ทนาย ยังบันทึกผ่าน Stripe ไม่ได้ ปุ่มจะเป็น "บันทึกเป็นร่าง (ยังไม่ใช้จริง)" ร่างเก็บแยกไว้ เว็บยังแสดงและเก็บเงินราคาเดิม ลูกค้าไม่เห็นร่าง',
                            'การ์ดที่มีร่างขึ้นป้าย "ร่าง — ยังไม่ใช้จริง" ช่องราคาแสดงร่าง และใต้ช่องบอก "บนเว็บตอนนี้" ตัวเลขต้นทุน/กำไรคิดจากค่าที่พิมพ์ · กด "ล้างร่าง" เพื่อทิ้งร่าง',
                            'พอตั้ง Stripe แล้ว (เปิด PRICING_WRITE_ENABLED) การ์ดจะบอก "มีราคาร่างค้างอยู่" และเติมช่องจากร่างให้ → ตรวจการเปลี่ยนแปลง → บันทึกตามปกติ ร่างถูกล้างอัตโนมัติเมื่อบันทึกสำเร็จ',
                        ],
                    },
                    {
                        heading: 'แท็บ "จ่ายครั้งเดียว" และ "GP ล่าม"',
                        items: [
                            'แพ็กเครดิต AI: เพิ่ม/ลบแพ็กได้ (รหัส a-z 0-9 _ -) ต้นทุนคิดจากเครดิตทนายที่แพงสุด ค่าธรรมเนียมคิดแบบ Beam บัตร premium และแสดง PromptPay คู่กัน',
                            'E-Book และค่าส่ง: ราคามาตรฐาน (เริ่มต้น ฿199) และค่าส่งหนังสือ (0 = ไม่เก็บ) เว็บยังไม่อ่านค่าสองส่วนนี้',
                            'GP ล่าม: มีผลทันทีกับการจองใหม่บนเว็บจริง งานที่จองแล้วไม่เปลี่ยน แสดงกำไรต่องาน = GP − ค่าธรรมเนียม Beam ของยอดเต็ม',
                        ],
                    },
                    {
                        heading: '"สมมติฐานต้นทุน" (กดเพื่อกาง)',
                        items: [
                            'ค่าเริ่มต้นมาจากไฟล์ LAWSLANE-ต้นทุน-2026-10.xlsx: อัตราแลกเปลี่ยน, เป้า margin, โควตา, จำนวนผู้ใช้ 3 สถานการณ์, ราคาบริการ, ราคาโมเดล AI, token ต่อการเรียก',
                            'แก้แล้วตัวเลขกำไรทุกช่องเปลี่ยนทันที (ยังไม่บันทึก) กด "บันทึกสมมติฐาน" เพื่อเก็บ',
                            'ตัวเลือก "สถานการณ์" ด้านบนเปลี่ยนค่าส่วนกลางต่อบัญชีและคอลัมน์ที่ไฮไลต์ในแท็บต้นทุนระบบ (เริ่มต้น/เติบโต/ขยาย)',
                            'ควรแก้: อัตราแลกเปลี่ยนเดือนละครั้ง · จำนวนผู้ใช้ต่อสถานการณ์ทุกเดือน/ไตรมาส · เป้า margin เมื่อเปลี่ยนนโยบาย · ราคาบริการเมื่อผู้ให้บริการเปลี่ยนราคา',
                            'มีแถวใหม่จากไฟล์: LINE OA, SlipOK, ใบแจ้งหนี้ PDF, SMS OTP, Lalin, AI ของ admin, แพลน Business (ร่าง)',
                            'มีบิลจริงแล้ว ให้ใส่ยอดในแถว "ใช้ยอดจริงแทน" แทนค่าที่คำนวณ',
                        ],
                    },
                ],
                warnings: [
                    'ถ้าขึ้น "ดูได้อย่างเดียว" แปลว่ายังไม่เปิด PRICING_WRITE_ENABLED หรือ Stripe key ไม่พร้อม ล็อกเฉพาะการบันทึกจริงของ CapDeal/ทนาย (ยังบันทึกเป็นร่างได้) ส่วนอื่นยังบันทึกได้',
                    'ป้าย Stripe: test ต้องคู่กับ collection planPricing_test เท่านั้น',
                    'ต้นทุนเป็นค่าประมาณจากราคาประกาศ × สมมติฐาน ไม่ใช่ยอดบิลจริง',
                    'ถ้าขึ้น "มีคนแก้ไปแล้ว โหลดใหม่" ให้โหลดหน้าใหม่แล้วแก้อีกครั้ง · ทุกการบันทึกเก็บประวัติที่ planPricingLogs (uid ผู้แก้เท่านั้น)',
                ],
            },
            en: {
                title: 'Plan pricing and system costs',
                summary: 'One page, two tabs: "ตั้งราคา" (set prices: subscriptions, one-time items, interpreter GP) and "ต้นทุนระบบ" (system costs: the whole Excel cost model in plain language), sharing one scenario selector and one set of cost assumptions. Super Admin only.',
                blocks: [
                    {
                        heading: 'Layout: top tabs + guide + ⓘ buttons',
                        items: [
                            'Top tabs "ตั้งราคา" | "ต้นทุนระบบ" — the open tab is kept in the URL (/pricing?view=costs&section=...) so it survives reload · /pricing/costs jumps to system costs.',
                            'The scenario selector (start/growth/scale) and the "Cost assumptions" box below are shared by both tabs; edits update both immediately without reloading.',
                            '"คู่มือหน้านี้" (expand) explains what the page is, how the numbers flow, what to edit when, and what is live.',
                            'Every editable field has an ⓘ button with four parts: what it is / how it works / when to edit / what changes (which numbers on the page move + real-world effect). For assumptions the affected numbers are derived from the actual model.',
                            'Three real-world badges: "estimate only — no effect on sites" (all assumptions) · "stored, not live yet" (Wittaya, AI Plus, credit packs, E-Book/shipping, drafts) · "live immediately" (CapDeal/lawyer prices saved via Stripe, interpreter GP).',
                            'Every confirm dialog summarises the impact of exactly the fields you changed.',
                            'Every product card states what customers get (real quotas from the code) and where the price is shown, with links to the live pages (new tab); pages that still use a hard-coded price are labelled.',
                        ],
                    },
                    {
                        heading: 'Tab "ต้นทุนระบบ" (8 sub-tabs)',
                        items: [
                            'Overview: 3-scenario table (users, paying accounts, shared infra, total run cost, revenue, gross profit), number-flow diagram and automatic takeaways.',
                            'Per site: each site’s direct cost + shared infra allocated by traffic share, estimated revenue and gross profit (docs/Lalin/Sitthi get no allocation).',
                            'Plan margins: read-only margin table for every plan (incl. Business draft and free tiers); edit prices in the set-prices tab.',
                            'Monthly run cost: every service row, shared vs per site, with totals, fixed/tiered, payment fees, AI and USD.',
                            'Usage volumes / unit costs / vendor prices (yellow ⚠ = unconfirmed) / 13 notes.',
                            'Differences from the Excel file: Stripe fees include 7% VAT and interpreter jobs use the Beam fee instead of Stripe + Connect + ฿10 (VAT = 0 matches the file except the interpreter row).',
                        ],
                    },
                    {
                        heading: 'Tab "Subscriptions"',
                        items: [
                            'CapDeal and Lawyer (Stripe badge): a price change creates a new Stripe Price for new sign-ups only; existing subscribers keep their price.',
                            'Wittaya and Customer AI Plus ("not on sale yet" badge): the price is stored only. Nothing is created in Stripe and no customer is affected.',
                            'Blank = not sold · whole baht 1–1,000,000.',
                            'Under each price, per account per month: AI cost at full/average usage, Stripe fee, infra share, profit and margin, and the minimum price for the target margin. Red = loss.',
                            'Yearly prices pay the fee once a year, divided by 12.',
                            '"ตรวจการเปลี่ยนแปลง" → review old → new (Stripe also shows existing subscribers) → tick → save.',
                            'While CapDeal/Lawyer cannot save through Stripe yet, the button becomes "บันทึกเป็นร่าง (ยังไม่ใช้จริง)" (save as draft). The draft is stored separately; the site keeps showing and charging the current price and customers never see it.',
                            'A card with a draft shows the "ร่าง — ยังไม่ใช้จริง" badge, the fields show the draft and each field shows the live price below it. Cost/margin use the typed values. "ล้างร่าง" discards the draft.',
                            'Once Stripe is set up (PRICING_WRITE_ENABLED on), the card says a draft is pending and prefills the fields from it → preview → save as usual. The draft is cleared automatically when the save succeeds.',
                        ],
                    },
                    {
                        heading: 'Tabs "One-time" and "Interpreter GP"',
                        items: [
                            'AI credit packs: add/remove packs (IDs a-z 0-9 _ -). Cost uses the most expensive lawyer credit; fees use Beam premium card, with PromptPay shown alongside.',
                            'E-Book & shipping: standard price (default ฿199) and book shipping (0 = not charged). Sites do not read these yet.',
                            'Interpreter GP: live immediately for new bookings; existing bookings do not change. Shows profit per job = GP − Beam fee on the full amount.',
                        ],
                    },
                    {
                        heading: '"Cost assumptions" (click to expand)',
                        items: [
                            'Defaults come from LAWSLANE-ต้นทุน-2026-10.xlsx: FX, target margin, quotas, users in 3 scenarios, service prices, AI model prices, tokens per call.',
                            'Edits update every margin immediately (unsaved). Click "บันทึกสมมติฐาน" to keep them.',
                            'The "scenario" selector at the top changes the infra share per account and the highlighted column in system costs (start/growth/scale).',
                            'Edit: FX monthly · users per scenario monthly/quarterly · target margin when policy changes · vendor prices when vendors change them.',
                            'New rows from the file: LINE OA, SlipOK, invoice PDFs, SMS OTP, Lalin, admin AI, Business plans (draft).',
                            'Once real bills exist, enter them in "override with real bill" instead of the computed total.',
                        ],
                    },
                ],
                warnings: [
                    'A "view-only" banner means PRICING_WRITE_ENABLED is off or the Stripe key is not ready. Only real CapDeal/Lawyer saves are locked (drafts still save); other sections still save.',
                    'Stripe "test" must pair with the planPricing_test collection.',
                    'Costs are estimates (list price × assumptions), not real bills.',
                    'If it says someone else changed it, reload and edit again. Every save is logged to planPricingLogs (editor uid only).',
                ],
            },
        },
    ],
};
