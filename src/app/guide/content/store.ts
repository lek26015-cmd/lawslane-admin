import type { GuideGroup } from './types';

export const storeGroup: GuideGroup = {
    id: 'store',
    title: { th: 'ร้านค้า', en: 'Store' },
    sections: [
        {
            id: 'orders',
            href: '/orders',
            permission: 'store.orders',
            th: {
                title: 'รายการสั่งซื้อ',
                summary: 'คำสั่งซื้อหนังสือ คอร์ส และข้อสอบจาก Lawslane Wittaya ตรวจสลิป ยืนยันการชำระเงิน และจัดส่ง',
                blocks: [
                    {
                        heading: 'ขั้นตอน',
                        items: [
                            'แท็บ "รอตรวจสอบ" → "รายละเอียด" → ตรวจรูปสลิปกับยอดรวมด้วยตาเอง (หน้านี้ไม่มี SlipOK)',
                            'ถูกต้อง กด "ยืนยันการชำระเงิน" ลูกค้าจะได้สิทธิ์ใช้ E-Book/คอร์สทันที ไม่ถูกต้อง กด "ปฏิเสธ"',
                            'สินค้าเป็นเล่ม: กรอก "เลขพัสดุ" → "ทำเครื่องหมายว่าจัดส่งแล้ว" → เมื่อถึงมือลูกค้า "ทำเครื่องหมายว่าส่งถึงแล้ว"',
                            'สินค้าดิจิทัล: หลังยืนยันการชำระเงินกด "ทำเครื่องหมายว่าสำเร็จ"',
                        ],
                    },
                ],
                warnings: [
                    'ระบบไม่ส่งอีเมลหรือแจ้งเตือนลูกค้าเมื่อเปลี่ยนสถานะ แจ้งเลขพัสดุให้ลูกค้าเอง',
                    '"ปฏิเสธ" ไม่ถามยืนยัน และเปลี่ยนสถานะย้อนกลับจากหน้านี้ไม่ได้',
                    'ช่องค้นหาใช้ User ID แบบตรงตัว และเมื่อค้นหา ตัวกรองแท็บจะไม่ถูกใช้',
                ],
            },
            en: {
                title: 'Orders',
                summary: 'Book, course and exam orders from Lawslane Wittaya: check slips, confirm payment and ship.',
                blocks: [
                    {
                        heading: 'Steps',
                        items: [
                            'Tab "Pending" → details → check the slip image against the total yourself (no SlipOK here).',
                            'If correct, click "ยืนยันการชำระเงิน"; the customer gets e-book/course access immediately. If not, click reject.',
                            'Physical items: enter the tracking number → mark shipped → mark delivered when it arrives.',
                            'Digital items: after confirming payment, mark completed.',
                        ],
                    },
                ],
                warnings: [
                    'Status changes do not email or notify the customer. Send the tracking number yourself.',
                    'Reject has no confirmation, and statuses cannot be moved back from this page.',
                    'Search takes an exact User ID, and the status tab is ignored while searching.',
                ],
            },
        },
        {
            id: 'books',
            href: '/books',
            permission: 'store.books',
            th: {
                title: 'คลังหนังสือ',
                summary: 'เพิ่มและแก้หนังสือในร้าน ราคา สต็อก และรูปปก',
                blocks: [
                    {
                        heading: 'เพิ่มหนังสือ',
                        items: [
                            '"เพิ่มหนังสือใหม่" กรอกชื่อ ผู้เขียน รายละเอียด ราคา ราคาเต็ม สต็อก จำนวนหน้า',
                            '"รูปแบบ": หนังสือเล่ม / E-Book / ทั้งสองแบบ (ใช้ตัดสินว่าออเดอร์ต้องขอที่อยู่จัดส่งไหม)',
                            'รูปปก: อัปโหลดไฟล์หรือวาง URL',
                        ],
                    },
                ],
                warnings: [
                    'สต็อกไม่ลดอัตโนมัติเมื่อมีออเดอร์ ปรับเองหลังจัดส่ง',
                    'ยังตั้งหมวดหมู่และอัปโหลดไฟล์ E-Book จากหน้านี้ไม่ได้',
                    'ถ้ากดบันทึกแล้วไม่มีอะไรเกิดขึ้น ให้ตรวจว่ากรอกช่องบังคับครบ แล้วลองใหม่',
                    'ลบหนังสือแล้วกู้คืนไม่ได้',
                ],
            },
            en: {
                title: 'Bookstore',
                summary: 'Add and edit books in the store: price, stock and cover.',
                blocks: [
                    {
                        heading: 'Add a book',
                        items: [
                            '"เพิ่มหนังสือใหม่": title, author, description, price, list price, stock, page count.',
                            'Format: physical / e-book / both (decides whether orders ask for a shipping address).',
                            'Cover: upload a file or paste a URL.',
                        ],
                    },
                ],
                warnings: [
                    'Stock does not decrease automatically with orders. Adjust it after shipping.',
                    'Category and e-book file upload are not available on this page yet.',
                    'If saving seems to do nothing, check all required fields and try again.',
                    'Deleting a book cannot be undone.',
                ],
            },
        },
    ],
};
