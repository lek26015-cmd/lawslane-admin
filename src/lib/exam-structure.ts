import 'server-only';
import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from '@google/generative-ai';
import { getGeminiModelName } from './gemini-model';
import { describeGeminiError } from './exam-ocr';
import {
    type AnswerKeyEntry,
    type ImportPageText,
    type ImportQuestion,
    type StructureChunkResult,
    choiceLabelToIndex,
    detectFormRequirement,
    normalizeThaiText,
    sanitizeImportQuestion,
    splitExamPagesByRules,
    stripQuestionNumber,
    toArabicDigits,
} from './exam-import';

/**
 * จัดโครงสร้างข้อสอบจากข้อความ OCR ด้วย Gemini (JSON mode) ทีละกลุ่มหน้า
 *
 * AI ทำงานที่กฎทำได้ไม่ดี: แยกโจทย์/เอกสารแนบ/เฉลย, ต่อบรรทัดเป็นย่อหน้า, ปรนัย/อัตนัย
 * แต่ห้ามเชื่อผลตรงๆ — ทุกฟิลด์ผ่าน sanitizeImportQuestion และตรวจว่า "มาจากเอกสารจริง"
 * (ข้อความต้องพบในต้นฉบับ, เฉลยต้องมีหัวข้อเฉลยในต้นฉบับ) ถ้า AI ล้มใช้ตัวแยกแบบกฎแทน
 */

export interface StructureContext {
    /** เลขข้อสุดท้ายจากกลุ่มหน้าก่อนหน้า */
    lastQuestionNumber?: string | null;
    /** ข้อสุดท้ายของกลุ่มก่อนกำลังอยู่ในเอกสารแนบไหม */
    inAttachment?: boolean;
    /** ท้ายข้อความของกลุ่มก่อน (≤ 400 ตัว) ให้ AI รู้ว่ากำลังต่อจากอะไร */
    tail?: string;
    title?: string;
}

const STRUCTURE_PROMPT = `คุณคือผู้ช่วยจัดรูปแบบข้อสอบกฎหมายไทยจากข้อความที่ OCR มาแล้ว
งานของคุณคือ "จัดโครงสร้าง" เท่านั้น ห้ามแต่ง ห้ามสรุป ห้ามแปล ห้ามแก้ถ้อยคำทางกฎหมาย

กติกา:
1. ถอดข้อความตามต้นฉบับทุกตัวอักษร คงเลขไทย/อารบิกตามต้นฉบับ แก้ได้เฉพาะ
   - ต่อบรรทัดที่ถูกตัดตามความกว้างกระดาษให้เป็นย่อหน้าเดียวกัน
   - คงการขึ้นย่อหน้าใหม่และข้อย่อย (ก) (ข) / (๑) (๒) ไว้ขึ้นบรรทัดใหม่
   - ตัดหัวกระดาษ/ท้ายกระดาษ/เลขหน้า/รหัสวิชาที่ซ้ำทุกหน้า และหน้าปก/คำชี้แจงทั่วไป
2. "questionText" ไม่ต้องมีเลขข้อนำหน้า (ไม่ต้องมี "ข้อ ๑." หรือ "1.") ใส่เลขข้อตามต้นฉบับใน "number" เป็นเลขอารบิก
3. เอกสารแนบ (สัญญา แบบฟอร์ม คำพิพากษา ข้อเท็จจริงประกอบ ตาราง) ที่โจทย์ข้อหนึ่งอ้างถึง
   ให้ใส่ใน "attachmentText" ของข้อนั้นทั้งฉบับ พร้อมชื่อใน "attachmentTitle"
   ข้อสัญญา/ข้อย่อยที่มีเลขในเอกสารแนบ (เช่น "ข้อ ๑." "ข้อ ๕.๒" ของสัญญา) ไม่ใช่ข้อสอบ ห้ามแยกเป็นข้อใหม่
   ถ้าเลขข้อวนกลับไปเริ่ม ๑ ใหม่ หรือมีเลขย่อย ๑.๑ แทบทุกครั้งคือเอกสารแนบ
4. ปรนัย: type = "multiple_choice" ใส่ตัวเลือกใน "choices" เป็นข้อความล้วน (ไม่มี ก. ข. หรือ (1) (2) นำหน้า)
   อัตนัย: type = "essay"
5. เฉลย: ใช้เฉพาะที่มีอยู่ในเอกสาร (หัวข้อ ธงคำตอบ / แนวคำตอบ / เฉลย / คำตอบ / ตารางเฉลยท้ายเล่ม)
   - ปรนัย: "correctChoice" = ลำดับตัวเลือกที่ถูก (1 = ตัวแรก)
   - อัตนัย: "modelAnswer" = ข้อความธงคำตอบตามต้นฉบับ
   - ตารางเฉลยรวม (เช่น "1. ค 2. ก") ที่ไม่ได้อยู่ติดกับข้อ ให้ใส่ใน "answerKey"
   - ห้ามสร้างเฉลยเอง ถ้าเอกสารไม่มีเฉลยให้เว้นว่าง / null
   - ห้ามเหลือข้อความเฉลยไว้ใน questionText
6. "requiresForm" = true เฉพาะข้อที่สั่งให้ผู้สอบร่าง/เรียง/จัดทำเอกสารจริง (เช่น ร่างคำฟ้อง คำให้การ คำร้อง
   คำแถลง อุทธรณ์ ฎีกา หมายเรียก สัญญา พินัยกรรม หนังสือมอบอำนาจ ตั๋วเงิน) และใส่ชนิดเอกสารใน "formType"
7. "issues": ปัญหาที่เห็นในข้อนั้น เช่น อ่านไม่ออก ข้อความขาด ตัวอักษรเพี้ยน (ภาษาไทย สั้นๆ)
8. ข้อความแต่ละหน้าคั่นด้วย "=== หน้า N ===" ใส่เลขหน้าที่ข้อนั้นเริ่มใน "page"
9. ถ้าข้อแรกในข้อความนี้เป็นส่วนต่อจากข้อสุดท้ายของหน้าก่อน (ดูบริบทด้านล่าง) ให้ "continuesPrevious" = true
   และใส่เฉพาะส่วนที่ต่อมา (ถ้ากำลังอยู่ในเอกสารแนบ ให้ใส่ใน attachmentText)
10. "documentKind": "exam" ถ้ามีโจทย์, "answers_only" ถ้ามีแต่เฉลย, "mixed" ถ้ามีทั้งคู่`;

