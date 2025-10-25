
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
  appName: z.string().min(1, 'Nama aplikasi harus diisi'),
  logo: z.any(),
  // Main Colors
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Warna hex tidak valid'),
  backgroundColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Warna hex tidak valid'),
  accentColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Warna hex tidak valid'),
  foregroundColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Warna hex tidak valid'),
  // Sidebar Colors
  sidebarBackgroundColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Warna hex tidak valid'),
  sidebarAccentColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Warna hex tidak valid'),
});

type ThemeFormValues = z.infer<typeof themeSchema>;

const colorPresets = [
  {
    name: 'Default',
    colors: {
      primaryColor: '#10b981',
      backgroundColor: '#f8fafc',
      accentColor: '#f59e0b',
      foregroundColor: '#1e293b',
      sidebarBackgroundColor: '#ffffff',
      sidebarAccentColor: '#f8fafc',
    },
  },
  {
    name: 'Oseanik',
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
    name: 'Hutan',
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
    name: 'Senja',
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
        toast({ title: 'Sukses', description: 'Tema berhasil diperbarui.' });
    } catch (error) {
        console.error('Gagal menyimpan tema:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Gagal menyimpan tema. Penyimpanan mungkin penuh.' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Paintbrush className="h-5 w-5 text-muted-foreground" />
            Kustomisasi Tema
        </CardTitle>
        <CardDescription>
          Pilih preset atau sesuaikan tampilan aplikasi secara manual.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

            <div className="space-y-4">
                 <FormLabel>Preset Warna</FormLabel>
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
                            <FormLabel>Nama Aplikasi</FormLabel>
                            <FormControl>
                                <Input placeholder="cth., PharmaFlow" {...field} />
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
                                    <img src={logoPreview} alt="Pratinjau Logo" className="h-16 w-16 object-contain border p-1 rounded-md" />
                                    </div>
                                )}
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <CardTitle className="text-xl">Warna Utama</CardTitle>
                     <FormField
                        control={form.control}
                        name="primaryColor"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Warna Primer</FormLabel>
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
                            <FormLabel>Warna Latar</FormLabel>
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
                            <FormLabel>Warna Aksen</FormLabel>
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
                            <FormLabel>Warna Teks / Latar Depan</FormLabel>
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
                    <CardTitle className="text-xl">Warna Sidebar</CardTitle>
                    <FormField
                        control={form.control}
                        name="sidebarBackgroundColor"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Latar Sidebar</FormLabel>
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
                            <FormLabel>Aksen Sidebar</FormLabel>
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
              <Button type="submit">Simpan Perubahan</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
