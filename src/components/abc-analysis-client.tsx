'use client';

import * as React from 'react';
import { Wand2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { handleGenerateAnalysis } from '@/app/actions';
import type { AbcAnalysisResult } from '@/lib/types';

export function AbcAnalysisClient() {
  const [isPending, startTransition] = React.useTransition();
  const [result, setResult] = React.useState<AbcAnalysisResult | null>(null);
  const { toast } = useToast();

  const onGenerate = () => {
    startTransition(async () => {
      const response = await handleGenerateAnalysis();
      if (response.success && response.data) {
        setResult(response.data);
        toast({
          title: 'Analysis Complete',
          description: 'The ABC analysis has been successfully generated.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.error || 'An unknown error occurred.',
        });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate ABC Analysis</CardTitle>
        <CardDescription>
          Click the button to analyze transaction data and classify medications into
          A (fast-moving), B (medium-moving), and C (slow-moving) categories.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {result ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Summary</h3>
              <p className="text-sm text-muted-foreground bg-secondary p-3 rounded-md">{result.summary}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Detailed Report</h3>
              <pre className="text-sm bg-secondary p-3 rounded-md whitespace-pre-wrap font-body">
                {result.report}
              </pre>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <p>Your analysis report will appear here.</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={onGenerate} disabled={isPending} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" />
          )}
          {isPending ? 'Analyzing...' : 'Generate with AI'}
        </Button>
      </CardFooter>
    </Card>
  );
}
