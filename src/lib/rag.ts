
// โฮสต์ lawslane-app.workers.dev ไม่มีอยู่แล้ว (DNS ไม่ resolve) — ตัวที่ใช้งานจริงคือ lawlanes-app
export const RAG_WORKER_URL = process.env.NEXT_PUBLIC_RAG_WORKER_URL || 'https://lawslane-rag-api.lawlanes-app.workers.dev';
const WORKER_URL = RAG_WORKER_URL;

// server-only: ห้ามตั้งเป็น NEXT_PUBLIC_
export function ragAuthHeaders(kind: 'query' | 'ingest' = 'query'): Record<string, string> {
    const key = kind === 'ingest' ? process.env.RAG_INGEST_KEY : process.env.RAG_QUERY_KEY;
    return key ? { Authorization: `Bearer ${key}` } : {};
}

export async function retrieveDocuments(query: string, topK: number = 5): Promise<Array<{ source: string, content: string, score: number }>> {
    try {
        console.log(`Querying Cloudflare RAG for: "${query}"`);

        const response = await fetch(`${WORKER_URL}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...ragAuthHeaders() },
            body: JSON.stringify({ question: query })
        });

        if (!response.ok) {
            console.error(`Cloudflare RAG Error: ${response.statusText}`);
            return [];
        }

        const data = await response.json() as any;

        if (!data || !data.matches || data.matches.length === 0) {
            console.warn("No matches found in Cloudflare RAG.");
            return [];
        }

        return data.matches.map((match: any) => ({
            source: match.metadata?.source || 'Unknown',
            content: match.metadata?.text || '',
            score: match.score || 0
        }));

    } catch (error) {
        console.error("Error in retrieveDocuments:", error);
        return [];
    }
}

export async function retrieveContext(query: string, topK: number = 5): Promise<string> {
    const docs = await retrieveDocuments(query, topK);
    return docs.map(doc => `--- Source: ${doc.source} ---\n${doc.content}`).join('\n\n');
}

// Keep generateIndex as a no-op or remove it, but legal-qa-flow might not call it.
// Actually, legal-qa-flow only calls retrieveContext.
// But I should check if anything else calls generateIndex.
export async function generateIndex(): Promise<void> {
    console.log("Index generation is now handled by Cloudflare Worker ingestion script.");
}

