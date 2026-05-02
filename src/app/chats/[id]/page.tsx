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
import { Loader2, ArrowLeft, FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: any;
  metadata?: any;
}

export default function AdminChatViewer() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.id as string;
  const { firestore } = useFirebase();

  const [chatData, setChatData] = React.useState<any>(null);
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
          // We need to figure out who is who if names are not explicitly saved.
          // Usually we can just rely on data.lawyerId to identify lawyer messages.
          setChatData(data);
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

  // Find out the client and lawyer IDs to format UI
  const lawyerId = chatData.lawyerId;
  
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
                  const isLawyerMessage = msg.senderId === lawyerId;
                  
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
                          {msg.metadata?.type === 'file_upload' || msg.text.startsWith('[อัปโหลดไฟล์]') ? (
                            <div className="flex items-center gap-2 py-1">
                              <FileIcon className="w-4 h-4" />
                              <span className="font-medium underline cursor-pointer">
                                {msg.text.replace('[อัปโหลดไฟล์]', '').trim()}
                              </span>
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
