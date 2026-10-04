import type { GuideGroup } from './types';

export const usersGroup: GuideGroup = {
    id: 'users',
    title: { th: 'จัดการผู้ใช้งาน', en: 'User management' },
    sections: [
        {
            id: 'customers',
            href: '/customers',
            permission: 'users.customers',
            th: {
                title: 'ลูกค้า',
                summary: 'ค้นหาและดูข้อมูลลูกค้า ประวัติเคส แก้ข้อมูลติดต่อ และระงับบัญชี',
                blocks: [
                    {
                        heading: 'รายการลูกค้า',
                        items: [
                            'แท็บ "ทั้งหมด" / "Active" / "Suspended" และตัวกรอง "บุคคลทั่วไป" / "SME"',
                            'ช่องค้นหาค้นจากต้นชื่อ เช่นพิมพ์ "สม" จะเจอ "สมชาย" (ลูกค้าเก่าบางรายอาจค้นไม่เจอ ให้หาผ่านหน้าอื่นที่ลิงก์มา)',
                            '"Export" ดาวน์โหลด CSV เฉพาะหน้าที่แสดงอยู่ (25 แถว) ไม่ใช่ทั้งหมด',
                            'เมนู ⋯ → "ดูโปรไฟล์" หรือ "แก้ไขข้อมูล"',
                        ],
                    },
                    {
                        heading: 'หน้าโปรไฟล์',
                        items: [
                            'ดูจำนวนเคส ประวัติเคส (กดชื่อเคสเพื่อเปิดแชทบนเว็บหลักแบบแอดมิน) และข้อมูลติดต่อ',
                            '"ระงับบัญชี" / "ยกเลิกระงับบัญชี" เปลี่ยนสถานะลูกค้า',
                        ],
                    },
                    {
                        heading: 'เฉพาะ Super Admin',
                        items: [
                            '"ตั้งสิทธิ์" เปลี่ยนบทบาทเป็นลูกค้า / ทนายความ / แอดมิน',
                            '"ลบบัญชีถาวร" ลบทั้งข้อมูลและบัญชีล็อกอิน กู้คืนไม่ได้',
                        ],
                    },
                ],
                warnings: [
                    '"เพิ่มลูกค้า" สร้างแค่ระเบียนข้อมูล ไม่ได้สร้างบัญชีล็อกอิน รหัสผ่านที่กรอกไม่ถูกใช้ ให้ลูกค้าสมัครเองที่เว็บหลัก',
                    'ห้ามใช้ "ตั้งสิทธิ์ → แอดมิน" เพื่อเพิ่มแอดมิน เพราะจะได้สิทธิ์เข้าหลังบ้านโดยไม่ผ่านการกำหนดสิทธิ์ ให้ใช้หน้า "จัดการผู้ดูแลระบบ" แทน',
                    'กล่อง "หมายเหตุสำหรับแอดมิน" ยังไม่บันทึกจริง และ "ยอดใช้จ่ายรวม" เป็นค่าประมาณ ไม่ใช่ยอดจริง',
                    'การระงับบัญชีเปลี่ยนสถานะในระบบ แต่ไม่ได้ปิดบัญชีล็อกอินโดยตรง',
                ],
            },
            en: {
                title: 'Customers',
                summary: 'Find and view customers, their case history and contact details, and suspend accounts.',
                blocks: [
                    {
                        heading: 'Customer list',
                        items: [
                            'Tabs All / Active / Suspended, and the Individual / SME filter.',
                            'Search matches the start of a name (typing "สม" finds "สมชาย"). Some older customers may not be found; reach them from a linked page instead.',
                            '"Export" downloads a CSV of the visible page only (25 rows), not everyone.',
                            'Row menu ⋯ → view profile or edit.',
                        ],
                    },
                    {
                        heading: 'Profile page',
                        items: [
                            'See case count, case history (click a case title to open its chat on the main site in admin view) and contact details.',
                            '"ระงับบัญชี" / "ยกเลิกระงับบัญชี" changes the customer status.',
                        ],
                    },
                    {
                        heading: 'Super Admin only',
                        items: [
                            '"ตั้งสิทธิ์" changes the role to customer / lawyer / admin.',
                            '"ลบบัญชีถาวร" deletes both the data and the login account. It cannot be undone.',
                        ],
                    },
                ],
                warnings: [
                    '"Add customer" only creates a data record, not a login account. The password field is ignored; customers should sign up on the main site.',
                    'Do not use "Set role → Admin" to add admins: it grants back-office access without per-menu permissions. Use "Administrators" instead.',
                    'The "Admin notes" box does not save yet, and "Total spent" is an estimate, not real payment data.',
                    'Suspending changes the status in the system but does not directly disable the login account.',
                ],
            },
        },
        {
            id: 'customer-plans',
            href: '/customer-plans',
            permission: 'customers.plans',
            th: {
                title: 'แพ็กเกจ Lawslane AI (ลูกค้า)',
                summary: 'กำหนดเครดิต Lawslane AI ต่อเดือนของแต่ละแพ็กเกจ และมอบแพ็กเกจ Plus ให้ลูกค้ารายคน',
                blocks: [
                    {
                        heading: 'แท็บ "สิทธิ์ของแต่ละแพ็กเกจ"',
                        items: [
                            'แพ็กเกจ Free และ Plus มีช่อง "เครดิต Lawslane AI (ต่อเดือน)" ติ๊ก "ไม่จำกัด" ได้',
                            'เครดิตรีเซ็ตทุกเดือนตามเวลาไทย',
                            'แก้ตัวเลขแล้วกด "บันทึก" มีผลกับลูกค้าทุกคนในแพ็กเกจนั้น ปุ่ม "ใช้ค่าเริ่มต้น" แค่เติมค่าในฟอร์ม ต้องกดบันทึกอีกครั้ง',
                        ],
                    },
                    {
                        heading: 'แท็บ "ลูกค้ารายคน"',
                        items: [
                            'ค้นหาลูกค้าด้วยอีเมลหรือ UID แบบตรงตัว',
                            '"มอบแพ็กเกจ" → เลือกแพ็กเกจ → "ใช้ได้ถึง" (เว้นว่าง = ไม่มีกำหนด หมดสิ้นวันนั้นตามเวลาไทย) → ใส่หมายเหตุเหตุผลที่มอบ',
                            'ถังขยะ = ถอนแพ็กเกจ ลูกค้ากลับไปใช้แพ็กเกจเดิมทันที',
                        ],
                    },
                ],
                warnings: [
                    'ยังไม่มีระบบซื้อเครดิต การมอบที่หน้านี้เป็นทางเดียวที่ลูกค้าจะได้ Plus',
                    'ทุกการมอบและถอนถูกบันทึกชื่อแอดมินไว้ ใส่หมายเหตุให้ชัดเสมอ',
                ],
            },
            en: {
                title: 'Lawslane AI plans (customers)',
                summary: 'Set the monthly Lawslane AI credits for each plan, and grant Plus to individual customers.',
                blocks: [
                    {
                        heading: 'Tab "What each plan gets"',
                        items: [
                            'Free and Plus each have a monthly Lawslane AI credit field; tick "Unlimited" if needed.',
                            'Credits reset monthly on Thai time.',
                            'Change a number and click Save; it applies to every customer on that plan. "Use defaults" only fills the form; you still need to Save.',
                        ],
                    },
                    {
                        heading: 'Tab "Individual customers"',
                        items: [
                            'Search by exact email or UID.',
                            '"มอบแพ็กเกจ" → choose a plan → "Valid until" (blank = no end; it ends at the end of that day, Thai time) → add a note with the reason.',
                            'The trash icon revokes the grant; the customer drops back to their own plan immediately.',
                        ],
                    },
                ],
                warnings: [
                    'There is no credit purchase yet, so a grant here is the only way a customer gets Plus.',
                    'Every grant and revoke records the admin who did it. Always write a clear note.',
                ],
            },
        },
        {
            id: 'lawyers',
            href: '/lawyers',
            permission: 'users.lawyers',
            th: {
                title: 'ทนายความ',
                summary: 'ตรวจใบสมัครทนาย อนุมัติ/ปฏิเสธ/ระงับ แก้ข้อมูลโปรไฟล์ และมอบคูปอง GP',
                blocks: [
                    {
                        heading: 'ตรวจใบสมัครใหม่',
                        items: [
                            'เปิดแท็บ "รอตรวจสอบ" (หรือการ์ด "ทนายรออนุมัติ" บนแดชบอร์ด) แล้ว "ดูโปรไฟล์"',
                            'ตรวจ "เอกสารประกอบการสมัคร": ใบอนุญาตว่าความ และสำเนาบัตรประชาชน ป้าย "สมัครแบบด่วน (Express)" แปลว่ายังไม่มีเอกสาร',
                            'เทียบเลขใบอนุญาตกับหน้า "ฐานข้อมูลทนาย" ถ้าขึ้นกล่อง "พบข้อมูลทนายความซ้ำซ้อน" ให้ตรวจว่าเป็นคนเดียวกันหรือไม่',
                            'เมนู "การดำเนินการ" → "อนุมัติ" หรือ "ปฏิเสธ" (ต้องใส่เหตุผล)',
                        ],
                    },
                    {
                        heading: 'แก้ไขโปรไฟล์',
                        items: [
                            '"แก้ไขข้อมูล" แก้ชื่อ ความเชี่ยวชาญ ช่องทางติดต่อ บัญชีธนาคาร และอัปโหลดเอกสารแทนทนายได้',
                            'ปุ่ม "แปลอัตโนมัติ" แปลข้อความไทยเป็นอังกฤษ/จีนด้วย AI ตรวจคำแปลก่อนบันทึก',
                            'ไฟล์ที่อัปโหลดจะยังไม่ผูกกับโปรไฟล์จนกว่าจะกด "บันทึก"',
                        ],
                    },
                    {
                        heading: 'คูปอง GP',
                        items: [
                            'การ์ด "ค่า GP และคูปองพิเศษ" → "มอบหมายคูปอง GP" เลือกคูปองที่สร้างไว้ในเมนู "คูปอง GP ทนาย"',
                        ],
                    },
                ],
                warnings: [
                    'การเปลี่ยนสถานะไม่ส่งอีเมลหรือแจ้งเตือนทนายอัตโนมัติ ตอนปฏิเสธระบบจะเปิดโปรแกรมอีเมลของคุณพร้อมข้อความร่าง ต้องกดส่งเอง',
                    '"อนุมัติ" / "ย้ายไปรอตรวจสอบ" / "ระงับการใช้งาน" ในหน้าโปรไฟล์มีผลทันทีโดยไม่ถามยืนยัน',
                    'ห้ามแต่งหรือเดาเลขใบอนุญาต ต้องมาจากเอกสารจริงหรือทนายกรอกเอง ไม่มีให้เว้นว่าง',
                    '"ลบทนายความ" ลบเฉพาะโปรไฟล์ทนาย กู้คืนไม่ได้ (บัญชีผู้ใช้ยังอยู่)',
                    '"เพิ่มทนายความ" สร้างแค่ระเบียนโปรไฟล์ ไม่ได้สร้างบัญชีล็อกอิน ให้ทนายสมัครเองที่เว็บหลัก',
                    'ช่อง "หมายเหตุสำหรับแอดมิน" ยังไม่บันทึกจริง',
                ],
            },
            en: {
                title: 'Lawyers',
                summary: 'Review lawyer applications, approve, reject or suspend, edit profiles and assign GP coupons.',
                blocks: [
                    {
                        heading: 'Review a new application',
                        items: [
                            'Open the "Pending" tab (or the dashboard card) and view the profile.',
                            'Check the application documents: practising licence and ID card copy. The "Express" badge means no documents were submitted.',
                            'Compare the licence number with the Lawyer Registry. If the "duplicate lawyer" alert appears, check whether it is the same person.',
                            'Actions menu → approve, or reject (a reason is required).',
                        ],
                    },
                    {
                        heading: 'Edit a profile',
                        items: [
                            'Edit name, specialties, contact details, bank account, and upload documents on the lawyer\'s behalf.',
                            '"แปลอัตโนมัติ" translates Thai text to English/Chinese with AI. Check the translation before saving.',
                            'Uploaded files are not attached to the profile until you click Save.',
                        ],
                    },
                    {
                        heading: 'GP coupons',
                        items: [
                            'In the "GP and special coupons" card, click "มอบหมายคูปอง GP" and choose a coupon created under "Lawyer GP Coupons".',
                        ],
                    },
                ],
                warnings: [
                    'Status changes do not email or notify the lawyer. On reject, your own mail app opens with a draft; you must send it yourself.',
                    'Approve / move to pending / suspend on the profile page apply immediately, with no confirmation.',
                    'Never invent or guess a licence number. It must come from a real document or the lawyer; leave it blank otherwise.',
                    '"Delete lawyer" removes only the lawyer profile and cannot be undone (the user account stays).',
                    '"Add lawyer" only creates a profile record, not a login account. Lawyers should sign up on the main site.',
                    'The "Admin notes" box does not save yet.',
                ],
            },
        },
        {
            id: 'lawyer-registry',
            href: '/lawyer-registry',
            permission: 'users.registry',
            th: {
                title: 'ฐานข้อมูลทนาย',
                summary: 'ฐานข้อมูลเลขใบอนุญาตที่ใช้ยืนยันว่าทนายมีตัวตนจริง เติมได้จากเอกสาร ประกาศสภาทนายความ และใบสมัคร',
                blocks: [
                    {
                        heading: 'นำเข้าจากรูปภาพ (OCR)',
                        items: [
                            '"นำเข้าจากรูปภาพ (OCR)" → อัปโหลดรูป JPG/PNG/WebP (ไม่เกิน 10MB ต่อไฟล์) → "ดึงข้อมูลจากเอกสาร"',
                            'ตรวจตารางที่ AI อ่านได้ทีละแถว แก้คำนำหน้า ชื่อ สกุล เลขใบอนุญาต เพิ่มหรือลบแถวได้',
                            'กด "Import เข้าระบบ" ผลจะแสดงจำนวนสำเร็จ / ซ้ำ (ข้าม) / ผิดพลาด',
                            'เลขใบอนุญาตต้องอยู่ในรูป เลข/ปี พ.ศ. ถ้าเอกสารไม่มีเลข ให้เว้นว่าง ระบบจะบันทึกเป็นรายชื่อจากประกาศ',
                        ],
                    },
                    {
                        heading: 'ตรวจและประกาศสภาทนายความ',
                        items: [
                            '"ตรวจเลขใบอนุญาต" รวมเลขที่ยังไม่ยืนยัน ให้ยืนยัน แก้ หรือเอาเลขออก',
                            '"ประกาศสภาทนายความ" ระบบดึงประกาศมาให้ทุกวัน แอดมินต้องกด "นำเข้า" เอง (ประกาศไม่มีเลขใบอนุญาต)',
                        ],
                    },
                    {
                        heading: 'แก้ทีละรายการ',
                        items: [
                            'รายการแสดง 50 ระเบียนที่อัปเดตล่าสุด ช่องค้นหาค้นได้เฉพาะใน 50 รายการนี้',
                            '"แก้ไข" เปลี่ยนชื่อ จังหวัด สถานะ ได้ (เปลี่ยนเลขใบอนุญาตในหน้าแก้ไขไม่ได้เปลี่ยนรหัสระเบียน)',
                        ],
                    },
                ],
                warnings: [
                    'ห้ามแต่งเลขใบอนุญาต ใช้เฉพาะเลขจากเอกสารจริง',
                    '"เพิ่มข้อมูลด้วยตนเอง" และนำเข้า CSV จะเขียนทับระเบียนเดิมที่เลขใบอนุญาตตรงกัน และ CSV ที่สถานะไม่ใช่ active จะถูกบันทึกเป็น "ถูกระงับ"',
                    '"ซิงค์ข้อมูลจากใบสมัคร" เขียนทับสถานะตามสถานะใบสมัคร อาจทับสถานะที่แอดมินตั้งไว้',
                    'รายชื่อที่นำเข้าจากประกาศ (ไม่มีเลขใบอนุญาต) ขณะนี้แสดงสถานะเป็น "ลบชื่อออก" ซึ่งไม่ถูกต้อง อย่าตีความว่าถูกลบชื่อจริง',
                    'อัปโหลด PDF ในการ์ดนำเข้ายังไม่นำเข้าข้อมูล ใช้ OCR จากรูปแทน',
                ],
            },
            en: {
                title: 'Lawyer registry',
                summary: 'The licence-number database used to verify that lawyers are real. It is filled from documents, Lawyers Council announcements and applications.',
                blocks: [
                    {
                        heading: 'Import from images (OCR)',
                        items: [
                            '"นำเข้าจากรูปภาพ (OCR)" → upload JPG/PNG/WebP (max 10MB each) → "ดึงข้อมูลจากเอกสาร".',
                            'Check the AI-read table row by row; fix title, first name, last name and licence number, or add/remove rows.',
                            'Click "Import". The result shows succeeded / duplicates skipped / errors.',
                            'Licence numbers must look like number/Buddhist-era year. If the document has no number, leave it blank; the record is saved as an announcement entry.',
                        ],
                    },
                    {
                        heading: 'Review and Council announcements',
                        items: [
                            '"ตรวจเลขใบอนุญาต" lists unconfirmed numbers to confirm, correct or remove.',
                            '"ประกาศสภาทนายความ": announcements are fetched daily; an admin must click Import. Announcements carry no licence numbers.',
                        ],
                    },
                    {
                        heading: 'Edit one record',
                        items: [
                            'The list shows the 50 most recently updated records; search only covers those 50.',
                            '"แก้ไข" changes name, province and status. Changing the licence number there does not change the record ID.',
                        ],
                    },
                ],
                warnings: [
                    'Never invent licence numbers. Use only numbers from real documents.',
                    'Manual add and CSV import overwrite an existing record with the same licence number, and CSV rows not marked active are saved as suspended.',
                    '"Sync from applications" overwrites status from the application status and may replace a status an admin set.',
                    'Entries imported from announcements (no licence number) currently display as "Struck off". That label is wrong; they have not been struck off.',
                    'PDF upload in the import card does not import data. Use image OCR instead.',
                ],
            },
        },
        {
            id: 'lawyer-plans',
            href: '/lawyer-plans',
            permission: 'lawyers.plans',
            th: {
                title: 'แพลนและสิทธิ์ทนาย',
                summary: 'กำหนดว่าแพลน ฟรี / Pro / บริษัท ได้ฟีเจอร์อะไร และมอบแพลนให้ทนายรายคน',
                blocks: [
                    {
                        heading: 'สิทธิ์ของแต่ละแพลน',
                        items: [
                            'ช่อง: จัดการคดี, ใบแจ้งหนี้, ผู้ช่วย AI งานคดี, เครดิต AI ต่อเดือน, เผยแพร่หน้าเว็บส่วนตัว',
                            'แก้แล้วกด "บันทึก" มีผลกับทนายทุกคนในแพลนนั้น',
                        ],
                    },
                    {
                        heading: 'ทนายรายคน',
                        items: [
                            'ค้นหาด้วยอีเมล UID รหัสโปรไฟล์ หรือต้นชื่อ',
                            '"มอบแพ็กเกจ" เลือกแพลน วันหมดอายุ และหมายเหตุ ถังขยะ = ถอน',
                            'ทนายได้แพลนที่สูงกว่าระหว่างแพลนที่จ่ายผ่าน Stripe กับแพลนที่แอดมินมอบ',
                        ],
                    },
                ],
                warnings: [
                    'การมอบหรือถอนแพลนไม่ยกเลิกหรือเปลี่ยนการเรียกเก็บเงินใน Stripe ถ้าต้องหยุดเก็บเงินต้องทำที่ Stripe แยก',
                ],
            },
            en: {
                title: 'Lawyer plans',
                summary: 'Set what Free / Pro / Firm plans include, and grant plans to individual lawyers.',
                blocks: [
                    {
                        heading: 'What each plan gets',
                        items: [
                            'Fields: case management, invoices, AI case assistant, monthly AI credits, personal web page.',
                            'Edit and click Save; it applies to every lawyer on that plan.',
                        ],
                    },
                    {
                        heading: 'Individual lawyers',
                        items: [
                            'Search by email, UID, profile ID or the start of a name.',
                            '"มอบแพ็กเกจ": choose plan, expiry and note. Trash icon = revoke.',
                            'A lawyer gets the higher of their Stripe plan and the granted plan.',
                        ],
                    },
                ],
                warnings: [
                    'Granting or revoking does not cancel or change Stripe billing. To stop billing, do it in Stripe separately.',
                ],
            },
        },
        {
            id: 'interpreters',
            href: '/interpreters',
            permission: 'users.interpreters',
            th: {
                title: 'ล่าม',
                summary: 'ตรวจใบสมัครล่าม อนุมัติ ปฏิเสธ หรือระงับ และบันทึกเอกสารที่ตรวจแล้ว',
                blocks: [
                    {
                        heading: 'ขั้นตอนตรวจ',
                        items: [
                            'แท็บ "รออนุมัติ" → เปิดใบสมัคร',
                            'ตรวจ "ข้อมูลส่วนตัวและเอกสาร": บัตรประชาชน/พาสปอร์ต และใบรับรอง (ลิงก์เอกสารหมดอายุใน 15 นาที ถ้าเปิดไม่ได้ให้รีเฟรชหน้า)',
                            'กรอก "เอกสารที่ตรวจแล้ว" คั่นด้วยจุลภาค อย่างน้อยหนึ่งรายการ ล่ามจะได้ป้าย "ตรวจสอบเอกสารแล้ว" บนโปรไฟล์สาธารณะ',
                            'กด "อนุมัติ" หรือ "ปฏิเสธ" (ต้องใส่ "เหตุผล" ซึ่งล่ามจะเห็น)',
                        ],
                    },
                    {
                        heading: 'สถานะ',
                        items: [
                            '"รออนุมัติ" → "อนุมัติแล้ว" หรือ "ไม่ผ่าน"',
                            'ล่ามที่อนุมัติแล้วสั่ง "ระงับ" ได้ (ต้องใส่เหตุผล) และอนุมัติกลับได้ภายหลัง',
                        ],
                    },
                ],
                warnings: [
                    'อนุมัติและปฏิเสธจะส่งอีเมลและแจ้งเตือนถึงล่ามทันที การระงับส่งเฉพาะแจ้งเตือนในระบบ',
                ],
            },
            en: {
                title: 'Interpreters',
                summary: 'Review interpreter applications, approve, reject or suspend, and record which documents were verified.',
                blocks: [
                    {
                        heading: 'Review steps',
                        items: [
                            'Tab "Pending" → open the application.',
                            'Check the private details and documents: ID card/passport and certificates. Document links expire after 15 minutes; refresh the page if one will not open.',
                            'Fill "Verified documents" (comma-separated, at least one) so the interpreter gets the "Documents verified" badge on their public profile.',
                            'Click approve, or reject (a reason is required and the interpreter sees it).',
                        ],
                    },
                    {
                        heading: 'Statuses',
                        items: [
                            'Pending → Approved or Rejected.',
                            'Approved interpreters can be suspended (reason required) and approved again later.',
                        ],
                    },
                ],
                warnings: [
                    'Approve and reject email and notify the interpreter immediately. Suspend only sends an in-app notification.',
                ],
            },
        },
    ],
};
