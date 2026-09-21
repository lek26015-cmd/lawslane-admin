import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: number | string;
  caption?: string;
  icon: LucideIcon;
  href: string;
}

export function StatCard({ title, value, caption, icon: Icon, href }: StatCardProps) {
  return (
    <Link href={href} className="block transition-transform hover:scale-[1.02] active:scale-95">
      <Card className="rounded-xl h-full hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {caption && <p className="text-xs text-muted-foreground">{caption}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}
