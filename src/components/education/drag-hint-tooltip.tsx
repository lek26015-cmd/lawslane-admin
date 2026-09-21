'use client';

import React, { useState, useEffect } from 'react';
import { X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'lawslane_drag_hint_seen';

interface DragHintTooltipProps {
    targetRef?: React.RefObject<HTMLElement>;
}

export function DragHintTooltip({ targetRef }: DragHintTooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        // Check if user has seen the hint before
        const hasSeen = localStorage.getItem(STORAGE_KEY);
        if (!hasSeen) {
            // Show after a short delay to let the page render
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, []);

    useEffect(() => {
        if (isVisible && targetRef?.current) {
            const rect = targetRef.current.getBoundingClientRect();
            setPosition({
                top: rect.top + window.scrollY + rect.height / 2,
                left: rect.left + window.scrollX + rect.width + 12
            });
        }
    }, [isVisible, targetRef]);

    const handleDismiss = () => {
        localStorage.setItem(STORAGE_KEY, 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 z-40"
                onClick={handleDismiss}
            />

            {/* Tooltip */}
            <div
                className="fixed z-50 animate-in fade-in slide-in-from-left-2 duration-300"
                style={targetRef?.current ? { top: position.top - 40, left: position.left } : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
            >
                <div className="bg-indigo-600 text-white rounded-xl shadow-xl p-4 max-w-xs relative">
                    {/* Arrow pointing left */}
                    {targetRef?.current && (
                        <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2">
                            <div className="border-8 border-transparent border-r-indigo-600" />
                        </div>
                    )}

                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 bg-white/20 rounded-lg p-2">
                            <GripVertical className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold mb-1">ลากเพื่อเรียงลำดับ</h3>
                            <p className="text-sm text-indigo-100">
                                จับที่ไอคอนนี้แล้วลากขึ้น-ลงเพื่อสลับตำแหน่งบทเรียนได้เลย
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleDismiss}
                            className="text-white hover:bg-white/20 -mt-1 -mr-1"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    <Button
                        onClick={handleDismiss}
                        className="w-full mt-3 bg-white text-indigo-600 hover:bg-indigo-50"
                    >
                        เข้าใจแล้ว
                    </Button>
                </div>
            </div>
        </>
    );
}

// Simpler inline version without positioning
export function DragHintBanner() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const hasSeen = localStorage.getItem(STORAGE_KEY);
        if (!hasSeen) {
            setIsVisible(true);
        }
    }, []);

    const handleDismiss = () => {
        localStorage.setItem(STORAGE_KEY, 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl p-4 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-4">
                <div className="flex-shrink-0 bg-white/20 rounded-lg p-3">
                    <GripVertical className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-lg">💡 เคล็ดลับ: ลากเพื่อเรียงลำดับ</h3>
                    <p className="text-sm text-white/90 mt-1">
                        จับที่ไอคอน <span className="inline-flex items-center bg-white/20 rounded px-1 mx-1"><GripVertical className="w-4 h-4" /></span> แล้วลากขึ้น-ลงเพื่อสลับตำแหน่งบทเรียนและแบบทดสอบได้
                    </p>
                </div>
                <Button
                    variant="ghost"
                    onClick={handleDismiss}
                    className="text-white hover:bg-white/20 border border-white/30"
                >
                    เข้าใจแล้ว
                </Button>
            </div>
        </div>
    );
}
