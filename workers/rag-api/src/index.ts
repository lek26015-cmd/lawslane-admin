
export interface Env {
    VECTORIZE_INDEX: any;
    AI: any;
}

export default {
    async fetch(request: Request, env: Env) {
        const url = new URL(request.url);

        if (request.method === 'POST' && url.pathname === '/ingest') {
            try {
                const { text, metadata, id: providedId } = await request.json() as any;
                if (!text) return new Response("Missing text", { status: 400 });

                const { data } = await env.AI.run('@cf/baai/bge-m3', { text: [text] });
                const values = data[0];

                if (!values) return new Response("Failed to generate embeddings", { status: 500 });

                const id = providedId || crypto.randomUUID();
                await env.VECTORIZE_INDEX.upsert([{
                    id,
                    values,
                    metadata: metadata || {}
                }]);

                return new Response(JSON.stringify({ id, status: "indexed" }), { headers: { "Content-Type": "application/json" } });
            } catch (e: any) {
                return new Response(`Error: ${e.message}`, { status: 500 });
            }
        }

        if (request.method === 'POST' && url.pathname === '/query') {
            try {
                const { question } = await request.json() as any;
                if (!question) return new Response("Missing question", { status: 400 });

                const { data } = await env.AI.run('@cf/baai/bge-m3', { text: [question] });
                const values = data[0];

                if (!values) return new Response("Failed to generate embeddings", { status: 500 });

                const searchResult = await env.VECTORIZE_INDEX.query(values, { topK: 5, returnMetadata: true });

                return new Response(JSON.stringify(searchResult), { headers: { "Content-Type": "application/json" } });
            } catch (e: any) {
                return new Response(`Error: ${e.message}`, { status: 500 });
            }
        }

        if (request.method === 'POST' && url.pathname === '/exists') {
            try {
                const { id } = await request.json() as any;
                if (!id) return new Response("Missing id", { status: 400 });

                const vectors = await env.VECTORIZE_INDEX.getByIds([id]);
                const exists = vectors.length > 0;

                return new Response(JSON.stringify({ exists }), { headers: { "Content-Type": "application/json" } });
            } catch (e: any) {
                return new Response(`Error: ${e.message}`, { status: 500 });
            }
        }

        return new Response("Not Found", { status: 404 });
    }
};
