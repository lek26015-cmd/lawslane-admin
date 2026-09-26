'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { StoreOrder } from '@/lib/types';
import { getStoreOrdersAction, updateOrderStatusAction } from '@/app/actions/book-actions';
import { useToast } from '@/hooks/use-toast';
import {
  ShoppingBag,
  Eye,
  CheckCircle2,
  Truck,
  XCircle,
  ExternalLink,
  Calendar,
  CreditCard,
  User,
  Search,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { useAdminList, type AdminListSource } from '@/hooks/use-admin-list';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { DataTablePagination } from '@/components/admin/DataTablePagination';
import { TableSkeleton } from '@/components/admin/TableSkeleton';
import { useAdminLocale } from '@/lib/admin-i18n';

const PAGE_SIZE = 25;
const STATUS_TABS: { value: string; label: [string, string] }[] = [
  { value: 'all', label: ['ทั้งหมด', 'All'] },
  { value: 'PENDING', label: ['รอตรวจสอบ', 'Pending'] },
  { value: 'PAID', label: ['ชำระแล้ว', 'Paid'] },
  { value: 'SHIPPING', label: ['กำลังจัดส่ง', 'Shipping'] },
  { value: 'COMPLETED', label: ['สำเร็จ', 'Completed'] },
  { value: 'DELIVERED', label: ['จัดส่งแล้ว', 'Delivered'] },
  { value: 'REJECTED', label: ['ถูกปฏิเสธ', 'Rejected'] },
];

const STATUS_LABEL: Record<string, [string, string]> = {
  PENDING: ['รอตรวจสอบ', 'Pending'],
  PAID: ['ชำระแล้ว / ยืนยันแล้ว', 'Paid / Confirmed'],
  SHIPPING: ['จัดส่งแล้ว (ระหว่างทาง)', 'Shipped'],
  COMPLETED: ['สำเร็จ', 'Completed'],
  DELIVERED: ['ส่งถึงแล้ว', 'Delivered'],
  REJECTED: ['ถูกปฏิเสธ', 'Rejected'],
};

export default function BookOrdersPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300);
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const { toast } = useToast();
  const { tx, locale } = useAdminLocale();

  const source: AdminListSource<StoreOrder> = React.useMemo(
    () => ({
      kind: 'server-action',
      fetchPage: async (cursor, pageSize) => {
        const result = await getStoreOrdersAction({
          cursor: (cursor as string | null) ?? null,
          pageSize,
          status: activeTab !== 'all' ? (activeTab as StoreOrder['status']) : undefined,
          searchTerm: debouncedSearch || undefined,
        });
        return { items: result.items, nextCursor: result.nextCursor };
      },
    }),
    [activeTab, debouncedSearch]
  );

  const { data: orders, loading, error, hasNext, hasPrevious, page, next, previous, refresh } = useAdminList({
    source,
    pageSize: PAGE_SIZE,
    resetKey: `${activeTab}|${debouncedSearch}`,
  });

  React.useEffect(() => {
    if (error) {
      toast({ title: tx('เกิดข้อผิดพลาด', 'Error'), description: tx('โหลดรายการสั่งซื้อไม่สำเร็จ', 'Failed to fetch orders'), variant: 'destructive' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error, toast]);

  const handleUpdateStatus = async (orderId: string, status: StoreOrder['status'], tNum?: string) => {
    setIsUpdating(true);
    try {
      const res = await updateOrderStatusAction(orderId, status, tNum);
      if (res.success) {
        toast({ title: tx('อัปเดตแล้ว', 'Updated'), description: tx(`เปลี่ยนสถานะออเดอร์เป็น ${STATUS_LABEL[status]?.[0] ?? status}`, `Order status changed to ${STATUS_LABEL[status]?.[1] ?? status}`) });
        setSelectedOrder(null);
        refresh();
      }
    } catch (error) {
      toast({ title: tx('เกิดข้อผิดพลาด', 'Error'), description: tx('อัปเดตสถานะไม่สำเร็จ', 'Status update failed'), variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: StoreOrder['status']) => {
    switch (status) {
      case 'PENDING': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 uppercase font-black text-[10px] tracking-wider">{tx(...STATUS_LABEL.PENDING)}</Badge>;
      case 'PAID': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 uppercase font-black text-[10px] tracking-wider">{tx(...STATUS_LABEL.PAID)}</Badge>;
      case 'SHIPPING': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 uppercase font-black text-[10px] tracking-wider">{tx(...STATUS_LABEL.SHIPPING)}</Badge>;
      case 'COMPLETED': return <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 uppercase font-black text-[10px] tracking-wider">{tx(...STATUS_LABEL.COMPLETED)}</Badge>;
      case 'DELIVERED': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 uppercase font-black text-[10px] tracking-wider">{tx(...STATUS_LABEL.DELIVERED)}</Badge>;
      case 'REJECTED': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 uppercase font-black text-[10px] tracking-wider">{tx(...STATUS_LABEL.REJECTED)}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShoppingBag className="w-8 h-8 text-blue-600" />
          {tx('รายการสั่งซื้อ', 'Store Orders')}
        </h1>
        <p className="text-slate-500">{tx('ตรวจสอบการชำระเงินและจัดการการจัดส่งคำสั่งซื้อหนังสือ/คอร์ส/ข้อสอบจาก Lawslane Wittaya', 'Verify payments and manage fulfillment for book/course/exam purchases from Lawslane Wittaya')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto">
            {STATUS_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>{tx(...t.label)}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full max-w-[240px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder={tx('ค้นหาด้วย User ID (ตรงทั้งหมด)...', 'Search by User ID (exact match)...')}
            className="pl-8 h-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="px-6 py-4 text-[10px] uppercase font-black text-slate-400">{tx('รหัสออเดอร์ / วันที่', 'Order ID / Date')}</TableHead>
                  <TableHead className="px-6 py-4 text-[10px] uppercase font-black text-slate-400">{tx('ลูกค้า', 'Customer')}</TableHead>
                  <TableHead className="px-6 py-4 text-[10px] uppercase font-black text-slate-400">{tx('ยอดรวม', 'Total')}</TableHead>
                  <TableHead className="px-6 py-4 text-[10px] uppercase font-black text-slate-400">{tx('สถานะ', 'Status')}</TableHead>
                  <TableHead className="px-6 py-4 text-[10px] uppercase font-black text-slate-400 text-right">{tx('จัดการ', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableSkeleton rows={8} columns={5} />
            </Table>
          ) : orders.length === 0 ? (
            <div className="p-20">
              <EmptyState
                icon={ShoppingBag}
                title={debouncedSearch ? tx(`ไม่พบออเดอร์สำหรับ userId "${debouncedSearch}"`, `No orders found for userId "${debouncedSearch}"`) : tx('ยังไม่มีออเดอร์', 'No orders found yet')}
                description={debouncedSearch ? tx('ลองล้างคำค้นหาแล้วค้นหาใหม่', 'Try clearing the search and searching again') : tx('ออเดอร์ใหม่จากลูกค้าจะแสดงที่นี่', 'New customer orders will appear here')}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="px-6 py-4 text-[10px] uppercase font-black text-slate-400">{tx('รหัสออเดอร์ / วันที่', 'Order ID / Date')}</TableHead>
                    <TableHead className="px-6 py-4 text-[10px] uppercase font-black text-slate-400">{tx('ลูกค้า', 'Customer')}</TableHead>
                    <TableHead className="px-6 py-4 text-[10px] uppercase font-black text-slate-400">{tx('ยอดรวม', 'Total')}</TableHead>
                    <TableHead className="px-6 py-4 text-[10px] uppercase font-black text-slate-400">{tx('สถานะ', 'Status')}</TableHead>
                    <TableHead className="px-6 py-4 text-[10px] uppercase font-black text-slate-400 text-right">{tx('จัดการ', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="px-6 py-4 font-mono text-xs">
                        <div className="font-bold text-slate-900">{order.id.substring(0, 8)}...</div>
                        <div className="text-slate-400 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(order.createdAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'th-TH')}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {order.shippingInfo ? (
                          <>
                            <div className="font-bold text-sm text-slate-800">{order.shippingInfo.name}</div>
                            <div className="text-xs text-slate-500">{order.shippingInfo.phone}</div>
                          </>
                        ) : (
                          <>
                            <div className="font-mono text-xs text-slate-500">{order.userId.substring(0, 12)}...</div>
                            <div className="text-[10px] text-slate-400 italic">{tx('สินค้าดิจิทัล ไม่ต้องจัดส่ง', 'Digital product, no shipping')}</div>
                          </>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 font-bold text-blue-600">
                        ฿{order.totalAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {getStatusBadge(order.status)}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-xl gap-2 hover:bg-blue-50 hover:text-blue-600"
                          onClick={() => {
                            setSelectedOrder(order);
                            setTrackingNumber(order.trackingNumber || '');
                          }}
                        >
                          <Eye className="w-4 h-4" /> {tx('รายละเอียด', 'Details')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <div className="px-6 py-4 border-t border-slate-100">
          <DataTablePagination
            page={page}
            shown={orders.length}
            hasNext={hasNext}
            hasPrevious={hasPrevious}
            loading={loading}
            onNext={next}
            onPrevious={previous}
          />
        </div>
      </Card>

      {/* Order Details & Verification Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl rounded-3xl overflow-hidden p-0 gap-0 border-none shadow-2xl">
          {selectedOrder && (
            <>
              <div className="bg-slate-900 p-8 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-black mb-1 flex items-center gap-2">
                       {tx('รายละเอียดออเดอร์', 'Order Details')}
                    </h2>
                    <p className="text-slate-400 text-xs font-mono">ID: {selectedOrder.id}</p>
                  </div>
                  {getStatusBadge(selectedOrder.status)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Left Side: Order Info */}
                <div className="p-8 border-r border-slate-100 flex flex-col gap-6">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                      <User className="w-3 h-3" /> {tx('ลูกค้าและการจัดส่ง', 'Customer & Shipping')}
                    </h3>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                      {selectedOrder.shippingInfo ? (
                        <>
                          <p className="font-bold text-sm">{selectedOrder.shippingInfo.name}</p>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {selectedOrder.shippingInfo.address}
                          </p>
                          <p className="text-xs font-bold text-blue-600">{selectedOrder.shippingInfo.phone}</p>
                        </>
                      ) : (
                        <p className="text-xs text-slate-500 italic">{tx('สินค้าดิจิทัล (ebook/คอร์ส) ไม่ต้องจัดส่ง', 'Digital product (ebook/course), no shipping')} — userId: {selectedOrder.userId}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                      <ShoppingBag className="w-3 h-3" /> {tx('รายการสินค้า', 'Items Purchased')}
                    </h3>
                    <div className="space-y-3">
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} className="flex gap-3 items-center">
                          <img src={item.coverUrl} className="w-10 h-12 object-cover rounded-lg border border-slate-100" />
                          <div className="flex-1">
                            <p className="text-xs font-bold text-slate-800 line-clamp-1">{item.title} <span className="text-slate-400 font-normal">({item.type})</span></p>
                            <p className="text-[10px] text-slate-500">{tx('จำนวน', 'Qty')}: {item.quantity} x ฿{item.price.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-end">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400">{tx('ยอดรวม', 'Total Amount')}</p>
                      <p className="text-2xl font-black text-blue-600">฿{selectedOrder.totalAmount.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Right Side: Payment & Control */}
                <div className="p-8 bg-slate-50/50 flex flex-col gap-6">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                      <CreditCard className="w-3 h-3" /> {tx('ตรวจสอบการชำระเงิน', 'Payment Verification')}
                    </h3>
                    {selectedOrder.slipUrl ? (
                      <div className="relative group cursor-pointer border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden aspect-[3/4] bg-white">
                        <img src={selectedOrder.slipUrl} className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <Button variant="outline" className="bg-white border-none text-black rounded-full" asChild>
                             <a href={selectedOrder.slipUrl} target="_blank" rel="noopener noreferrer">
                               <ExternalLink className="w-4 h-4 mr-2" /> {tx('ดูรูปต้นฉบับ', 'View Original')}
                             </a>
                           </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-10 text-center bg-white border border-slate-200 rounded-2xl">
                        <XCircle className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                        <p className="text-xs text-slate-400">{tx('ยังไม่มีการอัปโหลดสลิป', 'No payment slip uploaded')}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <Truck className="w-3 h-3" /> {tx('การจัดส่ง', 'Fulfillment')}
                    </h3>
                    {selectedOrder.shippingInfo && (
                      <div className="space-y-2">
                          <Label className="text-[10px] font-black text-slate-400 uppercase">{tx('เลขพัสดุ', 'Tracking Number')}</Label>
                          <Input
                              placeholder={tx('กรอกเลขพัสดุของขนส่ง...', 'Enter carrier tracking code...')}
                              value={trackingNumber}
                              onChange={(e) => setTrackingNumber(e.target.value)}
                              className="bg-white rounded-xl border-slate-200"
                          />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Button
                        disabled={isUpdating || selectedOrder.status !== 'PENDING'}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 gap-2 text-xs font-bold"
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'PAID')}
                      >
                        <CheckCircle2 className="w-4 h-4" /> {tx('ยืนยันการชำระเงิน', 'Confirm Payment')}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={isUpdating || selectedOrder.status !== 'PENDING'}
                        className="border-red-200 text-red-600 hover:bg-red-50 rounded-xl h-10 gap-2 text-xs font-bold"
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'REJECTED')}
                      >
                        <XCircle className="w-4 h-4" /> {tx('ปฏิเสธ', 'Reject')}
                      </Button>
                      {selectedOrder.shippingInfo ? (
                        <>
                          <Button
                            disabled={isUpdating || selectedOrder.status !== 'PAID'}
                            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-10 gap-2 text-xs font-bold"
                            onClick={() => handleUpdateStatus(selectedOrder.id, 'SHIPPING', trackingNumber)}
                          >
                            <Truck className="w-4 h-4" /> {tx('ทำเครื่องหมายว่าจัดส่งแล้ว', 'Mark Shipped')}
                          </Button>
                          <Button
                            disabled={isUpdating || selectedOrder.status !== 'SHIPPING'}
                            className="bg-green-600 hover:bg-green-700 text-white rounded-xl h-10 gap-2 text-xs font-bold"
                            onClick={() => handleUpdateStatus(selectedOrder.id, 'DELIVERED')}
                          >
                            <CheckCircle2 className="w-4 h-4" /> {tx('ทำเครื่องหมายว่าส่งถึงแล้ว', 'Mark Delivered')}
                          </Button>
                        </>
                      ) : (
                        <Button
                          disabled={isUpdating || selectedOrder.status !== 'PAID'}
                          className="col-span-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl h-10 gap-2 text-xs font-bold"
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED')}
                        >
                          <CheckCircle2 className="w-4 h-4" /> {tx('ทำเครื่องหมายว่าสำเร็จ', 'Mark Completed')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
