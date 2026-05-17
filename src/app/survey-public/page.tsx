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
import { Loader2, Search, Eye, Users, Download } from 'lucide-react';

const QUESTIONS: Record<string, string> = {
  '1': 'ปัจจุบันคุณอยู่ในกลุ่มใดมากที่สุด',
  '1.1': 'อายุเท่าไหร่',
  '2': 'เคยมีปัญหาหรือจำเป็นต้องใช้บริการด้านกฎหมายหรือไม่',
  '3': 'ปัญหาด้านกฎหมายที่เคยพบหรือกังวลมากที่สุด',
  '4': 'สิ่งที่ยากที่สุดเวลามีปัญหาด้านกฎหมาย',
  '5': 'เวลามีปัญหากฎหมาย มักทำอะไรเป็นอย่างแรก',
  '6': 'สิ่งที่ทำให้ "หงุดหงิด" มากที่สุด',
  '7': 'ความเครียดกับปัญหากฎหมาย (1-5)',
  '8': 'อะไรทำให้ "เชื่อถือ" แพลตฟอร์มกฎหมายออนไลน์',
  '9': 'เชื่อมั่นให้ AI ช่วยด้านกฎหมายหรือไม่',
  '10': 'โอเคให้ AI ช่วยเรื่องอะไรได้บ้าง',
  '11': 'อะไรทำให้ "ไม่กล้า" ใช้ AI ด้านกฎหมาย',
  '12': 'บริการไหน "มีประโยชน์ที่สุด"',
  '13': 'ความช่วยเหลือ "เป็นอย่างแรก"',
  '14': 'คาดหวังให้ระบบตอบกลับเร็วแค่ไหน',
  '15': 'อะไรทำให้เลือกใช้แพลตฟอร์มนี้ แทนไปหาทนายตรง',
  '16': 'ยินดีจ่ายเงินเพื่อบริการกฎหมายออนไลน์หรือไม่',
  '17': 'รูปแบบการจ่ายเงินที่โอเคมากที่สุด',
  '18': 'โอเคจ่ายค่าปรึกษาเบื้องต้นประมาณเท่าไหร่',
  '19': 'อะไรทำให้ "ยอมจ่ายแพงขึ้น"',
  '20': 'เมื่อพูดถึง "กฎหมาย" รู้สึกว่าเป็นเรื่องแบบไหน',
  '21': 'อยากให้แบรนด์กฎหมายสื่อสารแบบไหน',
  '22': 'ประโยคไหนทำให้สนใจมากที่สุด',
  '23': 'อะไรทำให้ "จำแบรนด์" และอยากแนะนำต่อ',
  '24': 'ประสบการณ์ปัญหาด้านกฎหมายที่เคยเจอหรือกังวล',
  '25': 'ช่วงไหนที่ "ลำบากที่สุด"',
  '26': 'อยากให้มีบริการหรือความช่วยเหลือแบบไหน',
  '27': 'อะไรทำให้รู้สึก "ปลอดภัย"',
  '28': 'อยากให้มีอะไรเพิ่มเติมอีกบ้าง',
};

interface SurveyResponse {
  id: string;
  answers: Record<string, string | string[]>;
  createdAt: any;
}

export default function SurveyPublicAdminPage() {
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
        const q = query(collection(db, 'survey_public_responses'), orderBy('createdAt', 'desc'));
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

  const getAnswer = (r: SurveyResponse, key: string): string => {
    const a = r.answers?.[key];
    if (!a) return '-';
    if (Array.isArray(a)) return a.join(', ');
    return a;
  };

  const filtered = responses.filter(r => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return getAnswer(r, '1').toLowerCase().includes(term) || getAnswer(r, '1.1').toLowerCase().includes(term);
  });

  const exportCSV = () => {
    const qKeys = Object.keys(QUESTIONS);
    const headers = ['วันที่', ...qKeys.map(k => QUESTIONS[k])];
    const rows = responses.map(r => [
      formatDate(r.createdAt),
      ...qKeys.map(k => {
        const a = r.answers?.[k];
        if (!a) return '';
        if (Array.isArray(a)) return a.join(' | ');
        return a;
      }),
    ]);
    const csv = [headers, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `survey_public_${new Date().toISOString().slice(0, 10)}.csv`;
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
            <Users className="h-8 w-8 text-teal-600" />
            แบบสอบถามสำหรับบุคคลทั่วไป
          </h1>
          <p className="text-muted-foreground">ผลการตอบแบบสอบถามจากบุคคลทั่วไปทั้งหมด {responses.length} รายการ</p>
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
                <TableHead>เคยใช้บริการกฎหมาย</TableHead>
                <TableHead>ความเครียด</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center space-y-2">
                      <Users className="h-12 w-12 text-slate-200" />
                      <p className="text-slate-500 font-medium">ยังไม่มีข้อมูลแบบสอบถาม</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r, i) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{formatDate(r.createdAt)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{getAnswer(r, '1')}</Badge></TableCell>
                    <TableCell className="text-sm">{getAnswer(r, '1.1')}</TableCell>
                    <TableCell><Badge variant={getAnswer(r, '2') === 'เคย' ? 'default' : 'secondary'} className="text-xs">{getAnswer(r, '2')}</Badge></TableCell>
                    <TableCell>
                      {getAnswer(r, '7') !== '-' && (
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                          Number(getAnswer(r, '7')) >= 4 ? 'bg-red-100 text-red-700' :
                          Number(getAnswer(r, '7')) >= 3 ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {getAnswer(r, '7')}
                        </span>
                      )}
                    </TableCell>
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
            <DialogTitle className="text-xl">รายละเอียดคำตอบ (บุคคลทั่วไป)</DialogTitle>
            <DialogDescription>ส่งเมื่อ {selected ? formatDate(selected.createdAt) : '-'}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 pt-4">
              {Object.entries(QUESTIONS).map(([key, label]) => {
                const val = getAnswer(selected, key);
                if (val === '-') return null;
                return (
                  <div key={key} className="border-b border-slate-100 pb-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">ข้อ {key}. {label}</p>
                    {Array.isArray(selected.answers?.[key]) ? (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {(selected.answers[key] as string[]).map(v => <Badge key={v} variant="secondary">{v}</Badge>)}
                      </div>
                    ) : key === '7' ? (
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold ${
                          Number(val) >= 4 ? 'bg-red-100 text-red-700' :
                          Number(val) >= 3 ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }`}>{val}</span>
                        <span className="text-sm text-slate-500">/ 5</span>
                      </div>
                    ) : (
                      <p className="text-slate-800 font-medium">{val}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