const RESPONSE_SCHEMA: ResponseSchema = {
    type: SchemaType.OBJECT,
    properties: {
        documentKind: { type: SchemaType.STRING, format: 'enum', enum: ['exam', 'answers_only', 'mixed'] },
        questions: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    number: { type: SchemaType.STRING, nullable: true },
                    page: { type: SchemaType.INTEGER, nullable: true },
                    continuesPrevious: { type: SchemaType.BOOLEAN },
                    questionText: { type: SchemaType.STRING },
                    attachmentTitle: { type: SchemaType.STRING, nullable: true },
                    attachmentText: { type: SchemaType.STRING, nullable: true },
                    type: { type: SchemaType.STRING, format: 'enum', enum: ['essay', 'multiple_choice'] },
                    choices: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                    correctChoice: { type: SchemaType.INTEGER, nullable: true },
                    modelAnswer: { type: SchemaType.STRING, nullable: true },
                    requiresForm: { type: SchemaType.BOOLEAN },
                    formType: { type: SchemaType.STRING, nullable: true },
                    issues: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                },
                required: ['questionText', 'type', 'requiresForm'],
            },
        },
        answerKey: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    number: { type: SchemaType.STRING },
                    choice: { type: SchemaType.STRING, nullable: true },
                    answer: { type: SchemaType.STRING, nullable: true },
                },
                required: ['number'],
            },
        },
    },
    required: ['questions'],
};

/** ตัดช่องว่างทั้งหมดไว้เทียบข้อความกับต้นฉบับ */
function squash(s: string): string {
    return normalizeThaiText(s).replace(/\s+/g, '');
}

/**
 * สัดส่วนของข้อความที่พบในต้นฉบับ (สุ่มชิ้นละ 10 ตัวทุก 10 ตัว)
 * ใช้จับกรณี AI แต่ง/สรุปข้อความเองแทนที่จะถอดตามต้นฉบับ
 */
