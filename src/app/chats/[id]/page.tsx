'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ArrowLeft, FileIcon, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: any;
  type?: string;
  metadata?: any;
}

/**
 * ข้อความระบบรุ่นเก่าเขียนเป็น markdown (ห้องแชทเว็บหลักไม่แปลง markdown) — ตัด ** / * ครอบ
 * และบรรทัดลิงก์ล้วน แบบเดียวกับ cardText() ใน chat-box.tsx ของเว็บหลัก
 */
function cardText(text: string): string {
  return text
    .split('\n')
    .filter((line) => !/^\s*(🔗\s*)?\[[^\]]*\]\([^)]*\)\s*$/.test(line))
    .filter((line) => !/ได้ที่ลิงก์ด้านล่างนี้:?\s*$/.test(line))
    .join('\n')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|\n)\*([^*\n]+)\*(?=\n|$)/g, '$1$2')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** การ์ดที่ลูกความเห็นในห้องแชทเว็บหลัก (หัวการ์ด + ปุ่ม) — จับแบบเดียวกับ chat-box.tsx */
function systemCard(msg: Message): { title: string; button: string } | null {
  if (msg.type === 'case_proposal' || (msg.text.includes('ใบเสนอราคา') && msg.text.includes('/invoice/'))) {
    return { title: 'ใบเสนอราคา', button: '📄 เปิดดูรายละเอียดใบเสนอราคา' };
  }
  if (msg.text.includes('💳')) {
    return { title: 'ชำระค่าบริการ', button: '💳 ชำระค่าบริการผ่าน Lawslane' };
  }
  return null;
}

