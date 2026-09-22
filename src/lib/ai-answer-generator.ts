import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || '');

export interface AnswerGenerationInput {
    questionText: string;
    questionType: string;
    choices?: string[];
    subjectCode?: string;
    examLevel?: string;
    fewShotExamples?: {
        question: string;
        answer: string;
    }[];
}

export interface GeneratedAnswer {
    modelAnswer: string;
    explanation: string;
    isAiGenerated: true;
}

/**
 * Generate a model answer for a law exam question using Gemini AI
 */
export async function generateAnswer(input: AnswerGenerationInput): Promise<GeneratedAnswer> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Build few-shot examples
    let examplesText = '';
    if (input.fewShotExamples && input.fewShotExamples.length > 0) {
        examplesText = '\n\n**ตัวอย่างธงคำตอบจากชุดข้อสอบเดียวกัน:**\n';
        for (const ex of input.fewShotExamples.slice(0, 3)) {
            examplesText += `\n--- ตัวอย่าง ---\nคำถาม: ${ex.question.substring(0, 300)}\nธงคำตอบ: ${ex.answer.substring(0, 500)}\n`;
        }
    }

    // Build choices text
    let choicesText = '';
    if (input.choices && input.choices.length > 0) {
        choicesText = '\n\n**ตัวเลือก:**\n';
        input.choices.forEach((c, i) => {
            choicesText += `(${i + 1}) ${c}\n`;
        });
    }

    const subjectContext = input.subjectCode ? `วิชา: ${input.subjectCode}` : '';
    const levelContext = input.examLevel ? `ระดับ: ${input.examLevel}` : '';

    const prompt = `คุณเป็นอาจารย์กฎหมายผู้เชี่ยวชาญด้านกฎหมายไทย กรุณาวิเคราะห์และสร้างแนวคำตอบสำหรับข้อสอบต่อไปนี้

${subjectContext} ${levelContext}
${examplesText}

**คำถาม:**
${input.questionText}
${choicesText}

กรุณาตอบในรูปแบบ JSON ดังนี้:
{
  "modelAnswer": "แนวคำตอบแบบละเอียด พร้อมอ้างอิงมาตราและหลักกฎหมายที่เกี่ยวข้อง",
  "explanation": "คำอธิบายสั้นๆ และหลักกฎหมายที่ใช้"
}

กฎในการตอบ:
1. อ้างอิงมาตราและหลักกฎหมายให้ชัดเจน
2. ${input.questionType === 'multiple_choice' || input.questionType === 'MULTIPLE_CHOICE' 
    ? 'ระบุตัวเลือกที่ถูกต้องพร้อมเหตุผล' 
    : 'ตอบแบบอัตนัยอย่างละเอียดตามหลักกฎหมาย'}
3. ใช้ภาษาทางกฎหมายที่เป็นทางการ
4. ตอบเป็นภาษาไทยเท่านั้น
5. ตอบเฉพาะ JSON เท่านั้น ไม่ต้องมีข้อความอื่น`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse JSON from response
    try {
        // Extract JSON from possible markdown code blocks
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in response');

        const parsed = JSON.parse(jsonMatch[0]);
        
        return {
            modelAnswer: `⚡ แนวทางคำตอบจากการวิเคราะห์ของ AI\n\n${parsed.modelAnswer || ''}`,
            explanation: parsed.explanation || '',
            isAiGenerated: true,
        };
    } catch (parseError) {
        // Fallback: use raw text
        return {
            modelAnswer: `⚡ แนวทางคำตอบจากการวิเคราะห์ของ AI\n\n${responseText}`,
            explanation: '',
            isAiGenerated: true,
        };
    }
}
