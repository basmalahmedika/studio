
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
import { Paintbrush, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';

const themeSchema = z.object({
  appName: z.string().min(1, 'Application name is required'),
  logo: z.any(),
  // Main Colors
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color'),
  backgroundColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color'),
  accentColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color'),
  foregroundColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color'),
  // Sidebar Colors
  sidebarBackgroundColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color'),
  sidebarAccentColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color'),
});

type ThemeFormValues = z.infer<typeof themeSchema>;

const colorPresets = [
  {
    name: 'Default',
    colors: {
      primaryColor: '#2563eb',
      backgroundColor: '#f8fafc',
      accentColor: '#f59e0b',
      foregroundColor: '#1e293b',
      sidebarBackgroundColor: '#ffffff',
      sidebarAccentColor: '#f8fafc',
    },
  },
  {
    name: 'Oceanic',
    colors: {
      primaryColor: '#0e7490',
      backgroundColor: '#f0f9ff',
      accentColor: '#22d3ee',
      foregroundColor: '#083344',
      sidebarBackgroundColor: '#083344',
      sidebarAccentColor: '#072e3b',
    },
  },
  {
    name: 'Forest',
    colors: {
      primaryColor: '#166534',
      backgroundColor: '#f0fdf4',
      accentColor: '#4ade80',
      foregroundColor: '#14532d',
      sidebarBackgroundColor: '#14532d',
      sidebarAccentColor: '#114727',
    },
  },
   {
    name: 'Sunset',
    colors: {
      primaryColor: '#ea580c',
      backgroundColor: '#fff7ed',
      accentColor: '#f97316',
      foregroundColor: '#422006',
      sidebarBackgroundColor: '#422006',
      sidebarAccentColor: '#351a05',
    },
  },
];


export function ThemeCustomizer() {
  const { toast } = useToast();
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const [activePreset, setActivePreset] = React.useState('Default');

  const form = useForm<ThemeFormValues>({
    resolver: zodResolver(themeSchema),
    defaultValues: {
      appName: 'PharmaFlow',
      ...colorPresets[0].colors,
    },
  });

  React.useEffect(() => {
    const savedTheme = localStorage.getItem('appTheme');
    if (savedTheme) {
      const themeValues = JSON.parse(savedTheme);
      form.reset(themeValues);
      if (themeValues.logo) {
        setLogoPreview(themeValues.logo);
      }
    }
  }, [form]);

  
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

  const applyPreset = (preset: typeof colorPresets[0]) => {
    form.setValue('primaryColor', preset.colors.primaryColor);
    form.setValue('backgroundColor', preset.colors.backgroundColor);
    form.setValue('accentColor', preset.colors.accentColor);
    form.setValue('foregroundColor', preset.colors.foregroundColor);
    form.setValue('sidebarBackgroundColor', preset.colors.sidebarBackgroundColor);
    form.setValue('sidebarAccentColor', preset.colors.sidebarAccentColor);
    setActivePreset(preset.name);
  };


  const onSubmit = (values: ThemeFormValues) => {
    try {
        const themeToSave = { ...values, logo: values.logo || logoPreview };
        localStorage.setItem('appTheme', JSON.stringify(themeToSave));
        window.dispatchEvent(new CustomEvent('theme-updated', { detail: themeToSave }));
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
          Choose a preset or customize the application's appearance manually.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

            <div className="space-y-4">
                 <FormLabel>Color Presets</FormLabel>
                 <div className="flex flex-wrap gap-2">
                    {colorPresets.map((preset) => (
                        <Button
                         type="button"
                         key={preset.name}
                         variant={activePreset === preset.name ? 'default' : 'outline'}
                         onClick={() => applyPreset(preset)}
                        >
                          <Palette className="mr-2 h-4 w-4" />
                          {preset.name}
                        </Button>
                    ))}
                 </div>
            </div>

            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="space-y-4 col-span-1 lg:col-span-3">
                    <CardTitle className="text-xl">Branding</CardTitle>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                </div>

                <div className="space-y-4">
                    <CardTitle className="text-xl">Main Colors</CardTitle>
                     <FormField
                        control={form.control}
                        name="primaryColor"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Primary Color</FormLabel>
                            <FormControl>
                                <div className='flex items-center gap-2'>
                                    <Input type="color" {...field} className="p-1 h-10 w-14" />
                                    <Input type="text" {...field} />
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
                                    <Input type="text" {...field} />
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
                                    <Input type="text" {...field} />
                                </div>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                     <FormField
                        control={form.control}
                        name="foregroundColor"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Font / Foreground</FormLabel>
                            <FormControl>
                                <div className='flex items-center gap-2'>
                                    <Input type="color" {...field} className="p-1 h-10 w-14" />
                                    <Input type="text" {...field} />
                                </div>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                </div>

                <div className="space-y-4">
                    <CardTitle className="text-xl">Sidebar Colors</CardTitle>
                    <FormField
                        control={form.control}
                        name="sidebarBackgroundColor"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Sidebar Background</FormLabel>
                            <FormControl>
                                <div className='flex items-center gap-2'>
                                    <Input type="color" {...field} className="p-1 h-10 w-14" />
                                    <Input type="text" {...field} />
                                </div>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                     <FormField
                        control={form.control}
                        name="sidebarAccentColor"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Sidebar Accent</FormLabel>
                            <FormControl>
                                <div className='flex items-center gap-2'>
                                    <Input type="color" {...field} className="p-1 h-10 w-14" />
                                    <Input type="text" {...field} />
                                </div>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                </div>

            </div>
            
            <div className="flex justify-end pt-4">
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
