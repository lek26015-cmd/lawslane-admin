
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfRequire = require('pdf-parse');

const WORKER_URL = 'https://lawslane-rag-api.lawlanes-app.workers.dev';
// worker ปิด /ingest ถ้าไม่มี key — ตั้งใน .env.local หรือ shell: RAG_INGEST_KEY=...
const RAG_INGEST_KEY = process.env.RAG_INGEST_KEY;
if (!RAG_INGEST_KEY) throw new Error('RAG_INGEST_KEY is not set');
const PDF_DIR = path.join(process.cwd(), 'src/data/pdfs');

async function loadPdf(filePath: string): Promise<string> {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        // @ts-ignore
        const parser = new pdfRequire.PDFParse(new Uint8Array(dataBuffer));
        // @ts-ignore
        const data = await parser.getText();
        return data?.text || '';
    } catch (error) {
        console.error(`Error parsing ${filePath}:`, error);
        return '';
    }
}

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

async function ingestChunk(text: string, metadata: any) {
    try {
        const response = await fetch(`${WORKER_URL}/ingest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Lawslane-Ingestor/1.0',
                'Authorization': `Bearer ${RAG_INGEST_KEY}`,
            },
            body: JSON.stringify({ text, metadata, id: metadata.id })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to ingest: ${response.status} ${response.statusText} - ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Ingest error:', error);
        return null;
    }
}

async function main() {
    console.log(`Scanning PDFs in ${PDF_DIR}...`);
    if (!fs.existsSync(PDF_DIR)) {
        console.error('PDF directory not found!');
        return;
    }

    const files = fs.readdirSync(PDF_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));
    console.log(`Found ${files.length} PDF files.`);

    for (const file of files) {
        console.log(`Processing ${file}...`);
        const filePath = path.join(PDF_DIR, file);
        const text = await loadPdf(filePath);

        if (!text) {
            console.warn(`Skipping empty file: ${file}`);
            continue;
        }

        const chunks = chunkText(text);
        console.log(`  - Generated ${chunks.length} chunks.`);

        // Check if file already exists (check first chunk ID)
        const firstChunkId = require('crypto').createHash('md5').update(`${file}-0`).digest('hex');
        try {
            // Check if file already exists (DISABLED to force re-ingestion)
            /*
            const checkRes = await fetch(`${WORKER_URL}/exists`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RAG_INGEST_KEY}` },
                body: JSON.stringify({ id })
            });
            const checkData = await checkRes.json() as any;
            if (checkData.exists) {
                console.log(`  - File ${file} already exists. Skipping.`);
                continue;
            }
            */
        } catch (e) {
            console.warn(`  - Failed to check existence for ${file}, proceeding with upload.`);
        }

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            // Generate deterministic ID to prevent duplicates
            const id = require('crypto').createHash('md5').update(`${file}-${i}`).digest('hex');

            await ingestChunk(chunk, {
                source: file,
                chunkIndex: i,
                totalChunks: chunks.length,
                text: chunk,
                id // Pass the deterministic ID
            });
            // Small delay to avoid rate limits
            await new Promise(r => setTimeout(r, 200));
        }
        console.log(`  - Uploaded ${chunks.length} chunks.`);
    }
    console.log('Ingestion complete!');
}

main();
