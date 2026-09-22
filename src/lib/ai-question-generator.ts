import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || '');

export interface GeneratedQuestion {
    text: string;
    type: 'MULTIPLE_CHOICE' | 'ESSAY';
    options?: string[];
    correctOptionIndex?: number;
    correctAnswerText?: string;
    explanation?: string;
    subject?: string;
}

interface GenerateQuestionsInput {
    topic: string;
    category?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    questionType?: 'MULTIPLE_CHOICE' | 'ESSAY' | 'MIXED';
    count?: number;
}

/**
 * Generate exam questions using Gemini AI
 */
export async function generateQuestions(input: GenerateQuestionsInput): Promise<GeneratedQuestion[]> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const count = input.count || 5;
    const type = input.questionType || 'MIXED';
    const difficulty = input.difficulty || 'medium';

    const difficultyDesc = {
        easy: 'ง่าย สำหรับผู้เริ่มต้น',
        medium: 'ปานกลาง สำหรับผู้ที่มีพื้นฐาน',
        hard: 'ยาก สำหรับผู้เชี่ยวชาญ ต้องการการวิเคราะห์เชิงลึก'
    }[difficulty];

    const typeInstructions = {
        MULTIPLE_CHOICE: 'ทุกข้อเป็นปรนัย 4 ตัวเลือก พร้อมระบุคำตอบที่ถูกต้อง',
        ESSAY: 'ทุกข้อเป็นอัตนัย พร้อมธงคำตอบละเอียด',
        MIXED: 'ผสมระหว่างปรนัยและอัตนัย ประมาณครึ่งต่อครึ่ง'
    }[type];

    const prompt = `คุณเป็นผู้เชี่ยวชาญด้านกฎหมายไทย กรุณาสร้างข้อสอบกฎหมาย ${count} ข้อ

**หัวข้อ**: ${input.topic}
**หมวดหมู่**: ${input.category || 'กฎหมายทั่วไป'}
**ระดับความยาก**: ${difficultyDesc}
**ประเภทคำถาม**: ${typeInstructions}

กรุณาสร้างคำถามที่:
1. ทันสมัย อ้างอิงกฎหมายปัจจุบัน
2. มีความชัดเจน ไม่กำกวม
3. เน้นการนำไปใช้จริง ไม่ใช่แค่ท่องจำ
4. สำหรับข้อปรนัย - ตัวเลือกต้องสมเหตุสมผล ไม่ชัดเจนเกินไป
5. สำหรับข้ออัตนัย - ธงคำตอบต้องละเอียดพอที่จะใช้ตรวจได้

ตอบเป็น JSON array เท่านั้น:
[
  {
    "text": "คำถาม",
    "type": "MULTIPLE_CHOICE" หรือ "ESSAY",
    "options": ["ตัวเลือก1", "ตัวเลือก2", "ตัวเลือก3", "ตัวเลือก4"],
    "correctOptionIndex": 0,
    "correctAnswerText": "ธงคำตอบสำหรับอัตนัย",
    "explanation": "คำอธิบายเพิ่มเติม",
    "subject": "หมวดวิชาย่อย"
  }
]

หมายเหตุ:
- ข้อปรนัย: ใช้ options + correctOptionIndex
- ข้ออัตนัย: ใช้ correctAnswerText`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse JSON from response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]) as GeneratedQuestion[];
            return parsed.map(q => ({
                text: q.text || '',
                type: q.type || 'MULTIPLE_CHOICE',
                options: q.type === 'MULTIPLE_CHOICE' ? q.options : undefined,
                correctOptionIndex: q.type === 'MULTIPLE_CHOICE' ? q.correctOptionIndex : undefined,
                correctAnswerText: q.type === 'ESSAY' ? q.correctAnswerText : undefined,
                explanation: q.explanation,
                subject: q.subject
            }));
        }

        throw new Error('Invalid AI response format');
    } catch (error) {
        console.error('AI Question Generation Error:', error);
        return [];
    }
}
