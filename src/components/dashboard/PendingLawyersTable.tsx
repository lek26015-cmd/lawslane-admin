import Link from 'next/link';
import { ArrowLeft, MoreHorizontal, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import type { PendingLawyerPreview } from '@/lib/dashboard-data';

export function PendingLawyersTable({ lawyers }: { lawyers: PendingLawyerPreview[] }) {
  return (
    <Card className="xl:col-span-2 rounded-xl overflow-hidden">
      <CardHeader className="flex flex-row items-center">
        <div className="grid gap-2">
          <CardTitle>ทนายความรอการอนุมัติ</CardTitle>
          <CardDescription>
            ตรวจสอบและอนุมัติใบสมัครทนายความใหม่
          </CardDescription>
        </div>
        <Button asChild size="sm" className="ml-auto gap-1">
          <Link href="/lawyers?tab=pending">
            ดูทั้งหมด
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {lawyers.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="ไม่มีทนายรออนุมัติในขณะนี้"
            description="ใบสมัครทนายความใหม่จะแสดงที่นี่เมื่อมีคนสมัครเข้ามา"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ทนายความ</TableHead>
                <TableHead className="hidden xl:table-cell">
                  ความเชี่ยวชาญ
                </TableHead>
                <TableHead className="hidden xl:table-cell">
                  สถานะ
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  วันที่สมัคร
                </TableHead>
                <TableHead>
                  <span className="sr-only">การดำเนินการ</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lawyers.map(lawyer => (
                <TableRow key={lawyer.id}>
                  <TableCell>
                    <div className="font-medium">{lawyer.name}</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">
                      {lawyer.userId}
                    </div>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    {lawyer.specialty.join(', ') || '-'}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <Badge className="text-xs" variant="outline">
                      รอตรวจสอบ
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {lawyer.joinedAtLabel}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-haspopup="true"
                          size="icon"
                          variant="ghost"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">สลับเมนู</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>การดำเนินการ</DropdownMenuLabel>
                        <DropdownMenuItem asChild><Link href={`/lawyers/${lawyer.id}`}>ดูใบสมัคร</Link></DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