function sourceCoverage(text: string, source: string): number {
    const t = squash(text);
    if (t.length < 10) return 1;
    let found = 0;
    let total = 0;
    for (let i = 0; i + 10 <= t.length; i += 10) {
        total++;
        if (source.includes(t.slice(i, i + 10))) found++;
    }
    return total ? found / total : 1;
}

// ต้องเป็นหัวข้อเฉลยจริง — ไม่นับ "ตอบ" ลอยๆ เพราะคำชี้แจงอย่าง "จงตอบคำถาม" มีแทบทุกชุด
const ANSWER_WORDS = /ธงคำตอบ|แนวคำตอบ|แนวการตอบ|เฉลย|^\s*คำตอบ|ตอบ\s*\(?[ก-จ1-5๑-๕]\)?(?=\s|$)|answer/im;

/** ตรวจ/แปลงผลจาก AI ให้เป็น ImportQuestion ที่เชื่อได้ */
export function validateAiOutput(raw: unknown, pages: ImportPageText[]): StructureChunkResult {
    const out = raw as Record<string, unknown>;
    if (!out || !Array.isArray(out.questions)) throw new Error('AI ไม่คืนรายการข้อ');

    const sourceRaw = pages.map(p => p.text).join('\n');
    const source = squash(sourceRaw);
    const hasAnswerSection = ANSWER_WORDS.test(sourceRaw);
    const pageNums = new Set(pages.map(p => p.page));
    const warnings: string[] = [];

    const questions: ImportQuestion[] = [];
    for (const item of out.questions as Record<string, unknown>[]) {
        if (!item || typeof item !== 'object') continue;
        const correctChoice = typeof item.correctChoice === 'number' ? item.correctChoice : null;
        const q = sanitizeImportQuestion({
            ...item,
            questionText: typeof item.questionText === 'string' ? stripQuestionNumber(item.questionText) : '',
            sourcePage: typeof item.page === 'number' && pageNums.has(item.page) ? item.page : null,
            correctAnswer: correctChoice ? `(${correctChoice})` : '',
            notes: Array.isArray(item.issues) ? item.issues : [],
        });
        if (!q) continue;
        if (q.type === 'multiple_choice' && q.choices.length < 2) {
            q.type = 'essay';
            q.choices = [];
            q.correctAnswer = '';
            q.notes.push('AI ระบุเป็นปรนัยแต่ไม่มีตัวเลือก — เปลี่ยนเป็นอัตนัย');
        }

        // ห้ามมีเฉลยที่ไม่ได้มาจากเอกสาร
        if (!hasAnswerSection && (q.modelAnswer || q.correctAnswer)) {
            q.modelAnswer = '';
            q.correctAnswer = '';
            q.notes.push('ตัดเฉลยที่ AI ให้มาเพราะไม่พบส่วนเฉลยในเอกสาร');
        }
        if (q.modelAnswer && sourceCoverage(q.modelAnswer, source) < 0.6) {
            q.modelAnswer = '';
            q.notes.push('ตัดธงคำตอบที่ไม่ตรงกับต้นฉบับ (AI อาจแต่งเอง)');
        }

        // ข้อความต้องถอดตามต้นฉบับ ไม่ใช่สรุปใหม่
        const coverage = sourceCoverage(`${q.questionText}${q.attachmentText}`, source);
        if (coverage < 0.6) {
            q.notes.push(`ข้อความจาก AI ตรงกับต้นฉบับเพียง ${Math.round(coverage * 100)}% — ตรวจเทียบกับภาพ`);
        }

        // AI บอกว่าไม่ต้องใช้แบบฟอร์มแต่กฎเจอคำสั่ง "ร่าง..." → เปิดไว้ให้แอดมินตัดสิน
        if (!q.requiresForm) {
            const form = detectFormRequirement(q.questionText);
            if (form) { q.requiresForm = true; q.formType = form; }
        }
        q.include = q.continuesPrevious ? true : q.questionText.length > 0 || q.attachmentText.length > 0;
        questions.push(q);
    }

    const answerKey: AnswerKeyEntry[] = [];
    if (Array.isArray(out.answerKey) && hasAnswerSection) {
        for (const e of out.answerKey as Record<string, unknown>[]) {
            const number = typeof e?.number === 'string' ? toArabicDigits(e.number.trim()) : '';
            if (!/^\d{1,3}$/.test(number)) continue;
            const choice = typeof e.choice === 'string' ? choiceLabelToIndex(e.choice) : null;
            const answer = typeof e.answer === 'string' ? normalizeThaiText(e.answer).slice(0, 20000) : '';
            if (answer && sourceCoverage(answer, source) < 0.6) continue;
            if (choice || answer) answerKey.push({ number, choice, answer });
        }
    }

    const kind = out.documentKind;
    return {
        engine: 'ai',
        questions,
        answerKey,
        warnings,
        documentKind: kind === 'answers_only' || kind === 'mixed' ? kind : 'exam',
    };
}

