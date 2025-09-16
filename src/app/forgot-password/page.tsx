
'use client';

import * as React from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Boxes } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const { sendPasswordReset } = useAuth();
  const [appName, setAppName] = React.useState('PharmaFlow');
  const [logo, setLogo] = React.useState<string | null>(null);

  React.useEffect(() => {
    const savedTheme = localStorage.getItem('appTheme');
    if (savedTheme) {
      const theme = JSON.parse(savedTheme);
      setAppName(theme.appName || 'PharmaFlow');
      setLogo(theme.logo || null);
    }
  }, []);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    try {
      await sendPasswordReset(values.email);
      toast({
        title: 'Check Your Email',
        description: 'A password reset link has been sent to your email address.',
      });
      form.reset();
    } catch (error: any) {
      console.error('Forgot password error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send password reset email. Please try again.',
      });
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-2 mb-4">
            {logo ? (
              <img src={logo} alt="App Logo" className="w-10 h-10 object-contain" />
            ) : (
              <Boxes className="w-10 h-10 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">Forgot Password</CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="text-center text-sm">
          <Link href="/login" className="underline hover:text-primary">
            Back to Sign In
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
