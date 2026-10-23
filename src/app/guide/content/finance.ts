import type { GuideGroup } from './types';

export const financeGroup: GuideGroup = {
    id: 'finance',
    title: { th: 'การเงิน', en: 'Finance' },
    sections: [
        {
            id: 'lawyer-payments',
            href: '/lawyer-payments',
            permission: 'financials.verification',
            th: {
                title: 'ค่าทนาย (ตรวจสลิป)',
                summary: 'ลูกความโอนค่าทนายเข้าบัญชีระบบแล้วแนบสลิป (ตั้งแต่ 19 ต.ค. 2569) SlipOK ตรวจผ่านถือว่าจ่ายแล้วทันที ที่ตรวจไม่ได้มารอที่นี่',
                blocks: [
                    {
                        heading: 'ตรวจสลิป (แท็บ "สลิปรอตรวจ")',
                        items: [
                            'เปิดรายการ ดูยอดที่ลูกความจ่าย GP และยอดที่ทนายได้ เทียบกับรูปสลิปและบัญชีธนาคารของระบบ',
                            'ถูกต้อง กด "ยืนยันสลิป (ได้รับเงินแล้ว)" งวด/ค่าบริการในห้องแชทจะขึ้นชำระแล้ว ลูกความและทนายได้แจ้งเตือน',
                            'ไม่ถูกต้อง ใส่หมายเหตุแล้วกด "สลิปไม่ถูกต้อง" ลูกความเห็นหมายเหตุในแชทและแนบสลิปใหม่ได้',
                            'ยืนยันไม่ได้ถ้ายอดในห้องเปลี่ยนไปจากตอนแนบสลิป หรือรายการนั้นชำระไปแล้ว ให้ปฏิเสธแทน',
                        ],
                    },
                    {
                        heading: 'แท็บอื่น',
                        items: [
                            '"รอปิดเคส" เงินที่ชำระแล้วและถือไว้จนทนายปิดเคส',
                            '"รอโอนให้ทนาย" ทนายปิดเคสแล้ว ไปโอนที่เมนู "จ่ายเงินทนาย"',
                            '"รอคืนเงิน" เคสถูกยกเลิกก่อนปิด โอนคืนลูกความเต็มจำนวนนอกระบบ แล้วกรอกเลขอ้างอิงในหน้ารายการ (ต้องมีสิทธิ์ "จ่ายเงินทนาย")',
                        ],
                    },
                ],
                warnings: [
                    'รายการที่ลูกความแจ้งโอนตรงให้ทนายไว้ก่อนเปลี่ยนระบบ ทนายยังยืนยันรับเงินเองได้ รายการเหล่านั้นไม่มี GP และไม่ขึ้นที่หน้านี้',
                    'เมนูตรวจสลิป/ธุรกรรม/ถอนเงิน/คูปอง GP แบบเก่าซ่อนจากเมนูแล้ว เพราะอ่านข้อมูลของระบบเก่าที่ไม่มีใครเขียนแล้ว',
                ],
            },
            en: {
                title: 'Lawyer fees (slip check)',
                summary: 'Clients transfer lawyer fees to the platform account and attach a slip (since 19 Oct 2026). SlipOK-verified slips count as paid immediately; the rest wait here.',
                blocks: [
                    {
                        heading: 'Check slips (tab "สลิปรอตรวจ")',
                        items: [
                            'Open the item and compare the amount the client paid, the GP and the lawyer\'s share with the slip image and the platform bank account.',
                            'If correct, click "ยืนยันสลิป (ได้รับเงินแล้ว)". The installment or fee in the chat becomes paid and both client and lawyer are notified.',
                            'If wrong, add a note and click "สลิปไม่ถูกต้อง". The client sees the note in the chat and can attach a new slip.',
                            'Confirmation is blocked if the amount in the chat changed since the slip was attached, or the item is already paid. Reject instead.',
                        ],
                    },
                    {
                        heading: 'Other tabs',
                        items: [
                            '"รอปิดเคส": paid money held until the lawyer closes the case.',
                            '"รอโอนให้ทนาย": the case is closed; pay the lawyer from "Lawyer payouts".',
                            '"รอคืนเงิน": the case was cancelled before closing. Refund the client in full outside the system, then enter the reference on the item page (needs the lawyer payouts permission).',
                        ],
                    },
                ],
                warnings: [
                    'Items a client notified as paid directly to the lawyer before the switch can still be confirmed by the lawyer. They carry no GP and do not appear here.',
                    'The old slip check, transactions, withdrawals and lawyer GP coupon menus are hidden because they read data the old model no longer writes.',
                ],
            },
        },
        {
            id: 'lawyer-payouts',
            href: '/lawyer-payouts',
            permission: 'financials.lawyerPayouts',
            th: {
                title: 'จ่ายเงินทนาย',
                summary: 'โอนยอดสุทธิ (หลังหัก GP) ให้ทนายของเคสที่ปิดแล้ว และตั้ง GP ค่าทนาย',
                blocks: [
                    {
                        heading: 'โอนเงินให้ทนาย',
                        items: [
                            'แต่ละการ์ดคือทนายหนึ่งคน รวมทุกรายการที่ปิดเคสแล้ว แสดงยอดที่ลูกความจ่าย GP และยอดที่ต้องโอน',
                            'โอนเข้าบัญชีที่แสดงนอกระบบ กรอกเลขอ้างอิง แล้วกด "บันทึกว่าโอนแล้ว" ทนายได้แจ้งเตือน',
                            'ทนายที่ยังไม่ตั้งบัญชีรับเงิน กดบันทึกไม่ได้ ให้ทนายเพิ่มบัญชีในหน้ารายได้ของทนายก่อน',
                        ],
                    },
                    {
                        heading: 'GP ค่าทนาย',
                        items: [
                            'แยกจาก GP ล่าม ค่าเริ่มต้น 10% แก้ได้เฉพาะ Super Admin',
                            'มีผลทันทีกับค่าทนายที่ลูกความชำระใหม่ รายการที่ชำระแล้วใช้ GP ตอนชำระ',
                        ],
                    },
                ],
                warnings: [
                    'ยอดคิดใหม่จากฐานข้อมูลตอนกดบันทึก ถ้ามีรายการเปลี่ยนสถานะระหว่างนั้นจะบันทึกไม่ได้ ให้โหลดหน้าใหม่',
                ],
            },
            en: {
                title: 'Lawyer payouts',
                summary: 'Pay lawyers their net share (after GP) for closed cases, and set the lawyer GP.',
                blocks: [
                    {
                        heading: 'Pay a lawyer',
                        items: [
                            'Each card is one lawyer with every item from closed cases: what clients paid, the GP, and the amount to transfer.',
                            'Transfer to the account shown outside the system, enter the reference, and click "บันทึกว่าโอนแล้ว". The lawyer is notified.',
                            'If the lawyer has no payout account, saving is blocked. Ask the lawyer to add one on their earnings page first.',
                        ],
                    },
                    {
                        heading: 'Lawyer GP',
                        items: [
                            'Separate from the interpreter GP. Default 10%; only a Super Admin can change it.',
                            'Applies immediately to new lawyer-fee payments. Existing payments keep the GP from when they were paid.',
                        ],
                    },
                ],
                warnings: [
                    'Totals are recalculated from the database when you save. If an item changed status meanwhile, saving fails; reload the page.',
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
                    {
                        heading: 'ส่งไป Google Sheet (ทางเดียว: หน้านี้ → Sheet)',
                        items: [
                            'แถบบนหัวหน้า: ปุ่ม "ส่งไป Google Sheet" + ลิงก์ "เปิด Google Sheet ↗" + เวลา/ผู้ส่งล่าสุด · หน้านี้เป็นต้นฉบับ แก้ใน Sheet แล้วไม่กลับมาที่นี่ และจะถูกเขียนทับรอบถัดไป',
                            'ส่งเฉพาะช่องตัวเลขสีน้ำเงินของ Sheet (หน้า สมมติฐาน / ราคาบริการ / ต้นทุนต่อหน่วย) จากค่าที่ "บันทึกแล้ว" + ราคาแพลนที่เว็บใช้จริง (ไม่ใช่ร่าง) + GP ล่าม · สูตรใน Sheet คำนวณหน้าที่เหลือเอง',
                            'ช่องที่มีเฉพาะในหลังบ้าน (VAT บนค่าธรรมเนียม, อัตรา Beam, "ใช้ยอดจริงแทน", ราคา typhoon) มีป้าย "ไม่มีช่องใน Sheet" และไม่ถูกส่ง',
                            'ก่อนเขียนระบบอ่าน Sheet มาตรวจ: ถ้าช่องที่จะเขียนกลายเป็นสูตร หรือมีคนแทรก/ลบแถว จะไม่เขียนเลยสักช่องและบอกว่าแถวไหนไม่ตรง · กดได้ห่างกันอย่างน้อย 30 วินาที · ทุกครั้งที่ส่งสำเร็จเก็บใน planPricingLogs (จำนวนช่อง + uid ไม่เก็บค่า)',
                            'ตั้งครั้งแรก (ทำครั้งเดียว): 1) Google Cloud Console โปรเจกต์เดียวกับ Firebase › APIs & Services › เปิด "Google Sheets API"',
                            '2) IAM & Admin › Service Accounts › สร้างบัญชีใหม่ (เช่น cost-sheet-sync ไม่ต้องให้ role) › Keys › Add key › JSON — หรือใช้ service account ของ Firebase Admin ที่มีอยู่แล้วก็ได้ (ไม่ต้องสร้าง key ใหม่)',
                            '3) เปิด Sheet › แชร์ › ใส่อีเมล service account (client_email ในไฟล์ JSON) เป็น "ผู้แก้ไข" · การแชร์ "ทุกคนที่มีลิงก์ดูได้" คงไว้เหมือนเดิม',
                            '4) Vercel › โปรเจกต์ admin › Settings › Environment Variables: COST_SHEET_ID (ส่วนระหว่าง /d/ กับ /edit ในลิงก์), GOOGLE_SHEETS_CLIENT_EMAIL, GOOGLE_SHEETS_PRIVATE_KEY (private_key ทั้งก้อนรวม BEGIN/END) — ถ้าใช้บัญชี Firebase Admin ไม่ต้องตั้งสองตัวหลัง · ถ้าอยากให้ส่งเองหลังบันทึกทุกครั้ง ตั้ง COST_SHEET_AUTO_EXPORT=true › Redeploy',
                            '5) เปิดหน้านี้ กด "ส่งไป Google Sheet" แล้วกด "เปิด Google Sheet" ดูว่าตัวเลขขึ้น · ส่งอัตโนมัติแล้วไม่สำเร็จ การบันทึกยังสำเร็จ แค่ขึ้นแจ้งเตือนสีแดง',
                        ],
                    },
                ],
                warnings: [
                    'ถ้าขึ้น "ดูได้อย่างเดียว" แปลว่ายังไม่เปิด PRICING_WRITE_ENABLED หรือ Stripe key ไม่พร้อม ล็อกเฉพาะการบันทึกจริงของ CapDeal/ทนาย (ยังบันทึกเป็นร่างได้) ส่วนอื่นยังบันทึกได้',
                    'ป้าย Stripe: test ต้องคู่กับ collection planPricing_test เท่านั้น',
                    'ต้นทุนเป็นค่าประมาณจากราคาประกาศ × สมมติฐาน ไม่ใช่ยอดบิลจริง',
                    'ถ้าขึ้น "มีคนแก้ไปแล้ว โหลดใหม่" ให้โหลดหน้าใหม่แล้วแก้อีกครั้ง · ทุกการบันทึกเก็บประวัติที่ planPricingLogs (uid ผู้แก้เท่านั้น)',
                    'Google Sheet ต้นทุนแชร์แบบ "ทุกคนที่มีลิงก์ดูได้" — ใครได้ลิงก์ก็เห็นต้นทุน ราคา และกำไรทั้งหมด อย่าโพสต์ลิงก์ในที่สาธารณะ · id ของ Sheet และ private key อยู่ใน env ของ Vercel เท่านั้น ห้ามใส่ในโค้ด (repo เป็น public)',
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
                    {
                        heading: 'Send to Google Sheet (one-way: this page → Sheet)',
                        items: [
                            'Bar at the top of the page: "ส่งไป Google Sheet" button + "เปิด Google Sheet ↗" link + last sent time/by. This page is the source of truth; edits made in the Sheet never come back and are overwritten next time.',
                            'Only the Sheet\'s blue input cells (tabs สมมติฐาน / ราคาบริการ / ต้นทุนต่อหน่วย) are written, from SAVED values + the live plan prices (not drafts) + interpreter GP. Sheet formulas recompute everything else.',
                            'Admin-only fields (VAT on fees, Beam rates, real-bill override, typhoon prices) are tagged "ไม่มีช่องใน Sheet" (not in Sheet) and are not sent.',
                            'Before writing it reads the Sheet: if a target cell became a formula or rows were inserted/deleted, nothing is written and the mismatched rows are listed. At most once every 30 seconds. Each successful send is logged in planPricingLogs (cell count + uid, no values).',
                            'One-time setup: 1) Google Cloud Console, same project as Firebase › APIs & Services › enable "Google Sheets API".',
                            '2) IAM & Admin › Service Accounts › create one (e.g. cost-sheet-sync, no roles needed) › Keys › Add key › JSON — or reuse the existing Firebase Admin service account (no new key needed).',
                            '3) Open the Sheet › Share › add the service account email (client_email in the JSON) as Editor. Keep the existing "anyone with the link can view" sharing.',
                            '4) Vercel › admin project › Settings › Environment Variables: COST_SHEET_ID (the part between /d/ and /edit in the link), GOOGLE_SHEETS_CLIENT_EMAIL, GOOGLE_SHEETS_PRIVATE_KEY (the whole private_key incl. BEGIN/END) — skip the last two when reusing the Firebase Admin account · set COST_SHEET_AUTO_EXPORT=true to send after every save › Redeploy.',
                            '5) Open this page, click "ส่งไป Google Sheet", then "เปิด Google Sheet" to check. If an automatic send fails, the save still succeeds; you only get a red notice.',
                        ],
                    },
                ],
                warnings: [
                    'A "view-only" banner means PRICING_WRITE_ENABLED is off or the Stripe key is not ready. Only real CapDeal/Lawyer saves are locked (drafts still save); other sections still save.',
                    'Stripe "test" must pair with the planPricing_test collection.',
                    'Costs are estimates (list price × assumptions), not real bills.',
                    'If it says someone else changed it, reload and edit again. Every save is logged to planPricingLogs (editor uid only).',
                    'The cost Google Sheet is shared as "anyone with the link can view" — whoever has the link sees all costs, prices and margins; never post the link publicly. The Sheet id and private key live only in Vercel env vars, never in code (the repo is public).',
                ],
            },
        },
    ],
};
