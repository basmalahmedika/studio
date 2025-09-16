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

Categorize medications into three groups based on their sales contribution:
1.  **Fast Moving (Category A):** These are the top items that contribute to approximately 70-80% of total sales value. This group usually consists of about 20-30% of your total items.
2.  **Medium Moving (Category B):** These items account for the next 15-20% of total sales value.
3.  **Slow Moving (Category C):** These items contribute the final 5-10% of total sales value. They are the most numerous but have the lowest sales volume.

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
