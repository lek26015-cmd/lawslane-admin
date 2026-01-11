
'use client';
import { useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  onSnapshot,
  orderBy,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Firestore,
  Query,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import type { LawyerProfile, HumanChatMessage } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Sparkles, Languages } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useChat } from '@/context/chat-context';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { translateToMultipleLanguages } from '@/app/actions/translate';

interface ChatBoxProps {
  firestore: Firestore;
  currentUser: User;
  otherUser: { name: string, userId: string, imageUrl: string };
  chatId: string;
  isDisabled?: boolean;
  isLawyerView?: boolean;
}

// Extend message type with translation
interface MessageWithTranslation extends HumanChatMessage {
  translation?: string;
  isTranslating?: boolean;
}

export function ChatBox({
  firestore,
  currentUser,
  otherUser,
  chatId,
  isDisabled = false,
  isLawyerView = false,
}: ChatBoxProps) {
  const [messages, setMessages] = useState<MessageWithTranslation[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isChatReady, setIsChatReady] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { initialChatMessage, setInitialChatMessage } = useChat();

  const handleTranslateMessage = async (messageId: string, text: string) => {
    // Mark as translating
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, isTranslating: true } : msg
    ));

    try {
      const result = await translateToMultipleLanguages(text);
      // Translate to English by default
      const translatedText = result.english;

      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, translation: translatedText, isTranslating: false }
          : msg
      ));
    } catch (error) {
      console.error('Translation failed:', error);
      setMessages(prev => prev.map(msg =>
        msg.id === messageId ? { ...msg, isTranslating: false } : msg
      ));
    }
  };

  useEffect(() => {
    if (!chatId || !currentUser.uid || !otherUser.userId) {
      console.warn("ChatBox missing required props:", { chatId, currentUser: currentUser?.uid, otherUser: otherUser?.userId });
      setIsLoading(false);
      return;
    }

    const chatRef = doc(firestore, 'chats', chatId);

    const ensureChatExists = async () => {
      try {
        const chatSnap = await getDoc(chatRef);
        if (!chatSnap.exists()) {
          const newChatData = {
            participants: [currentUser.uid, otherUser.userId],
            createdAt: serverTimestamp(),
            caseTitle: 'คดี: มรดก',
          };
          setDoc(chatRef, newChatData)
            .then(() => {
              setIsChatReady(true);
            })
            .catch(serverError => {
              const permissionError = new FirestorePermissionError({
                path: chatRef.path,
                operation: 'create',
                requestResourceData: newChatData,
              });
              errorEmitter.emit('permission-error', permissionError);
            });
        } else {
          setIsChatReady(true);
        }
      } catch (error) {
        console.error("Error ensuring chat exists:", error);
        const permissionError = new FirestorePermissionError({
          path: 'chats',
          operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
        setIsLoading(false);
      }
    };

    ensureChatExists();

  }, [chatId, currentUser.uid, otherUser.userId, firestore]);

  useEffect(() => {
    if (initialChatMessage && isChatReady) {
      const messagesColRef = collection(firestore, 'chats', chatId, 'messages');

      const messageData = {
        text: initialChatMessage,
        senderId: currentUser.uid,
        timestamp: serverTimestamp(),
      };

      addDoc(messagesColRef, messageData)
        .catch(serverError => {
          const permissionError = new FirestorePermissionError({
            path: messagesColRef.path,
            operation: 'create',
            requestResourceData: messageData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });

      setInitialChatMessage('');
    }
  }, [chatId, initialChatMessage, currentUser.uid, firestore, setInitialChatMessage, isChatReady]);


  useEffect(() => {
    if (!isChatReady) return;

    const messagesQuery = query(
      collection(firestore, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    setIsLoading(true);
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as MessageWithTranslation));
      setMessages(msgs);
      setIsLoading(false);
    }, (error) => {
      const permissionError = new FirestorePermissionError({
        path: `chats/${chatId}/messages`,
        operation: 'list',
      });
      errorEmitter.emit('permission-error', permissionError);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [chatId, firestore, isChatReady]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollableNode = scrollAreaRef.current.querySelector('div[style*="overflow: scroll"]');
      if (scrollableNode) {
        scrollableNode.scrollTop = scrollableNode.scrollHeight;
      }
    }
  }, [messages]);


  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isDisabled || !isChatReady) return;

    const messageData = {
      text: input,
      senderId: currentUser.uid,
      timestamp: serverTimestamp(),
    };

    setInput('');

    const messagesColRef = collection(firestore, 'chats', chatId, 'messages');

    addDoc(messagesColRef, messageData)
      .catch(serverError => {
        const permissionError = new FirestorePermissionError({
          path: messagesColRef.path,
          operation: 'create',
          requestResourceData: messageData,
        });
      });

    // Update parent chat document for Dashboard preview
    const chatRef = doc(firestore, 'chats', chatId);
    updateDoc(chatRef, {
      lastMessage: input,
      lastMessageAt: serverTimestamp(),
      ...(isLawyerView ? { lawyerReadAt: serverTimestamp() } : { hasNewMessage: true }) // Optional: flag for unread status
    }).catch(console.error);

    // Create Notification for the other user
    const recipientId = otherUser.userId;
    const senderName = currentUser.displayName || 'คู่สนทนา';

    let notificationLink = '';
    if (isLawyerView) {
      notificationLink = `/chat/${chatId}?lawyerId=${currentUser.uid}`;
    } else {
      notificationLink = `/chat/${chatId}?lawyerId=${otherUser.userId}&clientId=${currentUser.uid}&view=lawyer`;
    }

    addDoc(collection(firestore, 'notifications'), {
      type: 'chat_message',
      title: `ข้อความใหม่จาก ${senderName}`,
      message: input.length > 50 ? input.substring(0, 50) + '...' : input,
      createdAt: serverTimestamp(),
      read: false,
      recipient: recipientId,
      link: notificationLink,
      relatedId: chatId
    }).catch(err => console.error("Error creating notification:", err));
  };

  // Mark as read by lawyer
  useEffect(() => {
    if (isLawyerView && isChatReady && chatId) {
      const chatRef = doc(firestore, 'chats', chatId);
      updateDoc(chatRef, {
        lawyerReadAt: serverTimestamp()
      }).catch(err => console.warn("Failed to mark chat as read:", err));
    }
  }, [isLawyerView, isChatReady, chatId, firestore]);

  const [lawyerReadAt, setLawyerReadAt] = useState<any>(null);

  // Listen for chat metadata (read status)
  useEffect(() => {
    if (!chatId) return;
    const chatRef = doc(firestore, 'chats', chatId);
    const unsubscribe = onSnapshot(chatRef, (doc) => {
      if (doc.exists()) {
        setLawyerReadAt(doc.data().lawyerReadAt);
      }
    });
    return () => unsubscribe();
  }, [chatId, firestore]);

  const firstUserMessage = messages.find(m => m.senderId !== (isLawyerView ? currentUser.uid : otherUser.userId));

  return (
    <Card className="flex flex-col h-[80vh] shadow-lg">
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl">คดี: มรดก</CardTitle>
            <p className="text-sm text-muted-foreground">
              {isLawyerView ? `เคสของ ${otherUser.name}` : `สนทนากับ ${otherUser.name}`}
            </p>
          </div>
          {!isLawyerView && lawyerReadAt && (
            <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">
              <Sparkles className="w-3 h-3" />
              <span>ทนายอ่านแล้ว</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-grow p-0 flex flex-col min-h-0">
        <ScrollArea className="flex-grow p-6" ref={scrollAreaRef}>
          <div className="space-y-6">
            {/* Show Summary to BOTH Lawyer and Client */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                  <p className="font-semibold text-sm text-yellow-800">
                    {isLawyerView ? "AI: สรุปข้อเท็จจริงเบื้องต้นจากลูกความ" : "ข้อมูลที่คุณส่งให้ทนายความ"}
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    {firstUserMessage ? `"${firstUserMessage.text}"` : "กำลังรอข้อความแรก..."}
                  </p>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : !isChatReady ? (
              <div className="text-center text-destructive text-sm py-8">
                ไม่สามารถโหลดข้อมูลแชทได้ กรุณาลองใหม่อีกครั้ง
              </div>
            ) : messages.length === 0 && !initialChatMessage ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                เริ่มต้นการสนทนา...
              </div>
            ) : (
              messages.map((msg) => {
                const isOwnMessage = msg.senderId === currentUser.uid;

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isOwnMessage && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={otherUser.imageUrl} />
                        <AvatarFallback>
                          {otherUser.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex flex-col gap-1">
                      <div
                        className={`max-w-md rounded-lg px-4 py-2 shadow-sm text-sm ${isOwnMessage
                          ? 'bg-foreground text-background'
                          : 'bg-gray-200'
                          }`}
                      >
                        <p>{msg.text}</p>
                      </div>

                      {/* Translate button - show for messages from other user */}
                      {!isOwnMessage && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTranslateMessage(msg.id, msg.text)}
                            disabled={msg.isTranslating}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                          >
                            {msg.isTranslating ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Languages className="w-3 h-3" />
                            )}
                            <span>{msg.translation ? 'แปลใหม่' : 'แปลภาษา'}</span>
                          </button>
                        </div>
                      )}

                      {/* Translation display */}
                      {msg.translation && !isOwnMessage && (
                        <div className="max-w-md px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-xs">
                          <p className="text-blue-700 font-medium mb-1">คำแปล:</p>
                          <p className="text-blue-800">{msg.translation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-4 border-t bg-white">
        <form onSubmit={handleSendMessage} className="flex items-center w-full space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isDisabled ? "การสนทนานี้สิ้นสุดแล้ว" : "พิมพ์ข้อความ..."}
            disabled={isLoading || isDisabled}
            className="flex-grow rounded-full"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim() || isDisabled}
            className="rounded-full w-10 h-10 bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
