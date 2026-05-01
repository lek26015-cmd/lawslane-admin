
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
import { Loader2, Search, Eye, ClipboardList, Info, Sparkles, Building, ShieldCheck, Users } from 'lucide-react';

interface UnifiedSurvey {
  id: string;
  respondentName: string;
  role: string;
  businessType: string;
  businessTypeOther?: string;
  businessSize: string;
  businessDuration: string;
  contractVolume: string;
  challenges: string[];
  challengesOther?: string;
  currentTool: string;
  initialHandling: string;
  aiExpectation: string;
  aiTimeSaved: string;
  aiConcerns: string;
  preferredChannel: string;
  hiringObstacles: string[];
  hiringObstaclesOther?: string;
  confidenceFactor: string;
  outsourceInterest: string;
  subscriptionInterest: string;
  createdAt: any;
}

const ROLE_MAP: Record<string, string> = {
  executive: 'ผู้บริหาร/Founder',
  inhouse_legal: 'ที่ปรึกษากฎหมาย',
  operations: 'ฝ่ายปฏิบัติการ',
  other: 'อื่นๆ'
};

const BUSINESS_TYPE_MAP: Record<string, string> = {
  service: 'บริการ',
  manufacturing: 'การผลิต',
  retail: 'ค้าปลีก-ค้าส่ง',
  tech: 'เทคโนโลยี',
  other: 'อื่นๆ'
};

const CHALLENGE_MAP: Record<string, string> = {
  drafting: 'ร่างสัญญา',
  reviewing: 'ตรวจสัญญา',
  labor: 'แรงงาน',
  ip: 'ทรัพย์สินทางปัญญา',
  debt: 'หนี้สิน',
  approval: 'อนุมัติช้า',
  storage: 'การจัดเก็บ',
  compliance: 'Compliance',
  other: 'อื่นๆ'
};

const OBSTACLE_MAP: Record<string, string> = {
  cost: 'ค่าใช้จ่ายไม่โปร่งใส',
  expertise: 'หาทนายยาก',
  process: 'กระบวนการยาก',
  trust: 'ความน่าเชื่อถือ'
};

const CONFIDENCE_MAP: Record<string, string> = {
  license: 'ประวัติและใบอนุญาต',
  review: 'รีวิวจากผู้ใช้จริง',
  price: 'ราคาและขอบเขตงาน',
  ai: 'ระบบ AI แนะนำ'
};

const CHANNEL_MAP: Record<string, string> = {
  web: 'เว็บไซต์',
  app: 'แอปมือถือ',
  chat: 'ระบบแชท'
};

