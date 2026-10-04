import type { GuideGroup } from './types';

export const contentGroup: GuideGroup = {
    id: 'content',
    title: { th: 'เนื้อหา การตลาด และแบบสำรวจ', en: 'Content, marketing and surveys' },
    sections: [
        {
            id: 'articles',
            href: '/content',
            permission: 'content',
            th: {
                title: 'จัดการเนื้อหา (บทความ)',
                summary: 'เขียนบทความความรู้กฎหมายที่แสดงบนเว็บหลัก รองรับไทย อังกฤษ และจีน',
                blocks: [
                    {
                        heading: 'เขียนบทความ',
                        items: [
                            '"สร้างบทความใหม่" → กรอกหัวข้อ รูปปก คำอธิบาย (Meta Description) และเนื้อหาภาษาไทย',
                            'ปุ่ม "แปลหัวข้อ" / "แปลคำอธิบาย" / "แปลเนื้อหา" ใช้ AI เติมภาษาอังกฤษและจีน อ่านทวนก่อนบันทึก',
                            'ตั้ง Slug (ส่วนท้าย URL) หมวดหมู่ แท็ก และปุ่ม Call to Action ถ้าต้องการ',
                            'ต้องกรอกหัวข้อ Slug เนื้อหา และหมวดหมู่ จึงบันทึกได้',
                        ],
                    },
                ],
                warnings: [
                    'ไม่มีสถานะแบบร่าง บันทึกแล้วเผยแพร่ทันที',
                    'ระบบไม่ตรวจ Slug ซ้ำ ตรวจเองว่าไม่ชนบทความเดิม',
                    'ใช้รูปปกขนาดเล็กพอ เพราะรูปถูกเก็บในข้อมูลบทความโดยตรง',
                    'รายการแสดง 100 บทความแรก',
                ],
            },
            en: {
                title: 'Content (articles)',
                summary: 'Write legal knowledge articles shown on the main site, in Thai, English and Chinese.',
                blocks: [
                    {
                        heading: 'Write an article',
                        items: [
                            '"สร้างบทความใหม่" → enter the Thai title, cover image, meta description and body.',
                            'The translate buttons fill English and Chinese with AI. Proofread before saving.',
                            'Set the slug (URL ending), category, tags and an optional call-to-action button.',
                            'Title, slug, body and category are required.',
                        ],
                    },
                ],
                warnings: [
                    'There is no draft status. Saving publishes immediately.',
                    'Slugs are not checked for duplicates. Make sure yours is unique.',
                    'Keep cover images small; they are stored inside the article record.',
                    'The list shows the first 100 articles.',
                ],
            },
        },
        {
            id: 'landing-pages',
            href: '/landing-pages',
            permission: 'content',
            th: {
                title: 'Landing Pages',
                summary: 'หน้าเว็บเดี่ยวที่ lawslane.com/p/ชื่อเพจ สำหรับแคมเปญหรือพาร์ทเนอร์',
                blocks: [
                    {
                        heading: 'สร้างเพจ',
                        items: [
                            '"สร้างใหม่" → ชื่อเพจ → Slug (พิมพ์เป็นภาษาอังกฤษเอง ชื่อภาษาไทยจะสร้าง Slug ไม่ได้)',
                            'เลือก "แบบร่าง (Draft)" ระหว่างทำ เปลี่ยนเป็น "เผยแพร่ (Published)" เมื่อพร้อม',
                            'อัปโหลดรูปส่วนหัว (บังคับ แนะนำ 1920x1080) โลโก้ เนื้อหา และข้อมูลติดต่อ',
                            'ไอคอนลิงก์ในรายการ "ดูหน้าเว็บ" เปิดหน้าจริง',
                        ],
                    },
                ],
                warnings: [
                    'ถ้าขึ้นกล่องแดง "Access Denied" พร้อมปุ่ม "Fix Admin Role (Dev Only)" ห้ามกดปุ่มนั้น ให้แจ้งทีมพัฒนาแทน',
                    'ตอนแก้ไข ระบบไม่ตรวจ Slug ซ้ำ อย่าเปลี่ยน Slug ให้ชนเพจอื่น',
                    'ลบแล้วกู้คืนไม่ได้',
                ],
            },
            en: {
                title: 'Landing pages',
                summary: 'Single pages at lawslane.com/p/<slug> for campaigns or partners.',
                blocks: [
                    {
                        heading: 'Create a page',
                        items: [
                            '"สร้างใหม่" → page title → slug (type it in English yourself; Thai titles cannot produce a slug).',
                            'Keep it as Draft while working; switch to Published when ready.',
                            'Upload the hero image (required, 1920x1080 recommended), logo, content and contact details.',
                            'The link icon "ดูหน้าเว็บ" in the list opens the live page.',
                        ],
                    },
                ],
                warnings: [
                    'If a red "Access Denied" box appears with a "Fix Admin Role (Dev Only)" button, do not press it. Tell the dev team.',
                    'Editing does not check for duplicate slugs. Do not change a slug to one another page uses.',
                    'Deleting cannot be undone.',
                ],
            },
        },
        {
            id: 'ads',
            href: '/ads',
            permission: 'content',
            th: {
                title: 'จัดการโฆษณา',
                summary: 'แบนเนอร์บนหน้าแรก ไซด์บาร์หน้าทนาย และไซด์บาร์หน้าแบบฟอร์ม',
                blocks: [
                    {
                        heading: 'เพิ่มโฆษณา',
                        items: [
                            '"เพิ่มโฆษณาใหม่" → รูป → หัวข้อ → คำอธิบาย → ลิงก์ (ไม่บังคับ) → ตำแหน่ง → สถานะ',
                            'สถานะ Active = แสดง, Draft = ยังไม่แสดง, Expired = หมดแล้ว (ต้องเปลี่ยนเอง ระบบไม่หมดอายุอัตโนมัติ)',
                            'กดแถวเพื่อดูสถิติการคลิก',
                        ],
                    },
                ],
                warnings: [
                    'โฆษณาตำแหน่ง "ไซด์บาร์หน้าแบบฟอร์ม" ไม่มีแท็บแยก ดูได้ในแท็บ "ทั้งหมด"',
                    'สถิติผู้เข้าชมอาจว่างเพราะขึ้นกับการเก็บข้อมูลของเว็บหลัก',
                    'ลบแล้วกู้คืนไม่ได้',
                ],
            },
            en: {
                title: 'Ads',
                summary: 'Banners on the home page carousel, lawyer page sidebar and legal forms sidebar.',
                blocks: [
                    {
                        heading: 'Add an ad',
                        items: [
                            '"เพิ่มโฆษณาใหม่" → image → title → description → link (optional) → placement → status.',
                            'Active = shown, Draft = not shown, Expired = ended. You must change it yourself; nothing expires automatically.',
                            'Click a row to see click stats.',
                        ],
                    },
                ],
                warnings: [
                    'Legal-forms-sidebar ads have no tab of their own; find them under "All".',
                    'Audience stats may be empty because they depend on tracking on the main site.',
                    'Deleting cannot be undone.',
                ],
            },
        },
        {
            id: 'forms',
            href: '/forms',
            permission: 'content',
            th: {
                title: 'แบบฟอร์มกฎหมาย',
                summary: 'ไฟล์แบบฟอร์ม/สัญญาให้ผู้ใช้ดาวน์โหลดจากเว็บหลัก',
                blocks: [
                    {
                        heading: 'เพิ่มแบบฟอร์ม',
                        items: [
                            '"เพิ่มแบบฟอร์ม" → ชื่อเอกสารแยกภาษา (ไทยบังคับ แปลด้วย AI ได้) → หมวดหมู่ → รายละเอียด',
                            'อัปโหลดไฟล์แยกภาษา รองรับ .pdf .doc .docx .xls .xlsx ต้องมีไฟล์ภาษาไทยอย่างน้อย 1 ไฟล์',
                            'คอลัมน์ "ยอดโหลด" บอกจำนวนดาวน์โหลด',
                        ],
                    },
                ],
                warnings: [
                    'ลบแบบฟอร์มหรือเอาไฟล์แนบออก จะเอาออกจากรายการเท่านั้น ไฟล์เดิมยังอยู่ในที่เก็บไฟล์',
                    'ตรวจว่าไฟล์ไม่มีข้อมูลส่วนบุคคลของลูกค้าจริงก่อนอัปโหลด',
                ],
            },
            en: {
                title: 'Legal forms',
                summary: 'Form and contract templates users download from the main site.',
                blocks: [
                    {
                        heading: 'Add a form',
                        items: [
                            '"เพิ่มแบบฟอร์ม" → title per language (Thai required; AI translation available) → category → description.',
                            'Upload files per language: .pdf .doc .docx .xls .xlsx. At least one Thai file is required.',
                            'The downloads column shows how often it was downloaded.',
                        ],
                    },
                ],
                warnings: [
                    'Deleting a form or removing an attachment only removes it from the list; the file stays in storage.',
                    'Make sure files contain no real customer personal data before uploading.',
                ],
            },
        },
        {
            id: 'legal-docs',
            href: '/legal',
            permission: 'content',
            th: {
                title: 'เอกสารทางกฎหมาย (นโยบายความเป็นส่วนตัว / ข้อกำหนด)',
                summary: 'แก้นโยบายความเป็นส่วนตัวและข้อกำหนดการใช้งานที่แสดงบนเว็บหลัก',
                blocks: [
                    {
                        heading: 'ขั้นตอน',
                        items: [
                            'เลือกแท็บเอกสาร แล้วแก้ภาษาไทยก่อน',
                            'สลับไป EN / ZH แล้วกด "แปลภาษาอัตโนมัติ (AI)" หรือ "📝 ดึงเนื้อหา TH" มาแก้ต่อ',
                            'ตรวจในช่องตัวอย่าง แล้วกด "บันทึกการเปลี่ยนแปลง"',
                            '"รีเซ็ต" ย้อนกลับไปฉบับที่บันทึกล่าสุด',
                        ],
                    },
                ],
                warnings: [
                    'บันทึกครั้งเดียวจะเขียนทั้งสามภาษาพร้อมกันและขึ้นเว็บทันที ไม่มีประวัติเวอร์ชัน คัดลอกฉบับเดิมเก็บไว้ก่อนแก้ใหญ่',
                    'เนื้อหาทางกฎหมายต้องให้ฝ่ายกฎหมายอนุมัติก่อนบันทึก คำแปล AI ต้องตรวจทุกครั้ง',
                ],
            },
            en: {
                title: 'Legal documents (privacy policy / terms)',
                summary: 'Edit the privacy policy and terms of service shown on the main site.',
                blocks: [
                    {
                        heading: 'Steps',
                        items: [
                            'Pick the document tab and edit the Thai version first.',
                            'Switch to EN / ZH and use AI translation or "pull TH content", then edit.',
                            'Check the preview and click "บันทึกการเปลี่ยนแปลง".',
                            '"รีเซ็ต" reverts to the last saved version.',
                        ],
                    },
                ],
                warnings: [
                    'One save writes all three languages and goes live immediately. There is no version history; copy the old text before big edits.',
                    'Legal content must be approved by the legal team before saving, and AI translations must always be checked.',
                ],
            },
        },
        {
            id: 'knowledge',
            href: '/knowledge',
            permission: 'rag',
            th: {
                title: 'คลังความรู้ AI และมอนิเตอร์ RAG',
                summary: 'เพิ่มเอกสารกฎหมาย (PDF) ให้ AI ที่ปรึกษากฎหมายใช้ค้นคำตอบ และดูสถานะการนำเข้าข้อมูล',
                blocks: [
                    {
                        heading: 'อัปโหลดเอกสาร',
                        items: [
                            'เลือกไฟล์ PDF ที่มีข้อความ (ไม่ใช่ไฟล์สแกนเป็นรูป) → "อัปโหลดเข้าสู่ระบบ"',
                            'ระบบตัดเป็นส่วนย่อยแล้วส่งเข้าฐานข้อมูล AI ข้อความ "ประมวลผล N ส่วน" คือจำนวนส่วนที่ส่ง',
                            'ไฟล์ชื่อซ้ำกับที่เคยอัปโหลดจะถูกปฏิเสธ',
                        ],
                    },
                    {
                        heading: 'มอนิเตอร์ RAG',
                        items: [
                            'ดูจำนวน vector อัตรานำเข้า และสถานะ ingestor แต่ละแหล่ง (รีเฟรชทุก 15 วินาที)',
                        ],
                    },
                ],
                warnings: [
                    'ยังลบหรืออัปโหลดเอกสารทับไม่ได้ ตรวจไฟล์ให้ถูกก่อนอัปโหลด',
                    'กล่อง "Log ระบบสด" ในหน้ามอนิเตอร์เป็นข้อความตัวอย่าง ไม่ใช่ log จริง และปุ่มหยุด/เริ่มระบบใช้ได้เฉพาะเครื่องของทีมพัฒนา',
                ],
            },
            en: {
                title: 'AI knowledge base and RAG monitor',
                summary: 'Add legal documents (PDF) for the AI legal advisor to search, and watch ingestion status.',
                blocks: [
                    {
                        heading: 'Upload a document',
                        items: [
                            'Choose a text PDF (not an image-only scan) → "อัปโหลดเข้าสู่ระบบ".',
                            'It is split into chunks and sent to the AI database. "Processed N parts" is the number of chunks sent.',
                            'A file with the same name as an earlier upload is rejected.',
                        ],
                    },
                    {
                        heading: 'RAG monitor',
                        items: [
                            'Shows vector count, ingest rate and status per ingestor source (refreshes every 15 seconds).',
                        ],
                    },
                ],
                warnings: [
                    'Documents cannot be deleted or replaced yet. Check the file before uploading.',
                    'The "live log" box on the monitor shows sample text, not real logs, and the pause/resume buttons only work on the dev team\'s machine.',
                ],
            },
        },
        {
            id: 'surveys',
            href: '/surveys',
            permission: 'surveys',
            th: {
                title: 'แบบสำรวจ',
                summary: 'ดูคำตอบแบบสำรวจ SME ทนาย และบุคคลทั่วไป ที่เก็บจากฟอร์มบนเว็บหลัก (อ่านอย่างเดียว)',
                blocks: [
                    {
                        heading: 'การใช้งาน',
                        items: [
                            'ไอคอนลิงก์ข้างเมนูเปิดฟอร์มสำรวจจริงบนเว็บหลัก',
                            'กด "ดูรายละเอียด" เพื่ออ่านคำตอบทั้งชุด',
                            'แบบสอบถามทนายและบุคคลทั่วไปมี "Export CSV" ดาวน์โหลดคำตอบทั้งหมด (ไม่สนช่องค้นหา)',
                        ],
                    },
                ],
                warnings: [
                    'ไฟล์ CSV มีข้อมูลผู้ตอบ เก็บในที่ปลอดภัยและลบเมื่อใช้เสร็จ',
                ],
            },
            en: {
                title: 'Surveys',
                summary: 'Read responses to the SME, lawyer and public surveys collected on the main site (read-only).',
                blocks: [
                    {
                        heading: 'Usage',
                        items: [
                            'The link icon next to each menu item opens the live survey form.',
                            'Click "ดูรายละเอียด" to read a full response.',
                            'The lawyer and public surveys have "Export CSV", which downloads all responses (ignoring the search box).',
                        ],
                    },
                ],
                warnings: [
                    'CSV files contain respondent data. Store them securely and delete them when done.',
                ],
            },
        },
    ],
};
