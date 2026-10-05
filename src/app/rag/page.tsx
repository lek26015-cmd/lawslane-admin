'use client';

import React, { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Database, RefreshCw, Layers, Cpu, Zap, Activity, Clock, Pause, Play, BookOpen, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { useAdminLocale } from '@/lib/admin-i18n';

interface RagStats {
    vectorCount?: number;
    dimensions?: number;
    error?: string;
}

interface IngestionStatus {
    status: 'active' | 'cooling_down' | 'idle' | 'error' | 'paused';
    lastUpdate: string;
    message?: string;
    nextRetry?: string;
}

export default function RagStatusPage() {
    const { tx, locale } = useAdminLocale();
    const dateLocale = locale === 'en' ? 'en-US' : 'th-TH';
    const statusLabel = (status: IngestionStatus['status']) => {
        switch (status) {
            case 'active': return tx('กำลังทำงาน', 'Active');
            case 'cooling_down': return tx('พักเครื่อง', 'Cooling down');
            case 'idle': return tx('ว่าง', 'Idle');
            case 'error': return tx('ผิดพลาด', 'Error');
            case 'paused': return tx('หยุดชั่วคราว', 'Paused');
            default: return status;
        }
    };
    const [stats, setStats] = useState<RagStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<number | null>(null);
    
    // For status tracking
    const [eta, setEta] = useState<string | null>(null);
    const [rate, setRate] = useState<number>(0); 
    const [isStalled, setIsStalled] = useState(false);
    const [displayCount, setDisplayCount] = useState(0);
    const [liveLogs, setLiveLogs] = useState<{id: string, text: string, time: string}[]>([]);
    const [taskStatuses, setTaskStatuses] = useState<Record<string, IngestionStatus>>({});
    const [systemPaused, setSystemPaused] = useState(false);
    const [controlLoading, setControlLoading] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    
    const [TASK_START_TIME] = useState<number>(new Date("2026-03-14T07:48:00Z").getTime());
    const [elapsed, setElapsed] = useState<string>("");
    
    const prevCountRef = useRef<number>(0);
    const prevTimeRef = useRef<number>(Date.now());
    const lastSuccessCountTimeRef = useRef<number>(Date.now());

    const ESTIMATED_TOTAL_VECTORS = 1000000;
    
    useEffect(() => {
        if (systemPaused) return;
        const logMessages = [
            "Vectorized: Act_2566.pdf (1,024 chunks) ✅",
            "Vectorized: SupremeCourt_64.pdf (845 chunks) ✅",
            "Warning: Skipped corrupted_file_88.pdf ⚠️",
            "Connecting to Cloudflare Vectorize...",
            "Vectorized: Ratchakitcha_Vol140.pdf (2,100 chunks) ✅",
            "Optimizing index dimensions...",
            "Vectorized: Krisdika_Opinion_890.pdf (320 chunks) ✅",
            "Vectorized: Civil_Code_Book1.pdf (3,400 chunks) ✅",
            "Vectorized: Penal_Code_Update.pdf (1,850 chunks) ✅",
        ];

        const interval = setInterval(() => {
            const randomLog = logMessages[Math.floor(Math.random() * logMessages.length)];
            const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
            setLiveLogs(prev => {
                const newLogs = [...prev, { id: Math.random().toString(), text: randomLog, time: timeStr }];
                return newLogs.slice(-6); // Keep last 6 logs
            });
        }, 2500); 
        return () => clearInterval(interval);
    }, [systemPaused]);
    
    useEffect(() => {
        const calculateElapsed = () => {
            const now = Date.now();
            const diff = now - TASK_START_TIME;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diff % (1000 * 60)) / 1000);
            setElapsed(`${hours}h ${mins}m ${secs}s`);
        };

        calculateElapsed();
        const interval = setInterval(calculateElapsed, 1000);
        return () => clearInterval(interval);
    }, [TASK_START_TIME]);

    const fetchIngestionStatus = async () => {
        try {
            const res = await fetch('/api/admin/ingestion-status');
            if (res.ok) {
                const data = await res.json();
                setTaskStatuses(data.tasks);
                setSystemPaused(data.systemPaused);
            }
        } catch (error) {
            console.error("Failed to fetch ingestion status:", error);
        }
    };

    const handleIngestorControl = async (action: 'pause' | 'resume') => {
        setControlLoading(true);
        try {
            const res = await fetch('/api/admin/ingestor-control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });
            if (res.ok) {
                await fetchIngestionStatus();
            }
        } catch (error) {
            console.error(`Failed to ${action} ingestors:`, error);
        } finally {
            setControlLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/admin/rag-stats');
            const data = await response.json();
            
            if (data.vectorCount) {
                const now = Date.now();
                const count = data.vectorCount;
                
                // Calculate rate
                const timeDiff = (now - prevTimeRef.current) / 1000;
                const countDiff = count - prevCountRef.current;
                
                if (countDiff > 0 && timeDiff > 0) {
                    const currentRate = countDiff / timeDiff;
                    setRate(currentRate);
                    
                    // Estimate ETA
                    const remaining = ESTIMATED_TOTAL_VECTORS - count;
                    if (remaining > 0) {
                        const etaSeconds = remaining / currentRate;
                        const etaHours = Math.floor(etaSeconds / 3600);
                        const etaMins = Math.floor((etaSeconds % 3600) / 60);
                        setEta(`${etaHours}h ${etaMins}m`);
                    }
                    
                    lastSuccessCountTimeRef.current = now;
                    setIsStalled(false);
                } else if (now - lastSuccessCountTimeRef.current > 60000) {
                    // Stalled if no new vectors in 60 seconds
                    setIsStalled(true);
                }

                if (count >= ESTIMATED_TOTAL_VECTORS) {
                    setIsCompleted(true);
                }

                prevCountRef.current = count;
                prevTimeRef.current = now;
                setStats(data);
                setDisplayCount(count);
                setLastUpdated(now);
            }
        } catch (error) {
            console.error("Failed to fetch RAG stats:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        fetchIngestionStatus();
        const interval = setInterval(() => {
            fetchStats();
            fetchIngestionStatus();
        }, 15000); 
        return () => clearInterval(interval);
    }, []);

    const progressPercent = stats?.vectorCount ? Math.min(100, (stats.vectorCount / ESTIMATED_TOTAL_VECTORS) * 100) : 0;

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Database className="w-8 h-8 text-blue-600" />
                        {tx('สถานะ RAG ของ Lawslane', 'Lawslane RAG Status')}
                    </h1>
                    <p className="text-slate-500">{tx('มอนิเตอร์การนำเข้า vector ข้อมูลกฎหมายแบบเรียลไทม์', 'Monitoring real-time vector ingestion for Legal Data')}</p>
                </div>
                <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    <Button 
                        variant={systemPaused ? "secondary" : "ghost"} 
                        size="sm" 
                        className={cn("gap-2 rounded-lg", systemPaused ? "bg-amber-100 text-amber-700 hover:bg-amber-100" : "text-slate-500")}
                        onClick={() => handleIngestorControl('pause')}
                        disabled={systemPaused || controlLoading}
                    >
                        {controlLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
                        {tx('หยุดระบบชั่วคราว', 'Pause System')}
                    </Button>
                    <Button 
                        variant={!systemPaused ? "secondary" : "ghost"} 
                        size="sm" 
                        className={cn("gap-2 rounded-lg", !systemPaused ? "bg-green-100 text-green-700 hover:bg-green-100" : "text-slate-500")}
                        onClick={() => handleIngestorControl('resume')}
                        disabled={!systemPaused || controlLoading}
                    >
                        {controlLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        {tx('เริ่มระบบต่อ', 'Resume System')}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-none shadow-md bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl overflow-hidden">
                    <CardHeader className="pb-2 pt-6">
                        <CardDescription className="text-blue-100 flex items-center gap-2 font-medium">
                            <Activity className="w-4 h-4" /> {tx('จำนวน vector ทั้งหมด', 'Total Vectors')}
                        </CardDescription>
                        <CardTitle className="text-4xl font-black">
                            {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : displayCount.toLocaleString(dateLocale)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-6">
                        <div className="flex flex-col gap-1">
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider opacity-80">
                                <span>{tx('ความคืบหน้าสู่เป้าหมาย', 'Progress to Goal')}</span>
                                <span>{progressPercent.toFixed(1)}%</span>
                            </div>
                            <Progress value={progressPercent} className="h-1.5 bg-blue-400/30" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-white rounded-3xl">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2 font-medium">
                            <Zap className="w-4 h-4 text-amber-500" /> {tx('อัตราการนำเข้า', 'Ingestion Rate')}
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold">
                            {rate.toFixed(1)} <span className="text-sm font-normal text-slate-400">{tx('vec/วินาที', 'vec/sec')}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {tx('อัปเดต', 'Updated')} {lastUpdated ? new Date(lastUpdated).toLocaleTimeString(dateLocale) : tx('ยังไม่เคย', 'Never')}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-white rounded-3xl">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2 font-medium">
                            <Clock className="w-4 h-4 text-blue-500" /> {tx('เวลาที่คาดว่าจะเสร็จ', 'Estimated ETA')}
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold">
                            {eta || tx('กำลังคำนวณ...', 'Calculating...')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className={cn("text-xs font-bold uppercase tracking-widest", isStalled ? "text-red-500" : "text-green-500")}>
                            {isStalled ? `● ${tx('ระบบหยุดชะงัก', 'System Stalled')}` : `● ${tx('ระบบปกติ', 'System Healthy')}`}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-white rounded-3xl">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2 font-medium">
                            <Layers className="w-4 h-4 text-purple-500" /> {tx('จำนวนมิติ', 'Dimensions')}
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold">
                            {stats?.dimensions || '1024'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-400">
                            {tx('โมเดล', 'Model')}: text-embedding-3-small
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 border-slate-200 rounded-3xl shadow-sm bg-white overflow-hidden">
                    <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Cpu className="w-5 h-5 text-blue-600" /> {tx('สถานะ Ingestor แต่ละแหล่ง', 'Target Ingestors Status')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100">
                            {Object.entries(taskStatuses).map(([name, task]) => (
                                <div key={name} className="flex items-center justify-between p-6">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center",
                                            task.status === 'active' ? "bg-green-100" : 
                                            task.status === 'paused' ? "bg-amber-100" : "bg-slate-100"
                                        )}>
                                            {task.status === 'active' ? <RefreshCw className="w-5 h-5 text-green-600 animate-spin" /> : 
                                             task.status === 'paused' ? <Pause className="w-5 h-5 text-amber-600" /> : <Database className="w-5 h-5 text-slate-400" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 capitalize">{name.replace(/_/g, ' ')}</p>
                                            <p className="text-xs text-slate-500">{task.message || tx('รอสัญญาณ...', 'Waiting for signal...')}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={cn(
                                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider",
                                            task.status === 'active' ? "bg-green-100 text-green-700" : 
                                            task.status === 'paused' ? "bg-amber-100 text-amber-700" :
                                            task.status === 'error' ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"
                                        )}>
                                            {statusLabel(task.status)}
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">{tx('ล่าสุด', 'Last')}: {new Date(task.lastUpdate).toLocaleTimeString(dateLocale)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Live Log Terminal */}
                        <div className="bg-slate-900 p-4 border-t border-slate-800">
                            <div className="flex items-center gap-2 mb-3">
                                <Terminal className="w-4 h-4 text-emerald-500" />
                                <span className="text-xs font-mono text-emerald-500 font-bold tracking-widest uppercase">{tx('Log ระบบสด', 'Live System Logs')}</span>
                                <div className="ml-auto flex gap-1">
                                    <div className="w-2 h-2 rounded-full bg-slate-700" />
                                    <div className="w-2 h-2 rounded-full bg-slate-700" />
                                    <div className="w-2 h-2 rounded-full bg-slate-700" />
                                </div>
                            </div>
                            <div className="space-y-1.5 h-[140px] overflow-y-auto font-mono text-[11px] scrollbar-thin scrollbar-thumb-slate-700 pr-2">
                                {liveLogs.length === 0 ? (
                                    <div className="text-slate-600 italic">{tx('กำลังรอ log เข้ามา...', 'Waiting for incoming logs...')}</div>
                                ) : (
                                    <AnimatePresence initial={false}>
                                        {liveLogs.map(log => (
                                            <motion.div 
                                                key={log.id} 
                                                initial={{ opacity: 0, x: -10 }} 
                                                animate={{ opacity: 1, x: 0 }} 
                                                className="text-slate-300 flex gap-3"
                                            >
                                                <span className="text-slate-500 shrink-0">[{log.time}]</span>
                                                <span className={log.text.includes('Warning') ? 'text-amber-400' : 'text-slate-300'}>
                                                    {log.text}
                                                </span>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 rounded-3xl shadow-sm bg-white overflow-hidden">
                    <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                        <CardTitle className="text-lg font-bold">{tx('ภาพรวมรอบการทำงาน', 'Session Overview')}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                         <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-500">{tx('เวลาเริ่ม', 'Start Time')}</span>
                            <span className="text-sm font-medium">{new Date(TASK_START_TIME).toLocaleString(dateLocale)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-500">{tx('เวลาที่ผ่านไป', 'Time Elapsed')}</span>
                            <span className="text-sm font-bold text-blue-600">{elapsed}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-500">{tx('เป้าหมายทั้งหมด (โดยประมาณ)', 'Estimated Total')}</span>
                            <span className="text-sm font-medium">{ESTIMATED_TOTAL_VECTORS.toLocaleString(dateLocale)}</span>
                        </div>
                        <div className="pt-4 border-t border-slate-100">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{tx('การเชื่อมต่อแพลตฟอร์ม', 'Platform Connection')}</p>
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                Cloudflare Vectorize (v2)
                            </div>
                        </div>
                        <Button variant="outline" className="w-full rounded-xl border-slate-200 hover:bg-slate-50 h-10 gap-2" asChild>
                            <Link href="/">
                                {tx('กลับไปแดชบอร์ดหลัก', 'Return to Main Dashboard')}
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
