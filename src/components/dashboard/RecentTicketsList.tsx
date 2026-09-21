import Link from 'next/link';
import { ArrowLeft, Ticket as TicketIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import type { TicketPreview } from '@/lib/dashboard-data';

export function RecentTicketsList({ tickets }: { tickets: TicketPreview[] }) {
  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle>Ticket ช่วยเหลือล่าสุด</CardTitle>
        <CardDescription>
          ตอบกลับคำขอความช่วยเหลือจากลูกค้าและทนายความ
        </CardDescription>
      </CardHeader>
      <CardContent className={tickets.length > 0 ? 'grid gap-8' : undefined}>
        {tickets.length === 0 ? (
          <EmptyState
            icon={TicketIcon}
            title="ไม่มี Ticket ที่รอดำเนินการ"
            description="Ticket ใหม่จากลูกค้าและทนายความจะแสดงที่นี่"
          />
        ) : (
          tickets.map(ticket => (
            <div key={ticket.id} className="flex items-center gap-4">
              <div className="grid gap-1">
                <p className="text-sm font-medium leading-none">
                  {ticket.userId}
                </p>
                <p className="text-sm text-muted-foreground">
                  {ticket.id}: {ticket.problemType}
                </p>
              </div>
              <Button asChild size="sm" className="ml-auto gap-1">
                <Link href={`/tickets/${ticket.id}`}>
                  ดู Ticket
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
