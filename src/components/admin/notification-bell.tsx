'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirebase } from '@/firebase';
import { collection, query, where, orderBy, onSnapshot, limit, updateDoc, doc } from 'firebase/firestore';
import { AdminNotification } from '@/lib/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';

export function NotificationBell({ recipientId = 'admin' }: { recipientId?: string }) {
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const { firestore } = useFirebase();

    useEffect(() => {
        if (!firestore) return;

        // Listen for notifications intended for admin
        const notificationsRef = collection(firestore, 'notifications');
        const q = query(
            notificationsRef,
            where('recipient', '==', recipientId),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs: AdminNotification[] = [];
            let unread = 0;

            snapshot.forEach((doc) => {
                const data = doc.data();
                const notif = {
                    id: doc.id,
                    ...data,
                    // Handle timestamp safely
                    createdAt: data.createdAt
                } as AdminNotification;

                notifs.push(notif);
                if (!notif.read) unread++;
            });

            setNotifications(notifs);
            setUnreadCount(unread);
        }, (error) => {
            console.error("Notification snapshot error:", error);
        });

        return () => unsubscribe();
    }, [firestore, recipientId]);

    const handleMarkAsRead = async (id: string) => {
        if (!firestore) return;
        try {
            const notifRef = doc(firestore, 'notifications', id);
            await updateDoc(notifRef, { read: true });
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const handleMarkAllAsRead = async () => {
        if (!firestore) return;
        const unreadNotifications = notifications.filter(n => !n.read);

        // Batch update would be better, but for simplicity loop here or use Promise.all
        // In a real app with many notifications, use a WriteBatch
        try {
            await Promise.all(unreadNotifications.map(n =>
                updateDoc(doc(firestore, 'notifications', n.id), { read: true })
            ));
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-600 border-2 border-background" />
                    )}
                    <span className="sr-only">การแจ้งเตือน</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                    <h4 className="font-semibold">การแจ้งเตือน</h4>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-auto py-1 px-2"
                            onClick={handleMarkAllAsRead}
                        >
                            อ่านทั้งหมด
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-4 text-muted-foreground">
                            <Bell className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-sm">ไม่มีการแจ้งเตือน</p>
                        </div>
                    ) : (
                        <div className="grid">
                            {notifications.map((notification) => (
                                <Link
                                    key={notification.id}
                                    href={notification.link}
                                    className={cn(
                                        "flex flex-col gap-1 p-4 transition-colors hover:bg-muted/50 border-b last:border-0",
                                        !notification.read && "bg-muted/20"
                                    )}
                                    onClick={() => {
                                        if (!notification.read) handleMarkAsRead(notification.id);
                                        setIsOpen(false);
                                    }}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="font-medium text-sm leading-none">
                                            {notification.title}
                                        </span>
                                        {!notification.read && (
                                            <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {notification.message}
                                    </p>
                                    <span className="text-xs text-muted-foreground mt-1">
                                        {notification.createdAt?.toDate ?
                                            formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true, locale: th }) :
                                            'เมื่อสักครู่'
                                        }
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