export default function UnifiedSurveysPage() {
  const [surveys, setSurveys] = useState<UnifiedSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSurvey, setSelectedSurvey] = useState<UnifiedSurvey | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    const fetchSurveys = async () => {
      try {
        const { firestore: db } = initializeFirebase();
        if (!db) return;
        const q = query(collection(db, 'unified_surveys'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);

        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as UnifiedSurvey[];

        setSurveys(data);
      } catch (error) {
        console.error("Error fetching surveys:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSurveys();
  }, []);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredSurveys = surveys.filter(s =>
    s.respondentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.businessType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewDetails = (survey: UnifiedSurvey) => {
    setSelectedSurvey(survey);
    setIsDetailsOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Unified Survey Responses</h1>
          <p className="text-muted-foreground">
            ข้อมูลรวมจากแบบสอบถาม Product Research (SME & Corporate)
          </p>
        </div>
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>รายการแบบสอบถาม ({filteredSurveys.length})</CardTitle>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อ หรือประเภทธุรกิจ..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>วันที่</TableHead>
                <TableHead>ผู้ให้ข้อมูล</TableHead>
                <TableHead>บทบาท</TableHead>
                <TableHead>ธุรกิจ</TableHead>
                <TableHead>ขนาด</TableHead>
                <TableHead>สัญญา/เดือน</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSurveys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ClipboardList className="h-12 w-12 text-slate-200" />
                      <p className="text-slate-500 font-medium">ไม่พบข้อมูลแบบสำรวจ</p>
                      <p className="text-slate-400 text-sm">ยังไม่มีการส่งแบบสำรวจในระบบ</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSurveys.map((survey) => (
                  <TableRow key={survey.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDate(survey.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium">{survey.respondentName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal">
                        {ROLE_MAP[survey.role] || survey.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {BUSINESS_TYPE_MAP[survey.businessType] || survey.businessType}
                    </TableCell>
                    <TableCell className="text-sm">{survey.businessSize}</TableCell>
                    <TableCell className="text-sm">{survey.contractVolume}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleViewDetails(survey)}
                      >
                        <Eye className="h-4 w-4" />
                        ดูรายละเอียด
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">รายละเอียดแบบสอบถาม</DialogTitle>
            <DialogDescription>
              ส่งเมื่อ {selectedSurvey ? formatDate(selectedSurvey.createdAt) : '-'}
            </DialogDescription>
          </DialogHeader>

          {selectedSurvey && (
            <div className="space-y-8 pt-4">
              {/* Section 1: Profile */}
              <section>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Info className="h-4 w-4" /> ข้อมูลพื้นฐานธุรกิจ
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <DetailItem label="ชื่อ-ตำแหน่ง" value={selectedSurvey.respondentName} />
                  <DetailItem label="บทบาท" value={ROLE_MAP[selectedSurvey.role] || selectedSurvey.role} />
                  <DetailItem label="ประเภทธุรกิจ" value={selectedSurvey.businessType === 'other' ? `อื่นๆ (${selectedSurvey.businessTypeOther})` : BUSINESS_TYPE_MAP[selectedSurvey.businessType] || selectedSurvey.businessType} />
                  <DetailItem label="ขนาดธุรกิจ" value={selectedSurvey.businessSize} />
                  <DetailItem label="ระยะเวลาทำธุรกิจ" value={selectedSurvey.businessDuration} />
                  <DetailItem label="สัญญาต่อเดือน" value={selectedSurvey.contractVolume} />
                </div>
              </section>

              <hr />

              {/* Section 2: Challenges */}
              <section>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> ความท้าทายและการทำงาน
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-500 mb-2">ปัญหาที่พบบ่อย</p>
                    <div className="flex flex-wrap gap-2">
                      {(selectedSurvey.challenges || []).map((c) => (
                        <Badge key={c} variant="secondary">
                          {c === 'other' ? `อื่นๆ (${selectedSurvey.challengesOther})` : CHALLENGE_MAP[c] || c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <DetailItem label="เครื่องมือปัจจุบัน" value={selectedSurvey.currentTool} />
                  <DetailItem label="วิธีจัดการเบื้องต้น" value={selectedSurvey.initialHandling} long />
                </div>
              </section>

              <hr />

              {/* Section 3: AI */}
              <section>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> มุมมองต่อ AI
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <DetailItem label="ความคาดหวัง AI (1-5)" value={selectedSurvey.aiExpectation} />
                  <DetailItem label="คาดว่าประหยัดเวลา" value={selectedSurvey.aiTimeSaved} />
                  <DetailItem label="ข้อกังวล AI" value={selectedSurvey.aiConcerns} />
                  <DetailItem label="ช่องทางที่ถนัด" value={CHANNEL_MAP[selectedSurvey.preferredChannel] || selectedSurvey.preferredChannel} />
                </div>
              </section>

              <hr />

              {/* Section 4: Marketplace */}
              <section>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Building className="h-4 w-4" /> การจ้างงานและบริการ
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-500 mb-2">อุปสรรคจ้างทนาย</p>
                    <div className="flex flex-wrap gap-2">
                      {(selectedSurvey.hiringObstacles || []).map((o) => (
                        <Badge key={o} variant="outline" className="bg-red-50 text-red-700 border-red-100">
                          {OBSTACLE_MAP[o] || o}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <DetailItem label="ปัจจัยความมั่นใจ" value={CONFIDENCE_MAP[selectedSurvey.confidenceFactor] || selectedSurvey.confidenceFactor} />
                    <DetailItem label="ความสนใจจ้างผ่านระบบ" value={selectedSurvey.outsourceInterest} />
                  </div>
                  <DetailItem label="ฟีเจอร์ Subscription ที่ต้องการ" value={selectedSurvey.subscriptionInterest} long />
                </div>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailItem({ label, value, long = false }: { label: string; value: string; long?: boolean }) {
  return (
    <div className={long ? 'col-span-full' : ''}>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`mt-1 text-slate-900 ${long ? 'bg-slate-50 p-3 rounded-lg border text-sm' : 'font-medium'}`}>
        {value || '-'}
      </p>
    </div>
  );
}
