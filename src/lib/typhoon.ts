
const TYPHOON_API_URL = 'https://api.opentyphoon.ai/v1/chat/completions';
const TYPHOON_MODEL = 'typhoon-v2.1-12b-instruct';

export async function callTyphoonAI(prompt: string, languageInstruction: string = "ตอบเป็นภาษาไทย"): Promise<string> {
    const apiKey = process.env.TYPHOON_API_KEY;

    if (!apiKey) {
        console.warn("Typhoon API Key is missing.");
        return "";
    }

    try {
        console.log("Calling Typhoon AI...");
        const response = await fetch(TYPHOON_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: TYPHOON_MODEL,
                messages: [
                    { role: "system", content: `คุณคือผู้ช่วยทนายความ AI ของ Lawslane แพลตฟอร์มกฎหมายไทย หน้าที่ของคุณคือให้คำแนะนำเบื้องต้นเกี่ยวกับกฎหมายไทยอย่างถูกต้องและเข้าใจง่าย หากไม่แน่ใจให้แนะนำปรึกษาทนายความ\n\nคำสั่งเพิ่มเติม: ${languageInstruction}` },
                    { role: "user", content: prompt }
                ],
                max_tokens: 512,
                temperature: 0.7,
                top_p: 0.9,
                repetition_penalty: 1.05,
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Typhoon API Error: ${response.status} - ${errorText}`);
            return "";
        }

        const data = await response.json() as any;
        return data.choices?.[0]?.message?.content || "";

    } catch (error) {
        console.error("Error calling Typhoon AI:", error);
        return "";
    }
}

const TYPHOON_OCR_URL = 'https://api.opentyphoon.ai/v1/chat/completions'; // OCR uses the same chat endpoint but with image input
const TYPHOON_OCR_MODEL = 'typhoon-ocr';

export async function callTyphoonOCR(fileBuffer: Buffer): Promise<string> {
    const apiKey = process.env.TYPHOON_API_KEY;

    if (!apiKey) {
        console.error("Typhoon OCR Error: API Key is missing in environment variables.");
        return "";
    }

    try {
        console.log(`Calling Typhoon OCR with buffer size: ${fileBuffer.length} bytes`);
        const base64File = fileBuffer.toString('base64');

        const response = await fetch(TYPHOON_OCR_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: TYPHOON_OCR_MODEL,
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "Extract text from this document." },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:application/pdf;base64,${base64File}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 2048,
                temperature: 0.1,
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Typhoon OCR API Failed: Status ${response.status} - ${errorText}`);
            return "";
        }

        const data = await response.json() as any;
        const content = data.choices?.[0]?.message?.content || "";
        console.log(`Typhoon OCR Success: Extracted ${content.length} characters.`);
        return content;

    } catch (error) {
        console.error("Typhoon OCR Exception:", error);
        return "";
    }
}
