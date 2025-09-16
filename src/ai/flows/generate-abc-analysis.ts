'use server';

/**
 * @fileOverview Generates an ABC analysis report of medication movement.
 *
 * - generateAbcAnalysis - A function that generates the ABC analysis report.
 * - GenerateAbcAnalysisInput - The input type for the generateAbcAnalysis function.
 * - GenerateAbcAnalysisOutput - The return type for the generateAbcAnalysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAbcAnalysisInputSchema = z.object({
  medicationData: z.string().describe('Medication transaction data in JSON format.'),
  additionalContext: z.string().optional().describe('Additional context for the analysis.'),
});

export type GenerateAbcAnalysisInput = z.infer<typeof GenerateAbcAnalysisInputSchema>;

const GenerateAbcAnalysisOutputSchema = z.object({
  report: z.string().describe('The ABC analysis report.'),
  summary: z.string().describe('A summary of the ABC analysis.'),
});

export type GenerateAbcAnalysisOutput = z.infer<typeof GenerateAbcAnalysisOutputSchema>;

export async function generateAbcAnalysis(input: GenerateAbcAnalysisInput): Promise<GenerateAbcAnalysisOutput> {
  return generateAbcAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAbcAnalysisPrompt',
  input: {schema: GenerateAbcAnalysisInputSchema},
  output: {schema: GenerateAbcAnalysisOutputSchema},
  prompt: `You are an expert pharmacy analyst. Analyze the medication data and generate an ABC analysis report.

Medication Data: {{{medicationData}}}

Additional Context: {{{additionalContext}}}

Consider the sales, cost, and volume of each medication to categorize them into A (fast-moving), B (medium-moving), and C (slow-moving) categories.

Provide a summary of your analysis.

Ensure the report includes clear categorization and actionable insights for stock optimization. Output the ABC analysis report and a concise summary.`, 
});

const generateAbcAnalysisFlow = ai.defineFlow(
  {
    name: 'generateAbcAnalysisFlow',
    inputSchema: GenerateAbcAnalysisInputSchema,
    outputSchema: GenerateAbcAnalysisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
