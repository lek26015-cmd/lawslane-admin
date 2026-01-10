
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const books = [
    {
        id: "1",
        title: "คู่มือเตรียมสอบใบอนุญาตว่าความ (ภาคทฤษฎี)",
        description: "หนังสือเล่มนี้รวบรวมเนื้อหาสำคัญสำหรับการสอบใบอนุญาตว่าความ ภาคทฤษฎี ไว้อย่างครบถ้วน เหมาะสำหรับผู้ที่ต้องการทบทวนความรู้ก่อนสอบ \n\nภายในเล่มประกอบด้วย:\n- สรุปย่อกฎหมายวิธีพิจารณาความแพ่งและอาญา\n- เทคนิคการเขียนคำคู่ความ\n- ตัวอย่างข้อสอบปรนัยและอัตนัยย้อนหลัง 10 สมัย\n- วิเคราะห์จุดที่มักออกสอบ",
        price: 350,
        coverUrl: "https://placehold.co/400x600/e2e8f0/1e293b?text=Lawyer+License",
        author: "อ.สมชาย กฎหมายแม่น",
        publisher: "Lawlanes Publishing",
        isbn: "978-616-1234-56-7",
        pageCount: 320,
        publishedAt: new Date("2024-01-15"),
        stock: 50,
        isDigital: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: "2",
        title: "รวมข้อสอบตั๋วทนาย 10 ปีย้อนหลัง",
        description: "เจาะลึกข้อสอบเก่า พร้อมเฉลยละเอียดและวิเคราะห์ประเด็นสำคัญ\n- รวบรวมข้อสอบจริงกว่า 10 ปี\n- เฉลยละเอียดทุกข้อ\n- วิเคราะห์แนวโน้มข้อสอบปัจจุบัน",
        price: 450,
        coverUrl: "https://placehold.co/400x600/e2e8f0/1e293b?text=Exam+History",
        author: "ทีมงาน Lawlanes",
        publisher: "Lawlanes Academy",
        pageCount: 450,
        publishedAt: new Date("2023-11-20"),
        stock: 20,
        isDigital: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: "3",
        title: "E-Book: เทคนิคการร่างฟ้องและคำร้อง",
        description: "เทคนิคระดับมือโปรสำหรับการร่างเอกสารทางกฎหมาย (รูปแบบ PDF)\n- template ตัวอย่างเอกสาร\n- หลักการร่างฟ้องคดีแพ่งและอาญา\n- ตัวอย่างคำร้องขอต่างๆ",
        price: 199,
        coverUrl: "https://placehold.co/400x600/e2e8f0/1e293b?text=E-Book",
        author: "ทนายวิชัย",
        stock: 999,
        isDigital: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    }
];

async function seed() {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
        console.error('Missing Firebase credentials:');
        console.error('- Project ID:', !!projectId);
        console.error('- Client Email:', !!clientEmail);
        console.error('- Private Key:', !!privateKey);
        process.exit(1);
    }

    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: projectId,
                clientEmail: clientEmail,
                privateKey: privateKey.replace(/\\n/g, '\n'),
            })
        });

        console.log('Seeding books...');
        const batch = admin.firestore().batch();

        for (const book of books) {
            const ref = admin.firestore().collection('books').doc(book.id);
            batch.set(ref, book);
        }

        await batch.commit();
        console.log('Success! Added 3 books.');
    } catch (error) {
        console.error('Error seeding:', error);
    }
}

seed();
