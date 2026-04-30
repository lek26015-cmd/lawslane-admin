
'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { 
  FileText, 
  Search, 
  Eye, 
  Filter,
  Download,
  ClipboardList,
  ChevronRight,
  Info
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirebase, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { B2BSurveyResponse } from '@/types/b2b-survey';

const ROLE_MAP: Record<string, string> = {
  executive: 'ผู้บริหารระดับสูง (C-Level)',
  inhouse_legal: 'ที่ปรึกษากฎหมายภายใน',
  other: 'อื่นๆ / ฝ่ายปฏิบัติการ'
};

const CHALLENGE_MAP: Record<string, string> = {
  drafting: 'ร่างสัญญาใหม่',
  reviewing: 'ตรวจสอบ / แก้ไขสัญญา',
  approval: 'ความล่าช้าในการอนุมัติ',
  storage: 'การจัดเก็บ / ค้นหาเอกสาร',
  compliance: 'การติดตามการปฏิบัติตามข้อกำหนด'
};

export default function B2BSurveysPage() {
  const { firestore } = useFirebase();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedResponse, setSelectedResponse] = React.useState<B2BSurveyResponse | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);

  // Firestore query
  const surveyQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'b2b_survey_responses'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore]);

  const { data: surveys, isLoading } = useCollection<B2BSurveyResponse>(surveyQuery);

  // Filtered surveys
  const filteredSurveys = React.useMemo(() => {
    if (!surveys) return [];
    return surveys.filter(s => 
      s.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.currentTool.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.decisionFactor.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [surveys, searchTerm]);

  const handleViewDetails = (response: B2BSurveyResponse) => {
    setSelectedResponse(response);
    setIsDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">B2B Survey Responses</h1>
          <p className="text-muted-foreground">
            ดูและจัดการข้อมูลแบบสำรวจจากลูกค้าองค์กร
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาตามบทบาท หรือเครื่องมือ..."
                className="pl-9 bg-slate-50 border-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>ทั้งหมด {filteredSurveys.length} รายการ</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-[180px]">วันที่</TableHead>
                  <TableHead>บทบาท</TableHead>
                  <TableHead>ปริมาณสัญญา</TableHead>
                  <TableHead>เครื่องมือปัจจุบัน</TableHead>
                  <TableHead>ปัจจัยตัดสินใจ</TableHead>
                  <TableHead className="text-right">การดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredSurveys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <ClipboardList className="h-12 w-12 text-slate-200" />
                        <p className="text-slate-500 font-medium">ไม่พบข้อมูลแบบสำรวจ</p>
                        <p className="text-slate-400 text-sm">ยังไม่มีการส่งแบบสำรวจในระบบ</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSurveys.map((survey) => (
                    <TableRow key={survey.id} className="group hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-medium">
                        {survey.createdAt ? format(survey.createdAt.toDate(), 'dd MMM yyyy HH:mm', { locale: th }) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal bg-blue-50 text-blue-700 border-blue-100">
                          {ROLE_MAP[survey.role] || survey.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{survey.contractVolume} / เดือน</TableCell>
                      <TableCell className="max-w-[200px] truncate">{survey.currentTool}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{survey.decisionFactor}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => handleViewDetails(survey)}
                        >
                          <Eye className="h-4 w-4" />
                          View Details
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

      {/* Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="p-6 bg-slate-900 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/10 rounded-lg">
                <FileText className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <DialogTitle className="text-xl">Survey Submission Details</DialogTitle>
                <DialogDescription className="text-slate-400">
                  ส่งเมื่อ {selectedResponse?.createdAt ? format(selectedResponse.createdAt.toDate(), 'dd MMMM yyyy HH:mm', { locale: th }) : '-'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedResponse && (
            <div className="p-6 space-y-8">
              {/* Section 1: Business Profile */}
              <section>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  โปรไฟล์ธุรกิจ
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailItem label="บทบาทผู้ตอบ" value={ROLE_MAP[selectedResponse.role] || selectedResponse.role} />
                  <DetailItem label="ปริมาณสัญญาเฉลี่ย" value={`${selectedResponse.contractVolume} ฉบับ / เดือน`} />
                  <DetailItem label="เครื่องมือปัจจุบัน" value={selectedResponse.currentTool} />
                </div>
              </section>

              <hr className="border-slate-100" />

              {/* Section 2: Challenges */}
              <section>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ChevronRight className="h-4 w-4" />
                  ความท้าทายและความพึงพอใจ
                </h3>
                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-slate-500 mb-2">ความท้าทายที่ใหญ่ที่สุด</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedResponse.challenges.map((c) => (
                        <Badge key={c} variant="outline" className="bg-slate-50">
                          {CHALLENGE_MAP[c] || c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DetailItem 
                      label="คะแนนความต้องการ Workspace (1-5)" 
                      value={
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-blue-600">{selectedResponse.workspaceHelpfulness}</span>
                          <div className="flex gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div 
                                key={i} 
                                className={`h-2 w-6 rounded-full ${i < selectedResponse.workspaceHelpfulness ? 'bg-blue-500' : 'bg-slate-200'}`} 
                              />
                            ))}
                          </div>
                        </div>
                      } 
                    />
                  </div>
                </div>
              </section>

              <hr className="border-slate-100" />

              {/* Section 3: AI & Tech */}
              <section>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ChevronRight className="h-4 w-4" />
                  มุมมองต่อเทคโนโลยี AI
                </h3>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DetailItem label="การคาดหวังเวลาที่ AI จะช่วยประหยัด" value={selectedResponse.aiTimeSaved} />
                  </div>
                  <DetailItem label="ข้อกังวลเกี่ยวกับ AI" value={selectedResponse.aiConcerns} isLongText />
                </div>
              </section>

              <hr className="border-slate-100" />

              {/* Section 4: Finance & Outsource */}
              <section>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ChevronRight className="h-4 w-4" />
                  การเงินและการจ้างงานภายนอก
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailItem label="วิธีการติดตามค่าใช้จ่าย" value={selectedResponse.spendTrackingMethod} />
                  <DetailItem label="ความต้องการระบบติดตามที่ดีขึ้น" value={selectedResponse.spendTrackingNeed} />
                  <DetailItem label="ความสนใจจ้างงานภายนอก" value={selectedResponse.outsourceInterest} />
                  <DetailItem label="ปัจจัยหลักในการตัดสินใจ" value={selectedResponse.decisionFactor} />
                </div>
              </section>
            </div>
          )}
          <div className="p-6 bg-slate-50 border-t flex justify-end">
            <Button onClick={() => setIsDetailsOpen(false)}>ปิดหน้าต่าง</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailItem({ label, value, isLongText = false }: { label: string, value: React.ReactNode, isLongText?: boolean }) {
  return (
    <div className={`space-y-1 ${isLongText ? 'col-span-full' : ''}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <div className={`text-slate-900 ${isLongText ? 'bg-slate-50 p-4 rounded-lg border border-slate-100' : 'font-medium'}`}>
        {value || '-'}
      </div>
    </div>
  );
}
