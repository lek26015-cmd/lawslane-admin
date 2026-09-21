'use server';

import { initAdmin } from '@/lib/firebase-admin';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { requireAdmin } from '@/lib/auth-guard';

export type ExtractedLawyer = {
    prefix: string;     // คำนำหน้า
    firstName: string;  // ชื่อ
    lastName: string;   // สกุล
    licenseNumber: string; // เลขที่ใบอนุญาต
    licenseType?: string;  // ประเภท (ตลอดชีพ/สองปี ถ้ามี)
};



/**
 * Extract lawyer data from an uploaded image using Gemini Vision.
 */
export async function extractLawyersFromImage(base64Image: string, mimeType: string): Promise<ExtractedLawyer[]> {
    // เครื่องมือของแอดมินเท่านั้น
    await requireAdmin('users.registry');


    const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY || '';
    if (!apiKey) throw new Error('API Key not found');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        prefix: {
                            type: SchemaType.STRING,
                            description: 'คำนำหน้า เช่น นาย, นาง, นางสาว'
                        },
                        firstName: {
                            type: SchemaType.STRING,
                            description: 'ชื่อจริง (ไม่รวมคำนำหน้า)'
                        },
                        lastName: {
                            type: SchemaType.STRING,
                            description: 'นามสกุล'
                        },
                        licenseNumber: {
                            type: SchemaType.STRING,
                            description: 'เลขที่ใบอนุญาตทนายความ เช่น 1365/2532'
                        },
                        licenseType: {
                            type: SchemaType.STRING,
                            description: 'ประเภทใบอนุญาต เช่น ตลอดชีพ, สองปี (ถ้ามีในเอกสาร ถ้าไม่มีให้เป็น empty string)'
                        },
                    },
                    required: ['prefix', 'firstName', 'lastName', 'licenseNumber'],
                },
            },
        },
    });

    const prompt = `คุณคือระบบ OCR สำหรับอ่านเอกสารรายชื่อทนายความจากสภาทนายความแห่งประเทศไทย

จากภาพเอกสารที่ให้มา ให้อ่านข้อมูลรายชื่อทนายความทั้งหมดในตาราง แล้วส่งกลับเป็น JSON array

กฎ:
1. อ่านทุกแถวในตารางให้ครบถ้วน ห้ามข้ามแถว
2. แยก "ชื่อ" และ "สกุล" ออกจากกัน (บางเอกสารอาจรวมเป็นช่อง "ชื่อ-สกุล" ให้แยกเอง)
3. เลขที่ใบอนุญาต ต้องอยู่ในรูปแบบ "เลข/ปี พ.ศ." เช่น "1365/2532"
4. ถ้ามีคอลัมน์ "ประเภท" (ตลอดชีพ/สองปี) ให้ใส่ใน licenseType
5. ไม่ต้องใส่ลำดับที่
6. ข้อมูลต้องเป็นภาษาไทย`;

    try {
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
                    data: base64Image,
                },
            },
        ]);

        const text = result.response.text();
        const lawyers: ExtractedLawyer[] = JSON.parse(text);
        return lawyers;
    } catch (error: any) {
        console.error('[extractLawyersFromImage] Error:', error);
        throw new Error('ไม่สามารถอ่านข้อมูลจากเอกสารได้: ' + error.message);
    }
}

/**
 * Import extracted lawyers into the verifiedLawyers Firestore collection.
 */
export async function importLawyersToRegistry(lawyers: ExtractedLawyer[]): Promise<{
    success: number;
    duplicates: number;
    errors: number;
    total: number;
}> {
    // เครื่องมือของแอดมินเท่านั้น
    await requireAdmin('users.registry');


    const admin = await initAdmin();
    if (!admin) throw new Error('Server error: Admin SDK not initialized');

    const db = admin.firestore();
    let success = 0;
    let duplicates = 0;
    let errors = 0;

    for (const lawyer of lawyers) {
        try {
            const hasLicense = lawyer.licenseNumber && lawyer.licenseNumber.trim() !== '';
            const docId = hasLicense
                ? lawyer.licenseNumber.replace(/\//g, '-').trim()
                : `${lawyer.firstName}-${lawyer.lastName}-${Date.now()}`.trim();
            const docRef = db.collection('verifiedLawyers').doc(docId);

            // Check if already exists (only if has license number)
            if (hasLicense) {
                const existing = await docRef.get();
                if (existing.exists) {
                    duplicates++;
                    continue;
                }
            }

            // Write the document
            await docRef.set({
                licenseNumber: lawyer.licenseNumber.trim(),
                firstName: lawyer.firstName.trim(),
                lastName: lawyer.lastName.trim(),
                prefix: lawyer.prefix.trim(),
                licenseType: lawyer.licenseType?.trim() || '',
                province: '',
                status: 'active',
                source: 'document_import',
                registeredDate: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
            success++;
        } catch (err: any) {
            console.error('[importLawyersToRegistry] Error:', lawyer.licenseNumber, err?.message || err);
            errors++;
        }
    }

    return { success, duplicates, errors, total: lawyers.length };
}
