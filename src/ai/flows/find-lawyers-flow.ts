
'use server';
/**
 * @fileOverview Vector AI Matchmaking flow — finds the best-matching lawyers
 * by querying Cloudflare Vectorize for semantic similarity against lawyer profiles.
 * Replaces the old Gemini LLM category-classification approach.
 */

import { z } from 'zod';

const WORKER_URL = 'https://lawslane-rag-api.lawslane-app.workers.dev';

const FindLawyersInputSchema = z.object({
  problem: z.string().describe("The user's description of their legal problem."),
});

const FindLawyersOutputSchema = z.object({
  matchedLawyerIds: z.array(z.string()).describe('Ordered list of matched lawyer IDs from vector search.'),
  specialties: z.array(z.string()).describe('Kept for backward compatibility — now empty.'),
});

export type FindLawyersInput = z.infer<typeof FindLawyersInputSchema>;
export type FindLawyersOutput = z.infer<typeof FindLawyersOutputSchema>;

export async function findLawyerSpecialties(input: FindLawyersInput): Promise<FindLawyersOutput> {
  if (!input.problem.trim()) {
    return { matchedLawyerIds: [], specialties: [] };
  }

  try {
    console.log(`[Vector Matchmaking] Querying for: "${input.problem}"`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${WORKER_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: input.problem,
        filter: { type: 'lawyer' },
        topK: 10,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Cannot read error');
      console.error(`[Vector Matchmaking] Worker error: ${response.status}`, errorText);
      return { matchedLawyerIds: [], specialties: [] };
    }

    const data = await response.json() as any;

    if (!data || !data.matches || data.matches.length === 0) {
      console.warn('[Vector Matchmaking] No matches found.');
      return { matchedLawyerIds: [], specialties: [] };
    }

    const lawyerIds: string[] = [];
    for (const match of data.matches) {
      const lawyerId = match.metadata?.lawyerId;
      if (lawyerId && !lawyerIds.includes(lawyerId)) {
        lawyerIds.push(lawyerId);
      }
    }

    console.log(`[Vector Matchmaking] Found ${lawyerIds.length} matching lawyers:`, lawyerIds);

    return {
      matchedLawyerIds: lawyerIds,
      specialties: [],
    };
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    console.error('[Vector Matchmaking] Error:', isTimeout ? 'Request timeout' : error);
    return { matchedLawyerIds: [], specialties: [] };
  }
}
