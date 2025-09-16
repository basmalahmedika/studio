
'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Paintbrush } from 'lucide-react';

const themeSchema = z.object({
  appName: z.string().min(1, 'Application name is required'),
  logo: z.any(),
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color'),
  backgroundColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color'),
  accentColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color'),
});

type ThemeFormValues = z.infer<typeof themeSchema>;

// Helper function to convert hex to HSL string
const hexToHslString = (hex: string): string => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }

  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return `${h} ${s}% ${l}%`;
};

export function ThemeCustomizer() {
  const { toast } = useToast();
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);

  const form = useForm<ThemeFormValues>({
    resolver: zodResolver(themeSchema),
    defaultValues: {
      appName: 'PharmaFlow',
      primaryColor: '#88c6f7',
      backgroundColor: '#eef4f8',
      accentColor: '#ff9838',
    },
  });

  // Load saved theme from localStorage on component mount
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('appTheme');
    if (savedTheme) {
      const themeValues = JSON.parse(savedTheme);
      form.reset(themeValues);
      if (themeValues.logo) {
        setLogoPreview(themeValues.logo);
      }
      applyTheme(themeValues);
    } else {
        // Apply default theme if nothing is saved
        applyTheme(form.getValues());
    }
  }, [form]);

  const applyTheme = (theme: ThemeFormValues) => {
    document.documentElement.style.setProperty('--primary', hexToHslString(theme.primaryColor));
    document.documentElement.style.setProperty('--background', hexToHslString(theme.backgroundColor));
    document.documentElement.style.setProperty('--accent', hexToHslString(theme.accentColor));
    
    // Also update sidebar colors for consistency
    document.documentElement.style.setProperty('--sidebar-primary', hexToHslString(theme.primaryColor));

    const appNameElement = document.querySelector('.font-headline.font-bold');
    if (appNameElement) {
        appNameElement.textContent = theme.appName;
    }
    const logoElement = document.querySelector('.w-8.h-8.text-primary');
    if (logoElement && theme.logo) {
        logoElement.innerHTML = `<img src="${theme.logo}" alt="App Logo" class="w-8 h-8" />`;
    }
  };
  
  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoPreview(base64String);
        form.setValue('logo', base64String);
      };
      reader.readAsDataURL(file);
    }
  };


  const onSubmit = (values: ThemeFormValues) => {
    try {
        const themeToSave = { ...values, logo: values.logo || logoPreview };
        localStorage.setItem('appTheme', JSON.stringify(themeToSave));
        applyTheme(themeToSave);
        toast({ title: 'Success', description: 'Theme updated successfully.' });
    } catch (error) {
        console.error('Failed to save theme:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save theme. Storage might be full.' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Paintbrush className="h-5 w-5 text-muted-foreground" />
            Theme Customizer
        </CardTitle>
        <CardDescription>
          Customize the application's name, logo, and color scheme.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <FormField
                    control={form.control}
                    name="appName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Application Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., PharmaFlow" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="logo"
                    render={() => (
                        <FormItem>
                            <FormLabel>Logo</FormLabel>
                            <FormControl>
                                <Input type="file" accept="image/*" onChange={handleLogoChange} />
                            </FormControl>
                            {logoPreview && (
                                <div className="mt-4">
                                <img src={logoPreview} alt="Logo Preview" className="h-16 w-16 object-contain border p-1 rounded-md" />
                                </div>
                            )}
                            <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                 <div className="space-y-4">
                    <FormField
                        control={form.control}
                        name="primaryColor"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Primary Color</FormLabel>
                            <FormControl>
                                <div className='flex items-center gap-2'>
                                    <Input type="color" {...field} className="p-1 h-10 w-14" />
                                    <Input type="text" {...field} placeholder="#88c6f7" />
                                </div>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField
                        control={form.control}
                        name="backgroundColor"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Background Color</FormLabel>
                            <FormControl>
                                <div className='flex items-center gap-2'>
                                    <Input type="color" {...field} className="p-1 h-10 w-14" />
                                    <Input type="text" {...field} placeholder="#eef4f8" />
                                </div>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField
                        control={form.control}
                        name="accentColor"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Accent Color</FormLabel>
                            <FormControl>
                                <div className='flex items-center gap-2'>
                                    <Input type="color" {...field} className="p-1 h-10 w-14" />
                                    <Input type="text" {...field} placeholder="#ff9838" />
                                </div>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                 </div>
            </div>
            
            <div className="flex justify-end">
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
