
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Question, AIAnalysisResult, ExamResult, RecommendedMaterial } from '@/lib/education-types';
import { initAdmin } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

// Initialize Gemini
// NOTE: Make sure NEXT_PUBLIC_GEMINI_API_KEY is allowed for server-side use or use a separate server key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { questions, userAnswers, examId, userId } = body;

        let analysisData: ExamResult;

        if (!process.env.GEMINI_API_KEY && !process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
            console.warn("Missing Gemini API Key. Returning mock analysis.");
            analysisData = mockAnalysis(questions, userAnswers);
        } else {
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });

            // Construct Prompt
            const prompt = constructPrompt(questions, userAnswers);

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Extract JSON from response (Gemini might wrap in ```json ... ```)
            const jsonStr = text.replace(/```json|```/g, '').trim();
            analysisData = JSON.parse(jsonStr);
        }

        // Save to Firestore
        if (userId) {
            try {
                const app = await initAdmin();
                if (app) {
                    const db = admin.firestore(app);
                    await db.collection('student_exam_results').add({
                        userId,
                        examId,
                        questions, // Optional: save questions if they change over time
                        answers: userAnswers,
                        result: analysisData,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        score: analysisData.totalScore || 0,
                    });
                }
            } catch (fsError) {
                console.error("Failed to save exam result to Firestore:", fsError);
                // Continue to return the result even if saving fails
            }
        }

        return NextResponse.json(analysisData);

    } catch (error) {
        console.error("AI Analysis Error:", error);
        // Fallback to mock if AI fails
        const fallbackData = mockAnalysis(error, {});
        return NextResponse.json(fallbackData);
    }
}

function constructPrompt(questions: Question[], answers: Record<string, string>): string {
    let prompt = `
    You are a senior lawyer and law professor in Thailand. 
    Analyze the following exam answers provided by a law student.
    
    The exam consists of the following questions and "Flag Answers" (Model Solutions).
    Compare the student's answer with the Flag Answer.
    
    Return the response strictly in JSON format with the following structure:
    {
      "analysis": [
        {
          "questionId": "string",
          "score": number (0-10),
          "feedback": "string (Thai)",
          "strengths": ["string"],
          "weaknesses": ["string"],
          "suggestions": ["string"]
        }
      ],
      "overallFeedback": "string (Thai)",
      "recommendedMaterials": [
        {
          "title": "string",
          "type": "BOOK" | "ARTICLE" | "LAW",
          "reason": "string"
        }
      ]
    }

    Questions:
    `;

    questions.forEach((q, index) => {
        prompt += `
        [Question ${index + 1}] (ID: ${q.id})
        Text: ${q.text}
        Flag Answer (Correct/Guideline): ${q.correctAnswerText || 'N/A'}
        Student Answer: ${answers[q.id] || 'NO ANSWER'}
        -----------------------------------
        `;
    });

    return prompt;
}

function mockAnalysis(questions: any, answers: any): ExamResult {
    return {
        attemptId: "mock-result",
        totalScore: 7,
        analysis: [
            {
                questionId: "q1",
                score: 7,
                feedback: "ตอบได้ดี จับประเด็นเรื่องการฟ้องบังคับคดีได้ถูกต้อง แต่อธิบายเรื่องดอกเบี้ยยังไม่ครบถ้วน",
                strengths: ["จับประเด็นหลักได้", "อ้างข้อกฎหมายถูกต้อง"],
                weaknesses: ["ขาดรายละเอียดเรื่องดอกเบี้ย"],
                suggestions: ["ควรระบุอัตราดอกเบี้ยและวันที่เริ่มนับดอกเบี้ยด้วย"]
            }
        ],
        overallFeedback: "ภาพรวมทำได้ดี เข้าใจหลักกฎหมายพื้นฐาน แต่ควรเพิ่มรายละเอียดในการปรับบท",
        recommendedMaterials: [
            {
                title: "ประมวลกฎหมายแพ่งและพาณิชย์ บรรพ 2",
                type: "LAW",
                reason: "ทบทวนเรื่องหนี้และสัญญา"
            }
        ]
    };
}
