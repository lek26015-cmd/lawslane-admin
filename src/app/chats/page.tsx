
'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Search,
  MessageSquare,
  ExternalLink,
  ChevronRight,
  Filter,
  User,
  Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useFirebase } from '@/firebase';
import { getAllChatsForAdmin } from '@/lib/data';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export default function AllChatsPage() {
  const { firestore } = useFirebase();
  const [chats, setChats] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');

  React.useEffect(() => {
    if (!firestore) return;

    const fetchChats = async () => {
      setIsLoading(true);
      try {
        const data = await getAllChatsForAdmin(firestore);
        setChats(data);
      } catch (error) {
        console.error("Failed to fetch chats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChats();
  }, [firestore]);

  const filteredChats = chats.filter(chat => 
    chat.caseTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lawyerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">กำลังดำเนินการ</Badge>;
      case 'pending_payment':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">รอชำระเงิน</Badge>;
      case 'closed':
        return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">ปิดเคสแล้ว</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">ปฏิเสธ</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ห้องสนทนาทั้งหมด</h1>
          <p className="text-muted-foreground">
            ดูและตรวจสอบการสนทนาระหว่างทนายความและลูกความ
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายการแชท</CardTitle>
          <CardDescription>
            ค้นหาตามชื่อเคส ชื่อทนาย หรือชื่อลูกความ
          </CardDescription>
          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหา..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">เคส / เรื่อง</TableHead>
                  <TableHead>คู่สนทนา</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>อัปเดตล่าสุด</TableHead>
                  <TableHead className="text-right">การดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      กำลังโหลดข้อมูล...
                    </TableCell>
                  </TableRow>
                ) : filteredChats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      ไม่พบข้อมูลการสนทนา
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredChats.map((chat) => (
                    <TableRow key={chat.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-slate-900">{chat.caseTitle}</span>
                          <span className="text-xs font-mono text-muted-foreground">{chat.id}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] uppercase font-bold bg-blue-100 text-blue-700">Client</Badge>
                            <Link href={`/customers/${chat.clientId}`} className="text-sm hover:underline hover:text-primary">
                              {chat.clientName}
                            </Link>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] uppercase font-bold bg-amber-100 text-amber-700">Lawyer</Badge>
                            <Link href={`/lawyers/${chat.lawyerId}`} className="text-sm hover:underline hover:text-primary">
                              {chat.lawyerName}
                            </Link>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(chat.status)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(chat.lastMessageAt, 'd MMM yyyy HH:mm', { locale: th })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm" className="gap-1">
                          <Link 
                            href={`/chats/${chat.id}`} 
                          >
                            ดูข้อความ
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
