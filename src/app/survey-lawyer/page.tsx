'use client';

import React, { useEffect, useState } from 'react';
import { initializeFirebase } from '@/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Search, Eye, Scale, Download } from 'lucide-react';

const QUESTIONS: Record<number, string> = {
  1: 'ปัจจุบันคุณอยู่ในกลุ่มใดมากที่สุด',
  2: 'อายุเท่าไหร่',
  3: 'เคยใช้ หรือคิดจะใช้ AI มาช่วยงานด้านกฎหมายหรือไม่',
  4: 'คุณมักใช้ AI เพื่อแก้ปัญหาอะไร',
  5: 'คุณมีปัญหาในการใช้ AI ไหม',
  6: 'เวลามีปัญหากฎหมาย หาข้อมูลจากอะไรเป็นอย่างแรก',
  7: 'สิ่งที่ทำให้ "หงุดหงิด" มากที่สุด',
  8: 'อะไรทำให้ "เชื่อถือ" AI',
  9: 'ให้ AI ช่วยเรื่องอะไรได้บ้าง',
  10: 'อะไรทำให้ "ไม่เชื่อถือ" AI ด้านกฎหมาย',
  11: 'บริการไหน "มีประโยชน์ที่สุด"',
  12: 'อะไรทำให้เลือกเข้ามาเป็นทนายในแพลตฟอร์ม',
  13: 'ยินดีจ่ายเงินเพื่อบริการ AI กฎหมายไทยหรือไม่',
  14: 'ยินดีถูกหักค่าบริการแพลตฟอร์มหรือไม่',
  15: 'คิดค่าปรึกษาประมาณเท่าไหร่',
  16: 'อยากให้แบรนด์สื่อสารแบบไหน',
  17: 'อะไรทำให้ "จำแบรนด์" และอยากแนะนำต่อ',
  18: 'เชิญชวนทนายมาสมัครบนแพลตฟอร์ม',
  19: 'เชิญชวนลูกความมาใช้บริการบนแพลตฟอร์ม',
  20: 'อยากให้มีบริการหรือความช่วยเหลือแบบไหน',
  21: 'อะไรทำให้ "ปลอดภัย" ในการใช้แพลตฟอร์ม',
  22: 'อยากให้มีอะไรเพิ่มเติมอีกบ้าง',
};

interface SurveyResponse {
  id: string;
  answers: Record<number, string | string[]>;
  stoppedEarly?: boolean;
  createdAt: any;
}

export default function SurveyLawyerAdminPage() {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<SurveyResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { firestore: db } = initializeFirebase();
        if (!db) return;
        const q = query(collection(db, 'survey_lawyer_responses'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setResponses(snap.docs.map(d => ({ id: d.id, ...d.data() } as SurveyResponse)));
      } catch (e) {
        console.error('Error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const formatDate = (ts: any) => {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getAnswer = (r: SurveyResponse, qId: number): string => {
    const a = r.answers?.[qId];
    if (!a) return '-';
    if (Array.isArray(a)) return a.join(', ');
    return a;
  };

  const filtered = responses.filter(r => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return getAnswer(r, 1).toLowerCase().includes(term) || getAnswer(r, 2).toLowerCase().includes(term);
  });

  const exportCSV = () => {
    const headers = ['วันที่', ...Object.values(QUESTIONS), 'หยุดตอบก่อน'];
    const rows = responses.map(r => [
      formatDate(r.createdAt),
      ...Object.keys(QUESTIONS).map(k => {
        const a = r.answers?.[Number(k)];
        if (!a) return '';
        if (Array.isArray(a)) return a.join(' | ');
        return a;
      }),
      r.stoppedEarly ? 'ใช่' : 'ไม่',
    ]);
    const csv = [headers, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `survey_lawyer_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Scale className="h-8 w-8 text-blue-600" />
            แบบสอบถามสำหรับทนายความ
          </h1>
          <p className="text-muted-foreground">ผลการตอบแบบสอบถามจากทนายความทั้งหมด {responses.length} รายการ</p>
        </div>
        <Button onClick={exportCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>รายการคำตอบ ({filtered.length})</CardTitle>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="ค้นหาตามกลุ่ม/อายุ..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>วันที่</TableHead>
                <TableHead>กลุ่ม</TableHead>
                <TableHead>อายุ</TableHead>
                <TableHead>ใช้ AI</TableHead>
                <TableHead>หยุดก่อน</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center space-y-2">
                      <Scale className="h-12 w-12 text-slate-200" />
                      <p className="text-slate-500 font-medium">ยังไม่มีข้อมูลแบบสอบถาม</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r, i) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{formatDate(r.createdAt)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{getAnswer(r, 1)}</Badge></TableCell>
                    <TableCell className="text-sm">{getAnswer(r, 2)}</TableCell>
                    <TableCell><Badge variant={getAnswer(r, 3) === 'เคย' ? 'default' : 'destructive'} className="text-xs">{getAnswer(r, 3)}</Badge></TableCell>
                    <TableCell>{r.stoppedEarly ? <Badge variant="secondary" className="text-xs">หยุดก่อน</Badge> : '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="gap-2" onClick={() => { setSelected(r); setIsOpen(true); }}>
                        <Eye className="h-4 w-4" /> ดูรายละเอียด
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">รายละเอียดคำตอบ (ทนายความ)</DialogTitle>
            <DialogDescription>ส่งเมื่อ {selected ? formatDate(selected.createdAt) : '-'}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 pt-4">
              {Object.entries(QUESTIONS).map(([key, label]) => {
                const val = getAnswer(selected, Number(key));
                if (val === '-') return null;
                return (
                  <div key={key} className="border-b border-slate-100 pb-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">ข้อ {key}. {label}</p>
                    {Array.isArray(selected.answers?.[Number(key)]) ? (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {(selected.answers[Number(key)] as string[]).map(v => <Badge key={v} variant="secondary">{v}</Badge>)}
                      </div>
                    ) : (
                      <p className="text-slate-800 font-medium">{val}</p>
                    )}
                  </div>
                );
              })}
              {selected.stoppedEarly && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-amber-800 text-sm font-medium">⚠ ผู้ตอบเลือก &quot;ไม่เคย&quot; ในข้อ 3 จึงหยุดตอบก่อนกำหนด</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
