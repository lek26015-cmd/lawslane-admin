'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookOrder } from '@/lib/types';
import { getBookOrdersAction, updateOrderStatusAction } from '@/app/actions/book-actions';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  ShoppingBag, 
  Eye, 
  CheckCircle2, 
  Truck, 
  XCircle,
  ExternalLink,
  Calendar,
  CreditCard,
  User,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BookOrdersPage() {
  const [orders, setOrders] = useState<BookOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<BookOrder | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const { toast } = useToast();

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const data = await getBookOrdersAction();
      setOrders(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch orders", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId: string, status: BookOrder['status'], tNum?: string) => {
    setIsUpdating(true);
    try {
      const res = await updateOrderStatusAction(orderId, status, tNum);
      if (res.success) {
        toast({ title: "Updated", description: `Order status changed to ${status}` });
        setSelectedOrder(null);
        fetchOrders();
      }
    } catch (error) {
      toast({ title: "Error", description: "Feedback update failed", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: BookOrder['status']) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 uppercase font-black text-[10px] tracking-wider">Pending</Badge>;
      case 'paid': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 uppercase font-black text-[10px] tracking-wider">Paid / Confirmed</Badge>;
      case 'shipped': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 uppercase font-black text-[10px] tracking-wider">Shipped</Badge>;
      case 'delivered': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 uppercase font-black text-[10px] tracking-wider">Delivered</Badge>;
      case 'cancelled': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 uppercase font-black text-[10px] tracking-wider">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShoppingBag className="w-8 h-8 text-blue-600" />
          Bookstore Orders
        </h1>
        <p className="text-slate-500">Verify payments and manage fulfillment for book sales</p>
      </div>

      <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-20 text-center">
              <Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-600 mb-4" />
              <p className="text-slate-500">Fetching order history...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-20 text-center">
              <ShoppingBag className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No orders found yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="px-6 py-4 text-[10px] uppercase font-black text-slate-400">Order ID / Date</TableHead>
                    <TableHead className="px-6 py-4 text-[10px] uppercase font-black text-slate-400">Customer</TableHead>
                    <TableHead className="px-6 py-4 text-[10px] uppercase font-black text-slate-400">Total</TableHead>
                    <TableHead className="px-6 py-4 text-[10px] uppercase font-black text-slate-400">Status</TableHead>
                    <TableHead className="px-6 py-4 text-[10px] uppercase font-black text-slate-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="px-6 py-4 font-mono text-xs">
                        <div className="font-bold text-slate-900">{order.id.substring(0, 8)}...</div>
                        <div className="text-slate-400 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(order.createdAt).toLocaleDateString('th-TH')}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="font-bold text-sm text-slate-800">{order.shippingAddress.name}</div>
                        <div className="text-xs text-slate-500">{order.shippingAddress.phone}</div>
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
                          <Eye className="w-4 h-4" /> Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
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
                       Order Details
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
                      <User className="w-3 h-3" /> Customer & Shipping
                    </h3>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                      <p className="font-bold text-sm">{selectedOrder.shippingAddress.name}</p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {selectedOrder.shippingAddress.address}, {selectedOrder.shippingAddress.district}, {selectedOrder.shippingAddress.province}, {selectedOrder.shippingAddress.zipCode}
                      </p>
                      <p className="text-xs font-bold text-blue-600">{selectedOrder.shippingAddress.phone}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                      <ShoppingBag className="w-3 h-3" /> Items Purchased
                    </h3>
                    <div className="space-y-3">
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} className="flex gap-3 items-center">
                          <img src={item.imageUrl} className="w-10 h-12 object-cover rounded-lg border border-slate-100" />
                          <div className="flex-1">
                            <p className="text-xs font-bold text-slate-800 line-clamp-1">{item.title}</p>
                            <p className="text-[10px] text-slate-500">Qty: {item.quantity} x ฿{item.price.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-end">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400">Total Amount</p>
                      <p className="text-2xl font-black text-blue-600">฿{selectedOrder.totalAmount.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Right Side: Payment & Control */}
                <div className="p-8 bg-slate-50/50 flex flex-col gap-6">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                      <CreditCard className="w-3 h-3" /> Payment Verification
                    </h3>
                    {selectedOrder.paymentSlipUrl ? (
                      <div className="relative group cursor-pointer border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden aspect-[3/4] bg-white">
                        <img src={selectedOrder.paymentSlipUrl} className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <Button variant="outline" className="bg-white border-none text-black rounded-full" asChild>
                             <a href={selectedOrder.paymentSlipUrl} target="_blank" rel="noopener noreferrer">
                               <ExternalLink className="w-4 h-4 mr-2" /> View Original
                             </a>
                           </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-10 text-center bg-white border border-slate-200 rounded-2xl">
                        <XCircle className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                        <p className="text-xs text-slate-400">No payment slip uploaded</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <Truck className="w-3 h-3" /> Fulfillment
                    </h3>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase">Tracking Number</Label>
                        <Input 
                            placeholder="Enter carrier tracking code..." 
                            value={trackingNumber}
                            onChange={(e) => setTrackingNumber(e.target.value)}
                            className="bg-white rounded-xl border-slate-200"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Button 
                        disabled={isUpdating || selectedOrder.status === 'paid' || selectedOrder.status === 'shipped' || selectedOrder.status === 'delivered'} 
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 gap-2 text-xs font-bold"
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'paid')}
                      >
                        <CheckCircle2 className="w-4 h-4" /> Confirm Payment
                      </Button>
                      <Button 
                        disabled={isUpdating || selectedOrder.status !== 'paid'} 
                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-10 gap-2 text-xs font-bold"
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'shipped', trackingNumber)}
                      >
                        <Truck className="w-4 h-4" /> Mark Shipped
                      </Button>
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
