import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface DataTablePaginationProps {
  page: number;
  shown: number;
  hasNext: boolean;
  hasPrevious: boolean;
  loading: boolean;
  onNext: () => void;
  onPrevious: () => void;
}

export function DataTablePagination({
  page,
  shown,
  hasNext,
  hasPrevious,
  loading,
  onNext,
  onPrevious,
}: DataTablePaginationProps) {
  return (
    <div className="flex items-center justify-between pt-2">
      <div className="text-xs text-muted-foreground">
        หน้า {page} · แสดง {shown} รายการ
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={!hasPrevious || loading} onClick={onPrevious}>
          <ChevronLeft className="h-4 w-4" />
          ก่อนหน้า
        </Button>
        <Button variant="outline" size="sm" disabled={!hasNext || loading} onClick={onNext}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              ถัดไป
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
