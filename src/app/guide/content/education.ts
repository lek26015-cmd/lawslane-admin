import type { GuideGroup } from './types';

export const educationGroup: GuideGroup = {
    id: 'education',
    title: { th: 'การศึกษา (Lawslane Wittaya)', en: 'Education (Lawslane Wittaya)' },
    sections: [
        {
            id: 'exam-import',
            href: '/education/exams/import',
            permission: 'education.exams',
            th: {
                title: 'นำเข้าข้อสอบจากไฟล์ (OCR)',
                summary: 'วิธีหลักในการเพิ่มข้อสอบเก่า: อัปโหลด PDF หรือรูป ให้ AI อ่านและแยกข้อ ตรวจ แล้วเผยแพร่',
                blocks: [
                    {
                        heading: '1. ข้อมูลและไฟล์',
                        items: [
                            'ข้อสอบ → "นำเข้าข้อสอบ (OCR)" กรอกชื่อวิชา รหัสวิชา (เช่น LAW2001 ใช้จัดชั้นปี) ภาค/ปีการศึกษา เวลา และคะแนนผ่าน',
                            'ลากไฟล์ PDF หรือรูป (JPG/PNG/WEBP/HEIC) รวมไม่เกิน 40 หน้า เรียงลำดับไฟล์ด้วย ↑/↓',
                            'กด "เริ่มอ่านข้อสอบ" ถ้าระบบพบชุดที่อาจซ้ำ ต้องติ๊ก "ยืนยันว่าเป็นข้อสอบคนละชุด" จึงไปต่อได้',
                        ],
                    },
                    {
                        heading: '2. อ่านข้อความรายหน้า',
                        items: [
                            'ระบบใช้ข้อความในไฟล์ถ้าอ่านได้ดี ไม่อย่างนั้นใช้ OCR ทีละหน้า',
                            'หน้าที่ขึ้น "ภาษาผิดปกติ" ให้กด "OCR ใหม่" หรือแก้ข้อความในช่องเอง',
                        ],
                    },
                    {
                        heading: '3. แยกข้อและบันทึก',
                        items: [
                            'กด "แยกข้อด้วย AI" ตรวจทีละข้อ: ประเภท (ปรนัย/อัตนัย) ตัวเลือก คำตอบที่ถูก ธงคำตอบ เอกสารแนบ',
                            'ใช้ "รวมกับข้อก่อน" เมื่อ AI ตัดข้อผิด และเอาติ๊กออกสำหรับข้อที่ไม่ต้องบันทึก',
                            'กด "บันทึกเป็นแบบร่าง" ระบบพาไปหน้าตรวจ OCR ต่อ',
                        ],
                    },
                    {
                        heading: '4. ตรวจ OCR และเผยแพร่',
                        items: [
                            'หน้าตรวจแสดงภาพสแกนคู่กับข้อความ แก้ข้อความแล้วกด "บันทึก" ทีละข้อ',
                            'ข้ออัตนัยที่ไม่มีธง กด "สร้างธงคำตอบด้วย AI" (บันทึกทันที ตรวจทานทุกครั้ง)',
                            'เมื่อไม่มีข้อติดปัญหาแล้ว กด "ไปหน้าเผยแพร่" → "เผยแพร่" นักเรียนจึงจะเห็นข้อสอบ',
                        ],
                    },
                ],
                warnings: [
                    'เผยแพร่ไม่ได้ถ้ายังมีข้อที่ "ต้องแก้ก่อนเผยแพร่" แก้ในหน้าตรวจ OCR ให้หมดก่อน',
                    'ปุ่ม "Re-OCR" อ่านทั้งหน้าใหม่แทนที่ข้อความในช่อง ต้องกด "บันทึก" จึงมีผล',
                    'ตัวเลือกและคำตอบที่ถูกของข้อปรนัยแก้ในหน้าตรวจไม่ได้ ต้องแก้ในหน้าแก้ไขข้อสอบ',
                ],
            },
            en: {
                title: 'Import exams from files (OCR)',
                summary: 'The main way to add past exams: upload a PDF or images, let AI read and split the questions, review, then publish.',
                blocks: [
                    {
                        heading: '1. Details and files',
                        items: [
                            'Exams → "นำเข้าข้อสอบ (OCR)". Enter subject name, subject code (e.g. LAW2001, sets the year), term/year, time and pass mark.',
                            'Drop PDFs or images (JPG/PNG/WEBP/HEIC), up to 40 pages in total. Reorder with ↑/↓.',
                            'Click "เริ่มอ่านข้อสอบ". If possible duplicates are found, tick "these are different exams" to continue.',
                        ],
                    },
                    {
                        heading: '2. Read each page',
                        items: [
                            'The file\'s own text is used when it reads well; otherwise each page is OCR\'d.',
                            'For pages flagged with garbled language, click "OCR ใหม่" or fix the text yourself.',
                        ],
                    },
                    {
                        heading: '3. Split and save',
                        items: [
                            'Click "แยกข้อด้วย AI" and check each question: type, options, correct answer, model answer, attachments.',
                            'Use "merge with previous" when AI split a question wrongly; untick questions you do not want saved.',
                            'Click "บันทึกเป็นแบบร่าง". You are taken to the OCR review page.',
                        ],
                    },
                    {
                        heading: '4. Review and publish',
                        items: [
                            'The review page shows the scan beside the text. Fix text and click Save per question.',
                            'For essay questions without a model answer, click "สร้างธงคำตอบด้วย AI" (saved immediately; always proofread).',
                            'When no blocking issues remain, click "ไปหน้าเผยแพร่" → "เผยแพร่". Only then do students see it.',
                        ],
                    },
                ],
                warnings: [
                    'Publishing is refused while any question is flagged "must fix before publishing". Clear them on the review page first.',
                    '"Re-OCR" replaces the text box with a fresh read of the whole page; you must click Save for it to apply.',
                    'Multiple-choice options and correct answers cannot be edited on the review page; use the exam edit page.',
                ],
            },
        },
        {
            id: 'exams',
            href: '/education/exams',
            permission: 'education.exams',
            th: {
                title: 'จัดการข้อสอบ',
                summary: 'รายการชุดข้อสอบทั้งหมด ดู แก้ไข เพิ่มคำถาม และลบ',
                blocks: [
                    {
                        heading: 'เมนูในแต่ละชุด',
                        items: [
                            '"ดูข้อสอบ" ดูรายข้อพร้อมเฉลย จุดสีส้ม = ยังไม่มีเฉลย',
                            '"เปิดหน้านักเรียน" ดูหน้าที่นักเรียนเห็นจริง',
                            '"แก้ไข" แก้ข้อมูลชุด เพิ่ม/แก้/ลบคำถาม และ "สร้างด้วย AI"',
                            '"ตรวจสอบ OCR" ไปหน้าตรวจข้อความกับภาพสแกน',
                        ],
                    },
                    {
                        heading: 'สร้างชุดใหม่ด้วยมือ',
                        items: [
                            '"สร้างข้อสอบใหม่" กรอกข้อมูลแล้วบันทึกแบบร่าง จากนั้นเพิ่มคำถามในหน้าแก้ไข',
                            'ข้อปรนัยต้องมีอย่างน้อย 2 ตัวเลือก และเลือกข้อที่ถูกด้วยปุ่มวงกลม',
                        ],
                    },
                ],
                warnings: [
                    '"สร้างด้วย AI" บันทึกคำถามทันทีโดยไม่มีตัวอย่างให้ดูก่อน ตรวจทุกข้อหลังสร้าง',
                    'ลบชุดข้อสอบจะลบคำถามทั้งหมดด้วย กู้คืนไม่ได้ ถ้าชุดผูกกับคอร์สอยู่ต้องถอดออกจากคอร์สก่อน',
                    'ในรายการ คอลัมน์ระดับและเวลาอาจว่าง ดูค่าจริงในหน้าแก้ไข',
                ],
            },
            en: {
                title: 'Exams',
                summary: 'All exam sets: view, edit, add questions and delete.',
                blocks: [
                    {
                        heading: 'Per-set menu',
                        items: [
                            '"ดูข้อสอบ" shows each question with answers; an orange dot means no answer key yet.',
                            '"เปิดหน้านักเรียน" opens what students actually see.',
                            '"แก้ไข" edits set details, adds/edits/deletes questions, and "Generate with AI".',
                            '"ตรวจสอบ OCR" opens the scan-vs-text review page.',
                        ],
                    },
                    {
                        heading: 'Create a set by hand',
                        items: [
                            '"สร้างข้อสอบใหม่": fill in details and save as draft, then add questions on the edit page.',
                            'Multiple-choice questions need at least 2 options; pick the correct one with the radio button.',
                        ],
                    },
                ],
                warnings: [
                    '"Generate with AI" saves questions immediately with no preview. Check every question afterwards.',
                    'Deleting a set deletes all its questions and cannot be undone. A set linked to a course must be unlinked first.',
                    'Difficulty and time may appear blank in the list; see the real values on the edit page.',
                ],
            },
        },
        {
            id: 'courses',
            href: '/education/courses',
            permission: 'education.courses',
            th: {
                title: 'คอร์สเรียน',
                summary: 'สร้างคอร์ส จัดบทเรียนวิดีโอและแบบทดสอบ และผูกชุดข้อสอบ',
                blocks: [
                    {
                        heading: 'สร้างและแก้คอร์ส',
                        items: [
                            '"สร้างคอร์สใหม่" กรอกชื่อ รายละเอียด ราคา ผู้สอน ระดับ หมวดหมู่ และ URL รูปปก',
                            'หน้าแก้ไขมี 3 แท็บ: "ข้อมูลทั่วไป", "บทเรียน" (เพิ่มบท ลากเรียงลำดับ เพิ่มวิดีโอหรือแบบทดสอบ) และ "ข้อสอบ" (ผูกชุดข้อสอบ)',
                            'วิดีโอ MP4/WebM ไม่เกิน 100MB หรือใส่ URL ตั้ง "ดูฟรี" ให้บทที่เปิดให้ดูตัวอย่าง',
                            'กด "บันทึกแบบร่าง" หรือ "เผยแพร่"',
                        ],
                    },
                ],
                warnings: [
                    'การแก้ในทุกแท็บยังไม่ถูกบันทึกจนกว่าจะกดปุ่มบันทึก อย่าปิดหน้าก่อน',
                    'ลบคอร์สแล้วกู้คืนไม่ได้',
                ],
            },
            en: {
                title: 'Courses',
                summary: 'Create courses, arrange video lessons and quizzes, and link exam sets.',
                blocks: [
                    {
                        heading: 'Create and edit',
                        items: [
                            '"สร้างคอร์สใหม่": title, description, price, instructor, level, category and cover image URL.',
                            'The edit page has 3 tabs: General, Lessons (add modules, drag to reorder, add videos or quizzes) and Exams (link exam sets).',
                            'Videos: MP4/WebM up to 100MB, or a URL. Mark preview lessons as "free".',
                            'Click save as draft or publish.',
                        ],
                    },
                ],
                warnings: [
                    'Changes on every tab are not saved until you click a save button. Do not close the page first.',
                    'Deleting a course cannot be undone.',
                ],
            },
        },
        {
            id: 'education-settings',
            href: '/settings/education',
            permission: 'education.settings',
            th: {
                title: 'ตั้งค่า Education',
                summary: 'ข้อมูลเว็บไซต์ Wittaya: ชื่อ คำอธิบาย ประกาศบนแบนเนอร์ ข้อมูลติดต่อ และโซเชียล',
                blocks: [
                    {
                        heading: 'การใช้งาน',
                        items: [
                            'แก้ช่องที่ต้องการแล้วกด "บันทึกการตั้งค่า"',
                            '"ประกาศ / ข้อความแจ้งเตือน" แสดงเป็นแบนเนอร์ด้านบนเว็บ เว้นว่างเมื่อไม่มีประกาศ',
                        ],
                    },
                ],
                warnings: ['ไม่มีการตรวจรูปแบบ ตรวจอีเมล เบอร์ และลิงก์ให้ถูกก่อนบันทึก'],
            },
            en: {
                title: 'Education settings',
                summary: 'Wittaya site details: name, description, banner announcement, contact details and social links.',
                blocks: [
                    {
                        heading: 'Usage',
                        items: [
                            'Edit the fields you need and click "บันทึกการตั้งค่า".',
                            'The announcement shows as a banner at the top of the site. Leave it blank when there is none.',
                        ],
                    },
                ],
                warnings: ['Nothing is validated. Check emails, phone numbers and links before saving.'],
            },
        },
        {
            id: 'education-plans',
            href: '/education/plans',
            permission: 'education.plans',
            th: {
                title: 'แพ็กเกจและสิทธิ์ (Wittaya)',
                summary: 'กำหนดสิทธิ์ของแพ็กเกจ Free / Premium / Pro และมอบแพ็กเกจให้นักเรียนรายคน',
                blocks: [
                    {
                        heading: 'สิทธิ์ที่ตั้งได้',
                        items: [
                            '"ทำข้อสอบ (ชุด/วัน)" รีเซ็ตเที่ยงคืนเวลาไทย ติ๊ก "ไม่จำกัด" ได้',
                            '"AI ตรวจข้อเขียน", "AI วิเคราะห์จุดอ่อน", "ไม่มีโฆษณา"',
                            '"ดาวน์โหลด E-Book รวมข้อสอบฟรี" ค่าเริ่มต้นเปิดเฉพาะ Pro — แพ็กเกจที่ไม่ได้ติ๊กต้องซื้อ E-Book',
                            '"E-Book ฟรีสูงสุด (เล่ม/สัปดาห์)" ค่าเริ่มต้น Pro = 3 เล่ม ติ๊ก "ไม่จำกัด" ได้ · โหลดเล่มเดิมซ้ำในสัปดาห์เดียวกันไม่นับ · รีเซ็ตเที่ยงคืนเข้าวันจันทร์เวลาไทย',
                        ],
                    },
                    {
                        heading: 'มอบแพ็กเกจรายคน',
                        items: [
                            'แท็บ "ลูกค้ารายคน" ค้นด้วยอีเมลหรือ UID → "มอบแพ็กเกจ" → วันหมดอายุ → หมายเหตุ',
                        ],
                    },
                ],
                warnings: ['Wittaya ยังไม่มีระบบชำระเงิน การมอบที่หน้านี้เป็นทางเดียวที่นักเรียนจะได้สูงกว่า Free'],
            },
            en: {
                title: 'Plans and entitlements (Wittaya)',
                summary: 'Set what Free / Premium / Pro include and grant plans to individual students.',
                blocks: [
                    {
                        heading: 'Settings',
                        items: [
                            'Exam sets per day (resets at midnight Thai time; can be unlimited).',
                            'AI essay grading, AI weakness analysis, ad-free.',
                        ],
                    },
                    {
                        heading: 'Grant to a student',
                        items: [
                            'Tab "Individual customers": search by email or UID → "มอบแพ็กเกจ" → expiry → note.',
                        ],
                    },
                ],
                warnings: ['Wittaya has no payment system yet, so granting here is the only way a student gets above Free.'],
            },
        },
    ],
};
