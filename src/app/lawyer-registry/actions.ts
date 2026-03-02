'use server';

const pdf = require('pdf-parse');

export async function extractTextFromPdf(formData: FormData) {
    const file = formData.get('file') as File;
    if (!file) {
        throw new Error('No file provided');
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const data = await pdf(buffer);
        return { text: data.text, info: data.info };
    } catch (error) {
        console.error('Error parsing PDF:', error);
        throw new Error('Failed to parse PDF');
    }
}
