import Link from 'next/link';
import { DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * การ์ด "รายได้รวม" — เดิมโชว์เลข 0 จำลองถาวรราวกับเป็นตัวเลขจริง (getAdminStats
 * hardcode totalRevenue: 0) ระบบชำระเงินยังไม่เปิดใช้งานจริง จึงบอกตรงๆ ว่ายังไม่พร้อม
 * แทนการโชว์ตัวเลขปลอม ใครอยากดูตัวเลขประมาณการ (heuristic จาก getFinancialStats)
 * ให้ไปดูที่หน้าการเงินซึ่งมีบริบท/คำเตือนกำกับอยู่แล้ว ไม่เอามาผสมกับหน้านี้
 */
export function RevenueCard() {
  return (
    <Link href="/financials" className="block transition-transform hover:scale-[1.02] active:scale-95">
      <Card className="rounded-xl h-full hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">รายได้รวม</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-muted-foreground">เร็วๆ นี้</div>
          <p className="text-xs text-muted-foreground">
            ยังไม่เปิดใช้งานระบบชำระเงิน — ดูตัวเลขประมาณการที่หน้าการเงิน
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
