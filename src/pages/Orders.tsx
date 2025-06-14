
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Package, Calendar as CalendarIcon, Grid, List, Search, Edit, Trash2, Phone, MessageCircle, CheckCircle, Clock, AlertCircle, XCircle, Eye } from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import OrderCalendar from '@/components/OrderCalendar';
import OrderGridView from '@/components/OrderGridView';
import OrderDetailsModal from '@/components/OrderDetailsModal';
import WhatsAppMessageModal from '@/components/WhatsAppMessageModal';
import { Skeleton } from '@/components/ui/skeleton';

interface CustomOrder {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  items: Array<{
    type: string;
    quantity: number;
    measurements?: any;
    notes?: string;
  }>;
  dressType: string;
  totalAmount: number;
  advanceAmount: number;
  balance: number;
  deliveryDate: string;
  notes?: string;
  designImages?: string[];
  createdAt: any;
  updatedAt?: any;
  status: 'received' | 'in-progress' | 'ready' | 'delivered' | 'cancelled';
  progress: {
    cutting: boolean;
    stitching: boolean;
    finishing: boolean;
  };
  measurements: any;
  priority: 'normal' | 'urgent';
  assignedStaff?: string;
}

// Order interface for components that expect it
interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  itemType: string;
  orderDate: any;
  deliveryDate: string;
  totalAmount: number;
  advanceAmount: number;
  remainingAmount: number;
  quantity: number;
  status: 'received' | 'in-progress' | 'ready' | 'delivered' | 'cancelled';
}

const Orders = () => {
  const { userData } = useAuth();
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<CustomOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [view, setView] = useState<'list' | 'grid' | 'calendar'>('list');
  const [selectedOrder, setSelectedOrder] = useState<CustomOrder | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  // Safe data loading with error handling
  useEffect(() => {
    if (!userData) {
      setLoading(false);
      return;
    }
    fetchOrders();
  }, [userData]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const ordersQuery = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc')
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      const ordersData = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CustomOrder[];
      
      setOrders(ordersData || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Safe data access with fallbacks
  const safeOrders = Array.isArray(orders) ? orders : [];
  
  const filteredOrders = safeOrders.filter(order => {
    if (!order) return false;
    
    const matchesSearch = (
      (order.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.orderId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.dressType || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Convert CustomOrder to Order format for components
  const convertToOrder = (customOrder: CustomOrder): Order => {
    if (!customOrder) {
      return {
        id: '',
        orderNumber: '',
        customerName: '',
        customerPhone: '',
        itemType: '',
        orderDate: new Date(),
        deliveryDate: '',
        totalAmount: 0,
        advanceAmount: 0,
        remainingAmount: 0,
        quantity: 0,
        status: 'received'
      };
    }

    return {
      id: customOrder.id || '',
      orderNumber: customOrder.orderId || '',
      customerName: customOrder.customerName || '',
      customerPhone: customOrder.customerPhone || '',
      itemType: customOrder.dressType || '',
      orderDate: customOrder.createdAt || new Date(),
      deliveryDate: customOrder.deliveryDate || '',
      totalAmount: customOrder.totalAmount || 0,
      advanceAmount: customOrder.advanceAmount || 0,
      remainingAmount: customOrder.balance || 0,
      quantity: customOrder.items?.length || 1,
      status: customOrder.status || 'received'
    };
  };

  const convertedOrders = filteredOrders.map(convertToOrder);

  // Stats with safe calculations
  const stats = {
    total: safeOrders.length,
    received: safeOrders.filter(o => o?.status === 'received').length,
    inProgress: safeOrders.filter(o => o?.status === 'in-progress').length,
    ready: safeOrders.filter(o => o?.status === 'ready').length,
    delivered: safeOrders.filter(o => o?.status === 'delivered').length
  };

  const handleViewOrder = (order: CustomOrder) => {
    if (!order) return;
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const handleSendWhatsApp = (order: CustomOrder) => {
    if (!order) return;
    setSelectedOrder(order);
    setIsWhatsAppModalOpen(true);
  };

  // Empty state
  if (!loading && safeOrders.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
            <p className="text-gray-600">Manage customer orders and track progress</p>
          </div>
        </div>
        <Card className="text-center py-12">
          <CardContent>
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-600 mb-6">Start by creating your first customer order</p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create First Order
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600">Manage customer orders and track progress</p>
        </div>
        <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
          <Plus className="h-4 w-4 mr-2" />
          New Order
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Received</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.received}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.ready}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <Package className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.delivered}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex rounded-lg border">
          <Button
            variant={view === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('calendar')}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* View Content */}
      {view === 'calendar' && (
        <OrderCalendar 
          orders={convertedOrders}
          onOrderClick={(order) => {
            const customOrder = safeOrders.find(o => o?.id === order.id);
            if (customOrder) handleViewOrder(customOrder);
          }}
        />
      )}

      {view === 'grid' && (
        <OrderGridView 
          orders={convertedOrders}
          onOrderClick={(order) => {
            const customOrder = safeOrders.find(o => o?.id === order.id);
            if (customOrder) handleViewOrder(customOrder);
          }}
          onWhatsAppClick={(order) => {
            const customOrder = safeOrders.find(o => o?.id === order.id);
            if (customOrder) handleSendWhatsApp(customOrder);
          }}
        />
      )}

      {view === 'list' && (
        <Card>
          <CardHeader>
            <CardTitle>Orders List</CardTitle>
            <CardDescription>All customer orders</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredOrders.length > 0 ? (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <div key={order?.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h3 className="font-semibold">{order?.customerName || 'Unknown Customer'}</h3>
                          <p className="text-sm text-gray-600">{order?.orderId || 'No Order ID'}</p>
                        </div>
                        <Badge variant={order?.status === 'delivered' ? 'default' : 'secondary'}>
                          {order?.status || 'Unknown'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleViewOrder(order)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleSendWhatsApp(order)}>
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                <p className="text-gray-600">Try adjusting your search or filters</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      {selectedOrder && (
        <>
          <OrderDetailsModal
            order={convertToOrder(selectedOrder)}
            isOpen={isDetailsModalOpen}
            onClose={() => {
              setIsDetailsModalOpen(false);
              setSelectedOrder(null);
            }}
            designImages={selectedOrder.designImages}
          />
          <WhatsAppMessageModal
            order={convertToOrder(selectedOrder)}
            isOpen={isWhatsAppModalOpen}
            onClose={() => {
              setIsWhatsAppModalOpen(false);
              setSelectedOrder(null);
            }}
          />
        </>
      )}
    </div>
  );
};

export default Orders;
