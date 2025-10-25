import type { LucideIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description: string;
  color?: string;
}

export function StatCard({ title, value, icon: Icon, description, color }: StatCardProps) {
  return (
    <Card className={cn(color, color && 'text-white')}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", color ? 'text-white/80' : 'text-muted-foreground')} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className={cn("text-xs", color ? 'text-white/80' : 'text-muted-foreground')}>{description}</p>
      </CardContent>
    </Card>
  );
}
