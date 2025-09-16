import { ThemeCustomizer } from '@/components/theme-customizer';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-headline font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Customize the appearance of your application.
        </p>
      </div>
      <ThemeCustomizer />
    </div>
  );
}
