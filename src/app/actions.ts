'use server';

import { generateAbcAnalysis } from '@/ai/flows/generate-abc-analysis';
import { transactions } from '@/lib/data';

export async function handleGenerateAnalysis() {
  try {
    const medicationData = transactions.map(t => ({
      name: t.medicationName,
      quantity: t.quantity,
      totalPrice: t.totalPrice,
      date: t.date,
    }));

    const result = await generateAbcAnalysis({
      medicationData: JSON.stringify(medicationData, null, 2),
      additionalContext: 'Analysis for monthly pharmacy report to optimize stock levels based on sales velocity.',
    });
    return { success: true, data: result };
  } catch (error) {
    console.error('Error generating ABC analysis:', error);
    return { success: false, error: 'Failed to generate analysis. Please try again.' };
  }
}