export default function AdminChatViewer() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.id as string;
  const { firestore } = useFirebase();

  const [chatData, setChatData] = React.useState<any>(null);
  // auth uid ของทนาย — chats.lawyerId เป็น id ของ lawyerProfiles แต่ senderId ของข้อความเป็น auth uid
  const [lawyerUid, setLawyerUid] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!firestore || !chatId) return;

    const fetchChatDetails = async () => {
      try {
        const chatDoc = await getDoc(doc(firestore, 'chats', chatId));
        if (chatDoc.exists()) {
          const data = chatDoc.data();
          setChatData(data);
          if (data.lawyerId) {
            getDoc(doc(firestore, 'lawyerProfiles', data.lawyerId))
              .then((profileDoc) => setLawyerUid(profileDoc.data()?.userId ?? null))
              .catch((err) => console.error("Error fetching lawyer profile:", err));
          }
        }
      } catch (err) {
        console.error("Error fetching chat details:", err);
      }
    };

    fetchChatDetails();

    const messagesQuery = query(
      collection(firestore, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      setMessages(msgs);
      setIsLoading(false);
    }, (error) => {
      console.error("Error listening to messages:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, chatId]);

  React.useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollableNode = scrollAreaRef.current.querySelector('div[style*="overflow: scroll"]');
      if (scrollableNode) {
        scrollableNode.scrollTop = scrollableNode.scrollHeight;
      }
    }
  }, [messages]);

  if (isLoading && !chatData) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!chatData) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          กลับ
        </Button>
        <div className="text-center text-muted-foreground py-8">
          ไม่พบข้อมูลแชท หรือไม่มีสิทธิ์เข้าถึง
        </div>
      </div>
    );
  }

  // ห้องเก่าบางห้องเก็บ lawyerId เป็น auth uid จึงนับทั้งสองค่าเป็นทนาย
  // participants ที่ไม่ใช่ลูกความก็คือทนาย (กันไว้เผื่อโหลดโปรไฟล์ทนายไม่ได้)
  const clientIds = new Set<string>([chatData.userId, chatData.clientId].filter(Boolean));
  const lawyerIds = new Set<string>([chatData.lawyerId, lawyerUid].filter(Boolean));
  if (clientIds.size > 0) {
    (chatData.participants || []).forEach((p: string) => {
      if (!clientIds.has(p)) lawyerIds.add(p);
    });
  }
  
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {chatData.caseTitle || 'ห้องสนทนา'}
            </h1>
            <p className="text-muted-foreground text-sm">
              รหัส: {chatId}
            </p>
          </div>
        </div>
        <div className="bg-amber-100 text-amber-800 px-3 py-1.5 rounded-md text-sm font-medium border border-amber-200">
          โหมดผู้ดูแลระบบ (อ่านอย่างเดียว)
        </div>
      </div>

      <Card className="flex flex-col h-[70vh] shadow-lg">
        <CardHeader className="border-b py-4 bg-slate-50/50">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">คู่สนทนา:</span>
              <span className="text-slate-600">
                {chatData.participants?.length > 0 ? "เข้าร่วมแล้ว" : "ไม่ทราบข้อมูล"}
              </span>
            </div>
            <div>
              <span className="font-semibold text-slate-700 mr-2">สถานะ:</span>
              <span className="uppercase">{chatData.status || 'active'}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-grow p-0 flex flex-col min-h-0 bg-slate-50/30">
          <ScrollArea className="flex-grow p-6" ref={scrollAreaRef}>
            <div className="space-y-6">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  ยังไม่มีข้อความในการสนทนานี้
                </div>
              ) : (
                messages.map((msg) => {
                  const isLawyerMessage = lawyerIds.has(msg.senderId);
                  // ข้อความที่ระบบโพสต์เอง (ใบเสนอราคา, ร่างสัญญา, ช่องทางชำระเงิน) ใช้ senderId 'system'
                  const isSystemMessage =
                    msg.senderId === 'system' ||
                    (!isLawyerMessage && clientIds.size > 0 && !clientIds.has(msg.senderId));

                  if (isSystemMessage) {
                    const card = systemCard(msg);
                    return (
                      <div key={msg.id} className="flex flex-col items-center gap-1">
                        <div className="text-[10px] text-muted-foreground">ข้อความจากระบบ</div>
                        {card ? (
                          <div className="w-full max-w-md overflow-hidden rounded-2xl border-2 border-blue-500 bg-white text-sm shadow-sm">
                            <div className="bg-blue-700 px-4 py-2.5 text-xs font-bold text-white">{card.title}</div>
                            <div className="space-y-3 p-4">
                              <p className="whitespace-pre-wrap leading-relaxed text-slate-600">{cardText(msg.text)}</p>
                              <Button disabled className="h-10 w-full rounded-xl bg-blue-600 font-bold">
                                {card.button}
                              </Button>
                              <p className="text-center text-[10px] text-muted-foreground">
                                ปุ่มนี้ลูกความกดได้ในห้องแชทของเว็บหลัก
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="max-w-lg rounded-xl border border-dashed border-slate-300 bg-slate-100 px-4 py-2.5 text-sm text-slate-700">
                            <p className="whitespace-pre-wrap leading-relaxed">{cardText(msg.text)}</p>
                          </div>
                        )}
                        <div className="text-[10px] text-muted-foreground">
                          {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleString('th-TH') : ''}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${isLawyerMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isLawyerMessage && (
                        <Avatar className="h-8 w-8 border border-slate-200">
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-bold">
                            C
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div className="flex flex-col gap-1">
                        <div className={`text-[10px] text-muted-foreground px-1 ${isLawyerMessage ? 'text-right' : 'text-left'}`}>
                          {isLawyerMessage ? 'ทนายความ' : 'ลูกความ'}
                        </div>
                        <div
                          className={`max-w-md rounded-2xl px-4 py-2.5 shadow-sm text-sm ${
                            isLawyerMessage
                              ? 'bg-primary text-primary-foreground rounded-br-sm'
                              : 'bg-white border border-slate-200 rounded-bl-sm'
                          }`}
                        >
                          {msg.metadata?.type === 'file_upload' || msg.metadata?.fileUrl || msg.text.startsWith('[อัปโหลดไฟล์]') ? (
                            <div className="flex flex-col gap-2 py-1">
                              {msg.metadata?.fileUrl && msg.metadata?.type?.includes('image') ? (
                                <div className="relative group">
                                  <img 
                                    src={msg.metadata.fileUrl} 
                                    alt="Uploaded image" 
                                    className="max-w-full rounded-lg border border-slate-200 cursor-zoom-in hover:opacity-90 transition-opacity"
                                    onClick={() => window.open(msg.metadata.fileUrl, '_blank')}
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 rounded-lg pointer-events-none">
                                    <Eye className="text-white w-6 h-6 drop-shadow-md" />
                                  </div>
                                </div>
                              ) : (
                                <a 
                                  href={msg.metadata?.fileUrl || '#'} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                                    isLawyerMessage 
                                      ? 'bg-white/10 border-white/20 hover:bg-white/20 text-white' 
                                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  <FileIcon className="w-4 h-4" />
                                  <span className="font-medium text-xs truncate">
                                    {msg.text.replace('[อัปโหลดไฟล์]', '').trim() || 'ดูเอกสารแนบ'}
                                  </span>
                                </a>
                              )}
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                          )}
                        </div>
                        <div className={`text-[10px] text-muted-foreground px-1 ${isLawyerMessage ? 'text-right' : 'text-left'}`}>
                          {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleString('th-TH') : ''}
                        </div>
                      </div>

                      {isLawyerMessage && (
                        <Avatar className="h-8 w-8 border border-primary/20">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            L
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
