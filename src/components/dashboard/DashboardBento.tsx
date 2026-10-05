'use client';

import { useMemo, useState, useTransition, type ReactNode } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, EyeOff, GripVertical, LayoutGrid, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { saveMyDashboardLayout } from '@/app/actions/dashboard-layout';
import {
  WIDGET_REGISTRY,
  WIDGET_SIZE_LABEL,
  type DashboardLayout,
  type WidgetSize,
} from '@/lib/dashboard-layout';
import { cn } from '@/lib/utils';

/** ขนาดบนจอ ≥ sm (2 คอลัมน์) และ ≥ lg (4 คอลัมน์) — จอแคบสุดเรียงเป็นคอลัมน์เดียวทุกขนาด */
const SIZE_CLASS: Record<WidgetSize, string> = {
  s: '',
  m: 'sm:col-span-2',
  l: 'sm:col-span-2 sm:row-span-2',
  w: 'sm:col-span-2 lg:col-span-4',
};

const DEF_BY_ID = new Map(WIDGET_REGISTRY.map((w) => [w.id, w] as const));

interface Props {
  initialLayout: DashboardLayout;
  /** วิดเจ็ตที่ render จาก server แล้ว (คีย์ = id ใน WIDGET_REGISTRY) */
  widgets: Record<string, ReactNode>;
}

export function DashboardBento({ initialLayout, widgets }: Props) {
  const { toast } = useToast();
  const [saved, setSaved] = useState(initialLayout);
  const [layout, setLayout] = useState(initialLayout);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const visibleIds = useMemo(
    () => layout.order.filter((id) => !layout.hidden.includes(id) && id in widgets),
    [layout, widgets],
  );
  const hiddenIds = layout.order.filter((id) => layout.hidden.includes(id) && id in widgets);

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    setLayout((l) => {
      const from = l.order.indexOf(String(active.id));
      const to = l.order.indexOf(String(over.id));
      return from < 0 || to < 0 ? l : { ...l, order: arrayMove(l.order, from, to) };
    });
  }

  const setSize = (id: string, size: WidgetSize) =>
    setLayout((l) => ({ ...l, sizes: { ...l.sizes, [id]: size } }));
  const hide = (id: string) => setLayout((l) => ({ ...l, hidden: [...l.hidden, id] }));
  const show = (id: string) => setLayout((l) => ({ ...l, hidden: l.hidden.filter((h) => h !== id) }));

  function persist(next: DashboardLayout | null, done: (l: DashboardLayout) => void) {
    startTransition(async () => {
      const res = await saveMyDashboardLayout(next);
      if (res.success) {
        done(res.layout);
        toast({ title: next ? 'บันทึกเลย์เอาต์แล้ว' : 'คืนค่าเริ่มต้นแล้ว' });
      } else {
        toast({ variant: 'destructive', title: 'บันทึกไม่สำเร็จ', description: res.error });
      }
    });
  }

  const save = () =>
    persist(layout, (l) => {
      setSaved(l);
      setLayout(l);
      setEditing(false);
    });
  const reset = () =>
    persist(null, (l) => {
      setSaved(l);
      setLayout(l);
      setEditing(false);
    });
  const cancel = () => {
    setLayout(saved);
    setEditing(false);
  };

  const dirty = JSON.stringify(layout) !== JSON.stringify(saved);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {editing ? (
          <>
            <span className="mr-auto text-sm text-muted-foreground">
              ลากเพื่อสลับตำแหน่ง · เลือกขนาดหรือซ่อนที่มุมของแต่ละกล่อง
            </span>
            <Button variant="ghost" size="sm" onClick={reset} disabled={pending} className="gap-1">
              <RotateCcw className="h-4 w-4" /> คืนค่าเริ่มต้น
            </Button>
            <Button variant="outline" size="sm" onClick={cancel} disabled={pending}>
              ยกเลิก
            </Button>
            <Button size="sm" onClick={save} disabled={pending || !dirty} className="gap-1">
              <Check className="h-4 w-4" /> {pending ? 'กำลังบันทึก…' : 'บันทึก'}
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1">
            <LayoutGrid className="h-4 w-4" /> ปรับแต่งแดชบอร์ด
          </Button>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={visibleIds} strategy={rectSortingStrategy} disabled={!editing}>
          <div className="grid grid-flow-dense grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6 auto-rows-[minmax(9rem,auto)]">
            {visibleIds.map((id) => (
              <BentoCell
                key={id}
                id={id}
                size={layout.sizes[id]}
                editing={editing}
                onSize={(s) => setSize(id, s)}
                onHide={() => hide(id)}
              >
                {widgets[id]}
              </BentoCell>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {editing && hiddenIds.length > 0 && (
        <div className="rounded-xl border border-dashed p-4">
          <p className="mb-2 text-sm font-medium">กล่องที่ซ่อนอยู่</p>
          <div className="flex flex-wrap gap-2">
            {hiddenIds.map((id) => (
              <Button key={id} variant="secondary" size="sm" onClick={() => show(id)} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> {DEF_BY_ID.get(id)?.label ?? id}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BentoCell({
  id,
  size,
  editing,
  onSize,
  onHide,
  children,
}: {
  id: string;
  size: WidgetSize;
  editing: boolean;
  onSize: (s: WidgetSize) => void;
  onHide: () => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !editing,
  });
  const def = DEF_BY_ID.get(id);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'relative min-w-0',
        SIZE_CLASS[size],
        isDragging && 'z-20 opacity-80',
        editing && 'rounded-xl ring-2 ring-primary/30',
      )}
    >
      {/* ตอนแก้ไข: ชั้นโปร่งใสบังลิงก์ในการ์ด ไม่ให้คลิกแล้วเด้งไปหน้าอื่น และใช้เป็นที่จับลาก */}
      <div className={cn('h-full overflow-auto rounded-xl [&>*]:h-full', editing && 'pointer-events-none select-none')}>
        {children}
      </div>
      {editing && (
        <>
          <div
            data-bento-ui
            className="absolute inset-0 z-10 cursor-grab rounded-xl bg-background/10 active:cursor-grabbing"
            aria-label={`ลากเพื่อย้าย ${def?.label ?? id}`}
            {...attributes}
            {...listeners}
          />
          <div
            data-bento-ui
            className="absolute -bottom-3 right-3 z-20 flex items-center gap-1 rounded-lg border bg-background/95 p-1 shadow-sm"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" aria-hidden />
            {def?.allowedSizes.map((s) => (
              <Button
                key={s}
                type="button"
                size="sm"
                variant={size === s ? 'default' : 'ghost'}
                className="h-6 px-2 text-xs"
                onClick={() => onSize(s)}
              >
                {WIDGET_SIZE_LABEL[s]}
              </Button>
            ))}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={onHide}
              aria-label={`ซ่อน ${def?.label ?? id}`}
            >
              <EyeOff className="h-3.5 w-3.5" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
