import 'server-only';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { createHash } from 'crypto';

/**
 * แกนของการอ่านรายชื่อทนายจากรูปเอกสาร + นำเข้า verifiedLawyers
 * ใช้ร่วมกันระหว่าง server action (หน้าหลังบ้าน) และ cron ดึงประกาศสภาทนายความ
 *
 * กฎ: เลขใบอนุญาตต้องมาจากเอกสารที่พิมพ์เลขไว้จริงเท่านั้น — ไม่มีให้เป็น '' ห้ามเดา/แต่ง
 */


export type ExtractedLawyer = {
    prefix: string;     // คำนำหน้า
    firstName: string;  // ชื่อ
    lastName: string;   // สกุล
    // เลขที่ใบอนุญาต — ต้องมาจากเอกสารที่พิมพ์เลขไว้จริงเท่านั้น ไม่มีให้เป็น '' (ห้ามเดา/แต่งเลข)
    licenseNumber: string;
    licenseType?: string;  // ประเภท (ตลอดชีพ/สองปี ถ้ามี)
    announcementDate?: string; // วันที่ตามที่พิมพ์ในเอกสาร เช่น "22 กันยายน 2569" (ถ้ามี)
    sourceUrl?: string;        // ลิงก์ประกาศต้นฉบับ (ถ้ามี)
};

// รูปแบบเลขใบอนุญาต "เลข/ปี พ.ศ." เช่น 1365/2532
const LICENSE_RE = /^\d{1,6}\/\d{4}$/;

function normalizeLicense(value: string | undefined): string {
    return (value || '').replace(/\s+/g, '').trim();
}

/** อ่านรายชื่อจากรูป (base64) ด้วย Gemini — ไม่ตรวจสิทธิ์ ผู้เรียกต้องตรวจเอง */
export async function extractLawyersFromImageData(base64Image: string, mimeType: string): Promise<ExtractedLawyer[]> {


    const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY || '';
    if (!apiKey) throw new Error('API Key not found');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: SchemaType.OBJECT,
                properties: {
                    hasLicenseColumn: {
                        type: SchemaType.BOOLEAN,
                        description: 'true เฉพาะเมื่อหัวตารางในเอกสารมีคอลัมน์ "เลขที่ใบอนุญาต" จริง ๆ',
                    },
                    documentDate: {
                        type: SchemaType.STRING,
                        description: 'วันที่ที่พิมพ์ในหัวเอกสาร เช่น "22 กันยายน 2569" ถ้าไม่มีให้เป็น empty string',
                    },
                    lawyers: {
                        type: SchemaType.ARRAY,
                        items: {
                            type: SchemaType.OBJECT,
                            properties: {
                                prefix: {
                                    type: SchemaType.STRING,
                                    description: 'คำนำหน้า เช่น นาย, นาง, นางสาว, ร.ต.ท.'
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
                                    description: 'เลขที่ใบอนุญาตตามที่พิมพ์ในเอกสารเท่านั้น เช่น 1365/2532 ถ้าเอกสารไม่มีให้เป็น empty string ห้ามเดา'
                                },
                                licenseType: {
                                    type: SchemaType.STRING,
                                    description: 'ประเภทใบอนุญาต เช่น ตลอดชีพ, สองปี (ถ้ามีในเอกสาร ถ้าไม่มีให้เป็น empty string)'
                                },
                            },
                            // licenseNumber ไม่บังคับ — บังคับแล้ว AI จะแต่งเลขขึ้นเองเมื่อเอกสารไม่มี
                            required: ['prefix', 'firstName', 'lastName'],
                        },
                    },
                },
                required: ['hasLicenseColumn', 'lawyers'],
            },
        },
    });

    const prompt = `คุณคือระบบ OCR สำหรับอ่านเอกสารรายชื่อทนายความจากสภาทนายความแห่งประเทศไทย

จากภาพเอกสารที่ให้มา ให้อ่านข้อมูลรายชื่อทนายความทั้งหมดในตาราง แล้วส่งกลับเป็น JSON ตาม schema (รายชื่ออยู่ใน lawyers)

กฎ:
1. อ่านทุกแถวในตารางให้ครบถ้วน ห้ามข้ามแถว
2. แยก "ชื่อ" และ "สกุล" ออกจากกัน (บางเอกสารอาจรวมเป็นช่อง "ชื่อ-สกุล" ให้แยกเอง)
3. เลขที่ใบอนุญาต: ใส่เฉพาะเมื่อเอกสารมีคอลัมน์เลขที่ใบอนุญาตและอ่านเลขได้ชัด รูปแบบ "เลข/ปี พ.ศ." เช่น "1365/2532"
   ถ้าเอกสารไม่มีคอลัมน์นี้ หรืออ่านไม่ชัด ให้เป็น empty string — ห้ามเดา ห้ามสร้างเลขขึ้นเอง ห้ามใช้ลำดับที่แทน
4. hasLicenseColumn = true เฉพาะเมื่อหัวตารางมีคอลัมน์เลขที่ใบอนุญาตจริง
5. ถ้ามีคอลัมน์ "ประเภท" (ตลอดชีพ/สองปี) ให้ใส่ใน licenseType
6. คำนำหน้าให้ใส่ตามเอกสาร รวมยศด้วย เช่น ร.ต.ท., ร้อยเอกหญิง
7. ไม่ต้องใส่ลำดับที่
8. ข้อมูลต้องเป็นภาษาไทย`;

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
        const parsed: { hasLicenseColumn?: boolean; documentDate?: string; lawyers?: ExtractedLawyer[] } = JSON.parse(text);
        const documentDate = (parsed.documentDate || '').trim();

        // กันเลขที่ AI แต่งขึ้น: เอกสารไม่มีคอลัมน์เลข → ล้างทิ้งทั้งหมด · มีคอลัมน์ → เก็บเฉพาะที่ตรงรูปแบบ
        return (parsed.lawyers || []).map((l) => {
            const ln = normalizeLicense(l.licenseNumber);
            return {
                prefix: (l.prefix || '').trim(),
                firstName: (l.firstName || '').trim(),
                lastName: (l.lastName || '').trim(),
                licenseNumber: parsed.hasLicenseColumn && LICENSE_RE.test(ln) ? ln : '',
                licenseType: (l.licenseType || '').trim(),
                announcementDate: documentDate || undefined,
            };
        });
    } catch (error: any) {
        console.error('[extractLawyersFromImage] Error:', error);
        throw new Error('ไม่สามารถอ่านข้อมูลจากเอกสารได้: ' + error.message);
    }
}

