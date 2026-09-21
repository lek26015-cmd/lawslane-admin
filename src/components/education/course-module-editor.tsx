'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    GripVertical,
    Plus,
    Trash2,
    ChevronDown,
    ChevronRight,
    Video,
    FileText,
    Eye,
    FileQuestion
} from 'lucide-react';
import { CourseModule, CourseLesson, CourseQuizItem, CourseModuleItem, CourseLessonAttachment, Exam } from '@/lib/education-types';
import { Switch } from '@/components/ui/switch';
import { VideoUploader } from '@/components/education/video-uploader';
import { DragHintBanner } from '@/components/education/drag-hint-tooltip';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// DnD Kit imports
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CourseModuleEditorProps {
    modules: CourseModule[];
    onChange: (modules: CourseModule[]) => void;
}

// Sortable Module Card
function SortableModuleCard({
    module,
    moduleIndex,
    isExpanded,
    onToggle,
    onUpdate,
    onDelete,
    children
}: {
    module: CourseModule;
    moduleIndex: number;
    isExpanded: boolean;
    onToggle: () => void;
    onUpdate: (updates: Partial<CourseModule>) => void;
    onDelete: () => void;
    children: React.ReactNode;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: module.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const items = module.items || module.lessons?.map(l => ({ ...l, type: 'lesson' as const })) || [];
    const lessonCount = items.filter(i => i.type === 'lesson').length;
    const quizCount = items.filter(i => i.type === 'quiz').length;

    return (
        <Card ref={setNodeRef} style={style} className="border-slate-200">
            <CardHeader className="py-3 px-4">
                <div className="flex items-center gap-3">
                    <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
                        <GripVertical className="w-5 h-5 text-slate-400" />
                    </div>
                    <button
                        type="button"
                        onClick={onToggle}
                        className="p-1 hover:bg-slate-100 rounded"
                    >
                        {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-slate-600" />
                        ) : (
                            <ChevronRight className="w-5 h-5 text-slate-600" />
                        )}
                    </button>
                    <div className="flex-1">
                        <Input
                            value={module.title}
                            onChange={(e) => onUpdate({ title: e.target.value })}
                            className="font-semibold text-slate-900 border-0 p-0 h-auto focus-visible:ring-0"
                            placeholder="ชื่อบทเรียน"
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span>{lessonCount} บทย่อย</span>
                        {quizCount > 0 && (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                                {quizCount} แบบทดสอบ
                            </Badge>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onDelete}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </CardHeader>
            {isExpanded && children}
        </Card>
    );
}

// Sortable Item (Lesson or Quiz)
function SortableItem({
    item,
    moduleIndex,
    itemIndex,
    moduleId,
    exams,
    onUpdate,
    onDelete,
    onAddAttachment,
    onUpdateAttachment,
    onDeleteAttachment
}: {
    item: CourseModuleItem;
    moduleIndex: number;
    itemIndex: number;
    moduleId: string;
    exams: Exam[];
    onUpdate: (updates: Partial<CourseModuleItem>) => void;
    onDelete: () => void;
    onAddAttachment: () => void;
    onUpdateAttachment: (attachmentId: string, updates: Partial<CourseLessonAttachment>) => void;
    onDeleteAttachment: (attachmentId: string) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    if (item.type === 'lesson') {
        const lesson = item as CourseLesson;
        return (
            <div ref={setNodeRef} style={style} className="border rounded-lg p-4 bg-slate-50">
                <div className="flex items-start gap-3">
                    <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mt-2">
                        <GripVertical className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-blue-100 text-blue-700">วิดีโอ</Badge>
                            <span className="text-sm text-slate-500 font-medium">
                                {moduleIndex + 1}.{itemIndex + 1}
                            </span>
                            <Input
                                value={lesson.title}
                                onChange={(e) => onUpdate({ title: e.target.value })}
                                placeholder="ชื่อบทย่อย"
                                className="flex-1"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onDelete}
                                className="text-red-500 hover:text-red-600"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Video className="w-4 h-4 text-slate-400" />
                                <span>วิดีโอบทเรียน</span>
                            </div>
                            <VideoUploader
                                value={lesson.videoUrl || ''}
                                onChange={(url) => onUpdate({ videoUrl: url })}
                                type="video"
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-600">ระยะเวลา:</span>
                                <Input
                                    type="number"
                                    value={lesson.durationMinutes}
                                    onChange={(e) => onUpdate({ durationMinutes: Number(e.target.value) })}
                                    className="w-20 text-sm"
                                />
                                <span className="text-sm text-slate-500">นาที</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Eye className="w-4 h-4 text-slate-400" />
                                <span className="text-sm text-slate-600">ดูฟรี:</span>
                                <Switch
                                    checked={lesson.isFreePreview}
                                    onCheckedChange={(checked) => onUpdate({ isFreePreview: checked })}
                                />
                            </div>
                        </div>

                        {/* Attachments */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-600">เอกสารประกอบ</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={onAddAttachment}
                                    className="text-indigo-600 hover:text-indigo-700"
                                >
                                    <Plus className="w-4 h-4 mr-1" />
                                    เพิ่มเอกสาร
                                </Button>
                            </div>
                            {(lesson.attachments || []).map((att) => (
                                <div key={att.id} className="flex items-center gap-2 bg-white p-2 rounded border">
                                    <FileText className="w-4 h-4 text-slate-400" />
                                    <Input
                                        value={att.name}
                                        onChange={(e) => onUpdateAttachment(att.id, { name: e.target.value })}
                                        placeholder="ชื่อเอกสาร"
                                        className="w-40 text-sm"
                                    />
                                    <Input
                                        value={att.url}
                                        onChange={(e) => onUpdateAttachment(att.id, { url: e.target.value })}
                                        placeholder="URL เอกสาร"
                                        className="flex-1 text-sm"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onDeleteAttachment(att.id)}
                                        className="text-red-500 hover:text-red-600"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    } else {
        // Quiz item
        const quiz = item as CourseQuizItem;
        return (
            <div ref={setNodeRef} style={style} className="border rounded-lg p-4 bg-orange-50 border-orange-200">
                <div className="flex items-start gap-3">
                    <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mt-2">
                        <GripVertical className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-orange-100 text-orange-700">แบบทดสอบ</Badge>
                            <span className="text-sm text-slate-500 font-medium">
                                {moduleIndex + 1}.{itemIndex + 1}
                            </span>
                            <Input
                                value={quiz.title}
                                onChange={(e) => onUpdate({ title: e.target.value })}
                                placeholder="ชื่อแบบทดสอบ"
                                className="flex-1"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onDelete}
                                className="text-red-500 hover:text-red-600"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 flex-1">
                                <FileQuestion className="w-4 h-4 text-orange-500" />
                                <Select
                                    value={quiz.examId}
                                    onValueChange={(value) => onUpdate({ examId: value })}
                                >
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="เลือกข้อสอบ" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {exams.map(exam => (
                                            <SelectItem key={exam.id} value={exam.id}>
                                                {exam.title} ({exam.totalQuestions} ข้อ)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-600">ต้องผ่าน:</span>
                                <Switch
                                    checked={quiz.passingRequired}
                                    onCheckedChange={(checked) => onUpdate({ passingRequired: checked })}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export function CourseModuleEditor({ modules, onChange }: CourseModuleEditorProps) {
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
    const [exams, setExams] = useState<Exam[]>([]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        fetch('/api/education/exams')
            .then(res => res.json())
            .then(data => setExams(data))
            .catch(console.error);
    }, []);

    const getModuleItems = (module: CourseModule): CourseModuleItem[] => {
        if (module.items && module.items.length > 0) {
            return module.items;
        }
        return (module.lessons || []).map(l => ({ ...l, type: 'lesson' as const }));
    };

    const handleModuleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = modules.findIndex(m => m.id === active.id);
            const newIndex = modules.findIndex(m => m.id === over.id);
            onChange(arrayMove(modules, oldIndex, newIndex));
        }
    };

    const handleItemDragEnd = (moduleId: string) => (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const module = modules.find(m => m.id === moduleId);
            if (!module) return;

            const items = getModuleItems(module);
            const oldIndex = items.findIndex(i => i.id === active.id);
            const newIndex = items.findIndex(i => i.id === over.id);
            const newItems = arrayMove(items, oldIndex, newIndex);

            updateModule(moduleId, {
                items: newItems,
                lessons: newItems.filter(i => i.type === 'lesson') as CourseLesson[]
            });
        }
    };

    const toggleModule = (moduleId: string) => {
        const newExpanded = new Set(expandedModules);
        if (newExpanded.has(moduleId)) {
            newExpanded.delete(moduleId);
        } else {
            newExpanded.add(moduleId);
        }
        setExpandedModules(newExpanded);
    };

    const addModule = () => {
        const newModule: CourseModule = {
            id: `module-${Date.now()}`,
            title: 'บทเรียนใหม่',
            description: '',
            items: [],
            lessons: []
        };
        onChange([...modules, newModule]);
        setExpandedModules(new Set([...expandedModules, newModule.id]));
    };

    const updateModule = (moduleId: string, updates: Partial<CourseModule>) => {
        onChange(modules.map(m => m.id === moduleId ? { ...m, ...updates } : m));
    };

    const deleteModule = (moduleId: string) => {
        onChange(modules.filter(m => m.id !== moduleId));
    };

    const addLesson = (moduleId: string) => {
        const module = modules.find(m => m.id === moduleId);
        if (!module) return;

        const items = getModuleItems(module);
        const newLesson: CourseLesson = {
            id: `lesson-${Date.now()}`,
            type: 'lesson',
            title: 'บทเรียนย่อยใหม่',
            durationMinutes: 0,
            isFreePreview: false,
            order: items.length,
            attachments: []
        };

        updateModule(moduleId, {
            items: [...items, newLesson],
            lessons: [...items.filter(i => i.type === 'lesson'), newLesson] as CourseLesson[]
        });
    };

    const addQuiz = (moduleId: string) => {
        const module = modules.find(m => m.id === moduleId);
        if (!module) return;

        const items = getModuleItems(module);
        const newQuiz: CourseQuizItem = {
            id: `quiz-${Date.now()}`,
            type: 'quiz',
            title: 'แบบทดสอบใหม่',
            examId: '',
            passingRequired: false,
            order: items.length
        };

        updateModule(moduleId, {
            items: [...items, newQuiz],
            lessons: items.filter(i => i.type === 'lesson') as CourseLesson[]
        });
    };

    const updateItem = (moduleId: string, itemId: string, updates: Partial<CourseModuleItem>) => {
        const module = modules.find(m => m.id === moduleId);
        if (!module) return;

        const items = getModuleItems(module);
        const newItems = items.map(item =>
            item.id === itemId ? { ...item, ...updates } : item
        ) as CourseModuleItem[];

        updateModule(moduleId, {
            items: newItems,
            lessons: newItems.filter(i => i.type === 'lesson') as CourseLesson[]
        });
    };

    const deleteItem = (moduleId: string, itemId: string) => {
        const module = modules.find(m => m.id === moduleId);
        if (!module) return;

        const items = getModuleItems(module).filter(i => i.id !== itemId);
        updateModule(moduleId, {
            items,
            lessons: items.filter(i => i.type === 'lesson') as CourseLesson[]
        });
    };

    const addAttachment = (moduleId: string, lessonId: string) => {
        const module = modules.find(m => m.id === moduleId);
        if (!module) return;

        const items = getModuleItems(module);
        const lesson = items.find(i => i.id === lessonId && i.type === 'lesson') as CourseLesson;
        if (!lesson) return;

        const newAttachment: CourseLessonAttachment = {
            id: `att-${Date.now()}`,
            name: 'เอกสารใหม่',
            url: '',
            type: 'pdf'
        };

        updateItem(moduleId, lessonId, {
            attachments: [...(lesson.attachments || []), newAttachment]
        });
    };

    const updateAttachment = (moduleId: string, lessonId: string, attachmentId: string, updates: Partial<CourseLessonAttachment>) => {
        const module = modules.find(m => m.id === moduleId);
        if (!module) return;

        const items = getModuleItems(module);
        const lesson = items.find(i => i.id === lessonId && i.type === 'lesson') as CourseLesson;
        if (!lesson) return;

        updateItem(moduleId, lessonId, {
            attachments: (lesson.attachments || []).map(a =>
                a.id === attachmentId ? { ...a, ...updates } : a
            )
        });
    };

    const deleteAttachment = (moduleId: string, lessonId: string, attachmentId: string) => {
        const module = modules.find(m => m.id === moduleId);
        if (!module) return;

        const items = getModuleItems(module);
        const lesson = items.find(i => i.id === lessonId && i.type === 'lesson') as CourseLesson;
        if (!lesson) return;

        updateItem(moduleId, lessonId, {
            attachments: (lesson.attachments || []).filter(a => a.id !== attachmentId)
        });
    };

    return (
        <div className="space-y-4">
            <DragHintBanner />
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleModuleDragEnd}
            >
                <SortableContext
                    items={modules.map(m => m.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {modules.map((module, moduleIndex) => {
                        const items = getModuleItems(module);

                        return (
                            <SortableModuleCard
                                key={module.id}
                                module={module}
                                moduleIndex={moduleIndex}
                                isExpanded={expandedModules.has(module.id)}
                                onToggle={() => toggleModule(module.id)}
                                onUpdate={(updates) => updateModule(module.id, updates)}
                                onDelete={() => deleteModule(module.id)}
                            >
                                <CardContent className="pt-0 pb-4 px-4">
                                    <Textarea
                                        value={module.description || ''}
                                        onChange={(e) => updateModule(module.id, { description: e.target.value })}
                                        placeholder="คำอธิบายบทเรียน (ไม่บังคับ)"
                                        className="mb-4 text-sm"
                                        rows={2}
                                    />

                                    <div className="space-y-3 ml-8">
                                        <DndContext
                                            sensors={sensors}
                                            collisionDetection={closestCenter}
                                            onDragEnd={handleItemDragEnd(module.id)}
                                        >
                                            <SortableContext
                                                items={items.map(i => i.id)}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                {items.map((item, itemIndex) => (
                                                    <SortableItem
                                                        key={item.id}
                                                        item={item}
                                                        moduleIndex={moduleIndex}
                                                        itemIndex={itemIndex}
                                                        moduleId={module.id}
                                                        exams={exams}
                                                        onUpdate={(updates) => updateItem(module.id, item.id, updates)}
                                                        onDelete={() => deleteItem(module.id, item.id)}
                                                        onAddAttachment={() => addAttachment(module.id, item.id)}
                                                        onUpdateAttachment={(attId, updates) => updateAttachment(module.id, item.id, attId, updates)}
                                                        onDeleteAttachment={(attId) => deleteAttachment(module.id, item.id, attId)}
                                                    />
                                                ))}
                                            </SortableContext>
                                        </DndContext>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full border-dashed"
                                                >
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    เพิ่มรายการ
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="center" className="w-48">
                                                <DropdownMenuItem onClick={() => addLesson(module.id)}>
                                                    <Video className="w-4 h-4 mr-2 text-blue-600" />
                                                    เพิ่มบทเรียนวิดีโอ
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => addQuiz(module.id)}>
                                                    <FileQuestion className="w-4 h-4 mr-2 text-orange-600" />
                                                    เพิ่มแบบทดสอบ
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardContent>
                            </SortableModuleCard>
                        );
                    })}
                </SortableContext>
            </DndContext>

            <Button
                type="button"
                variant="outline"
                onClick={addModule}
                className="w-full border-dashed py-6"
            >
                <Plus className="w-5 h-5 mr-2" />
                เพิ่มบทเรียนใหม่
            </Button>
        </div>
    );
}
