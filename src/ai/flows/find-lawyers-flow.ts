
'use server';
/**
 * @fileOverview An AI flow to find lawyer specialties based on a user's problem description.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAllLawyers } from '@/lib/data';
import { Firestore, getFirestore } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

const FindLawyersInputSchema = z.object({
  problem: z.string().describe("The user's description of their legal problem."),
});

const FindLawyersOutputSchema = z.object({
  specialties: z.array(z.string()).describe('A list of lawyer specialties relevant to the problem.'),
});

export type FindLawyersInput = z.infer<typeof FindLawyersInputSchema>;
export type FindLawyersOutput = z.infer<typeof FindLawyersOutputSchema>;

// This function now dynamically fetches specialties from Firestore
async function getDynamicLawyerSpecialties(db: Firestore): Promise<string[]> {
  const lawyers = await getAllLawyers(db);
  const allSpecialties = lawyers.flatMap(lawyer => lawyer.specialty);
  // Return unique specialties
  return [...new Set(allSpecialties)];
}


const findLawyersPrompt = ai.definePrompt({
  name: 'findLawyersPrompt',
  input: {
    schema: z.object({
      problem: z.string(),
      specialties: z.array(z.string()),
    })
  },
  output: { schema: FindLawyersOutputSchema },
  prompt: `You are an expert legal AI assistant for Lawslane (Thailand).
Your task is to analyze the user's legal problem and identify the most relevant lawyer specialties from the provided list.

Instructions:
1.  **Analyze the Core Issue**: Read the user's problem carefully to understand the specific legal domain (e.g., Family, Criminal, Corporate, Property).
2.  **Match Precisely**: Select ONLY the specialties that directly address the core issue. Do not select loosely related specialties.
3.  **Limit Selection**: Return at most 2 specialties, prioritizing the most critical one.
4.  **Language**: The input will be in Thai. Ensure you understand Thai legal context.

Available Specialties:
{{#each specialties}}
- {{{this}}}
{{/each}}

User's Problem: {{{problem}}}
`,
});

export async function findLawyerSpecialties(input: FindLawyersInput): Promise<FindLawyersOutput> {
  const { firestore } = initializeFirebase();
  if (!firestore) throw new Error("Firestore not initialized");
  const dynamicSpecialties = await getDynamicLawyerSpecialties(firestore);

  const { output } = await findLawyersPrompt({
    problem: input.problem,
    specialties: dynamicSpecialties,
  });
  return output!;
}