/**
 * จัดโครงสร้าง 1 กลุ่มหน้า: ลอง Gemini ก่อน ถ้าล้ม/ผลใช้ไม่ได้ ใช้ตัวแยกแบบกฎ
 */
export async function structureExamChunk(
    pages: ImportPageText[],
    context: StructureContext,
    budgetMs = 50000,
): Promise<StructureChunkResult> {
    const cleaned = pages.map(p => ({ page: p.page, text: normalizeThaiText(p.text) }));
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    let aiError = 'ยังไม่ได้ตั้งค่า GOOGLE_GENAI_API_KEY';

    if (apiKey) {
        try {
            const modelName = getGeminiModelName();
            const generationConfig: Record<string, unknown> = {
                temperature: 0,
                responseMimeType: 'application/json',
                responseSchema: RESPONSE_SCHEMA,
                maxOutputTokens: 32768,
            };
            // รุ่น 2.5 "คิด" ก่อนตอบโดยค่าเริ่มต้น ซึ่งช้าและไม่จำเป็นกับงานจัดรูปแบบ
            if (/2\.5-flash/.test(modelName)) generationConfig.thinkingConfig = { thinkingBudget: 0 };

            const model = new GoogleGenerativeAI(apiKey).getGenerativeModel(
                { model: modelName, generationConfig },
                { timeout: budgetMs },
            );
            const ctx = [
                context.title ? `ชื่อวิชา: ${context.title}` : '',
                context.lastQuestionNumber ? `ข้อสุดท้ายของหน้าก่อนหน้าคือข้อ ${context.lastQuestionNumber}` : 'นี่คือส่วนแรกของเอกสาร',
                context.inAttachment ? 'ข้อสุดท้ายของหน้าก่อนกำลังอยู่ในเอกสารแนบ' : '',
                context.tail ? `ท้ายข้อความหน้าก่อน: """${context.tail.slice(-400)}"""` : '',
            ].filter(Boolean).join('\n');
            const body = cleaned.map(p => `=== หน้า ${p.page} ===\n${p.text}`).join('\n\n');

            const result = await model.generateContent(`${STRUCTURE_PROMPT}\n\nบริบท:\n${ctx}\n\nข้อความ:\n${body}`);
            const parsed = JSON.parse(result.response.text());
            const validated = validateAiOutput(parsed, cleaned);
            if (validated.questions.length > 0 || validated.answerKey.length > 0) return validated;
            aiError = 'AI ไม่พบข้อสอบในหน้านี้';
        } catch (e) {
            console.error('EXAM_STRUCTURE_AI_ERROR', e);
            aiError = e instanceof SyntaxError ? 'AI ตอบไม่เป็น JSON ที่ถูกต้อง' : describeGeminiError(e);
        }
    }

    const fallback = splitExamPagesByRules(cleaned);
    // กลุ่มหน้าต่อจากกลุ่มก่อน: ข้อความก่อน "ข้อ" แรกคือส่วนต่อของข้อก่อน ไม่ใช่คำชี้แจง
    // (ทั้งกรณีมีข้อความก่อนข้อแรก และกรณีทั้งกลุ่มไม่มีเลขข้อเลย)
    if (context.lastQuestionNumber && fallback.questions[0] && fallback.questions[0].number === null) {
        fallback.warnings = fallback.warnings.filter(w => !w.startsWith('ไม่พบเลขข้อ'));
        const first = fallback.questions[0];
        first.continuesPrevious = true;
        first.include = true;
        first.notes = [];
        if (context.inAttachment) {
            first.attachmentText = first.questionText;
            first.questionText = '';
        }
    }
    fallback.warnings.unshift(`หน้า ${pages.map(p => p.page).join(', ')}: แยกข้อด้วยกฎแทน AI (${aiError})`);
    return fallback;
}