export type ImportResult = {
    success: number;
    duplicates: number;
    /** มีชื่อ-สกุลนี้อยู่แล้ว แต่ยังไม่มีที่มา → เติมวันที่ประกาศ/ลิงก์ให้ */
    enriched: number;
    errors: number;
    total: number;
};

/**
 * นำเข้ารายชื่อลง verifiedLawyers (Admin SDK) — ไม่ตรวจสิทธิ์ ผู้เรียกต้องตรวจเอง
 *
 * กันซ้ำ 2 ชั้น: id คงที่ (เลขใบอนุญาต หรือ hash ชื่อ-สกุล) และค้นชื่อ+สกุลที่มีอยู่แล้ว
 * (รายชื่อเก่าใช้ id รูปแบบอื่น เช่น ชื่อ-สกุล-timestamp) ถ้าพบของเดิมที่ยังไม่มีที่มา
 * จะเติม announcementDate/sourceUrl/licenseType ให้ แต่ไม่แตะเลขใบอนุญาตหรือสถานะ
 */
export async function importLawyersCore(
    db: FirebaseFirestore.Firestore,
    lawyers: ExtractedLawyer[],
): Promise<ImportResult> {
    const col = db.collection('verifiedLawyers');
    const result: ImportResult = { success: 0, duplicates: 0, enriched: 0, errors: 0, total: lawyers.length };

    for (const lawyer of lawyers) {
        try {
            const firstName = (lawyer.firstName || '').trim();
            const lastName = (lawyer.lastName || '').trim();
            const licenseNumber = normalizeLicense(lawyer.licenseNumber);
            if (!firstName || !lastName) {
                result.errors++;
                continue;
            }
            // เลขที่กรอก/อ่านมาแต่ผิดรูปแบบ → ไม่นำเข้า (ไม่เดาแก้ให้) ให้แอดมินแก้แล้วนำเข้าใหม่
            if (licenseNumber && !LICENSE_RE.test(licenseNumber)) {
                result.errors++;
                continue;
            }

            const hasLicense = licenseNumber !== '';
            const docId = hasLicense
                ? licenseNumber.replace(/\//g, '-')
                : `name-${createHash('sha1').update(`${firstName}|${lastName}`).digest('hex').slice(0, 20)}`;
            const docRef = col.doc(docId);
            const announcementDate = lawyer.announcementDate?.trim() || '';
            const sourceUrl = lawyer.sourceUrl?.trim() || '';
            const licenseType = lawyer.licenseType?.trim() || '';

            const existing = await docRef.get();
            const sameName = existing.exists
                ? existing
                : (await col.where('firstName', '==', firstName).where('lastName', '==', lastName).limit(1).get()).docs[0];

            if (sameName) {
                const d = sameName.data() || {};
                if (sourceUrl && !d.sourceUrl) {
                    await sameName.ref.update({
                        sourceUrl,
                        announcementDate: d.announcementDate || announcementDate,
                        licenseType: d.licenseType || licenseType,
                    });
                    result.enriched++;
                } else {
                    result.duplicates++;
                }
                continue;
            }

            const now = new Date().toISOString();
            await docRef.set({
                licenseNumber,
                firstName,
                lastName,
                prefix: (lawyer.prefix || '').trim(),
                licenseType,
                province: '',
                // มีเลขจากเอกสารทะเบียน → active · มีแค่ชื่อในประกาศรับใบอนุญาต → announced
                status: hasLicense ? 'active' : 'announced',
                source: 'document_import',
                announcementDate,
                sourceUrl,
                updatedAt: now,
                importedAt: now,
            });
            result.success++;
        } catch (err: any) {
            console.error('[importLawyersCore] Error:', err?.message || err);
            result.errors++;
        }
    }

    return result;
}
