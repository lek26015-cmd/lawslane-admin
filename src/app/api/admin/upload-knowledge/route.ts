
import { NextRequest, NextResponse } from 'next/server';
import { parsePdfFromBuffer } from '@/lib/pdf-loader';
import crypto from 'crypto';

const WORKER_URL = 'https://lawslane-rag-api.lawslane-app.workers.dev';

function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        chunks.push(text.slice(start, end));
        start += chunkSize - overlap;
    }
    return chunks;
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (!file.name.toLowerCase().endsWith('.pdf')) {
            return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const text = await parsePdfFromBuffer(buffer);

        if (!text || text.trim().length === 0) {
            return NextResponse.json({
                error: 'Could not extract text from PDF. If this is a scanned document (image-only), please convert it to a text-based PDF or upload images directly.'
            }, { status: 400 });
        }

        const chunks = chunkText(text);

        // Check if file already exists
        const firstChunkId = crypto.createHash('md5').update(`${file.name}-0`).digest('hex');
        try {
            const checkRes = await fetch(`${WORKER_URL}/exists`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: firstChunkId })
            });
            const checkData = await checkRes.json() as any;
            if (checkData.exists) {
                return NextResponse.json({ error: 'File already exists in the database' }, { status: 409 });
            }
        } catch (e) {
            console.warn(`Failed to check existence for ${file.name}, proceeding with upload.`);
        }

        let uploadedChunks = 0;

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const id = crypto.createHash('md5').update(`${file.name}-${i}`).digest('hex');

            try {
                const response = await fetch(`${WORKER_URL}/ingest`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Lawslane-Admin/1.0'
                    },
                    body: JSON.stringify({
                        text: chunk,
                        metadata: {
                            source: file.name,
                            chunkIndex: i,
                            totalChunks: chunks.length,
                            text: chunk,
                            id
                        },
                        id
                    })
                });

                if (!response.ok) {
                    console.error(`Failed to upload chunk ${i}: ${response.statusText}`);
                } else {
                    uploadedChunks++;
                }
            } catch (err) {
                console.error(`Error uploading chunk ${i}:`, err);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${file.name}`,
            chunks: chunks.length,
            uploaded: uploadedChunks
        });

    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
