
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Package, Calendar as CalendarIcon, Grid, List, Search, Eye, MessageCircle, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import OrderCalendar from '@/components/OrderCalendar';
import OrderGridView from '@/components/OrderGridView';
import OrderDetailsModal from '@/components/OrderDetailsModal';
import WhatsAppMessageModal from '@/components/WhatsAppMessageModal';
import { Skeleton } from '@/components/ui/skeleton';
import LoadingSpinner from '@/components/LoadingSpinner';

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
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [view, setView] = useState<'list' | 'grid' | 'calendar'>('list');
  const [selectedOrder, setSelectedOrder] = useState<CustomOrder | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  useEffect(() => {
    if (!userData) {
      setLoading(false);
      setError('User not authenticated');
      return;
    }
    fetchOrders();
  }, [userData]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
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
      setError('Failed to fetch orders. Please try again.');
      setOrders([]);
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Error boundary
  if (error && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load orders</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={fetchOrders}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return <LoadingSpinner type="page" />;
  }

  // Safe data access
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

  // Convert CustomOrder to Order format
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

  // Stats calculation
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'received':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'in-progress':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'delivered':
        return <Package className="h-4 w-4 text-gray-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'in-progress':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'ready':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'delivered':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'cancelled':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
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
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Received</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.received}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.ready}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
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
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex rounded-lg border bg-white">
          <Button
            variant={view === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('list')}
            className="rounded-r-none"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('grid')}
            className="rounded-none border-x"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('calendar')}
            className="rounded-l-none"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* View Content */}
      {view === 'calendar' && (
        <OrderCalendar 
          orders={convertedOrders}
          onDateSelect={(date, dayOrders) => {
            console.log('Selected date:', date, 'Orders:', dayOrders);
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
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Orders List</CardTitle>
            <CardDescription>All customer orders</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredOrders.length > 0 ? (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <div key={order?.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{order?.customerName || 'Unknown Customer'}</h3>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <span>{order?.orderId || 'No Order ID'}</span>
                            <span>•</span>
                            <span>{order?.dressType || 'No Type'}</span>
                            {order?.deliveryDate && (
                              <>
                                <span>•</span>
                                <span>Due: {new Date(order.deliveryDate).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <div className="font-semibold">₹{(order?.totalAmount || 0).toLocaleString()}</div>
                            {order?.balance > 0 && (
                              <div className="text-sm text-red-600">₹{order.balance} due</div>
                            )}
                          </div>
                          <Badge className={`${getStatusColor(order?.status || 'received')} border`}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(order?.status || 'received')}
                              <span className="capitalize">{order?.status || 'Unknown'}</span>
                            </div>
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
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
            onWhatsAppClick={() => handleSendWhatsApp(selectedOrder)}
            onRefresh={fetchOrders}
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
