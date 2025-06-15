
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Package, Calendar as CalendarIcon, Grid, List, Search, Eye, MessageCircle, CheckCircle, Clock, AlertCircle, XCircle, Edit, Play, Trash2, Phone } from 'lucide-react';
import { collection, getDocs, query, orderBy, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import OrderCalendar from '@/components/OrderCalendar';
import OrderGridView from '@/components/OrderGridView';
import OrderDetailsModal from '@/components/OrderDetailsModal';
import WhatsAppMessageModal from '@/components/WhatsAppMessageModal';
import CreateOrderModal from '@/components/CreateOrderModal';
import { Skeleton } from '@/components/ui/skeleton';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  itemType: string;
  orderDate: string;
  deliveryDate: string;
  totalAmount: number;
  advanceAmount: number;
  remainingAmount: number;
  quantity: number;
  status: 'received' | 'in-progress' | 'ready' | 'delivered' | 'cancelled';
  measurements?: Record<string, string>;
  notes?: string;
  designImages?: string[];
  assignedStaff?: string[];
  requiredMaterials?: any[];
}

const Orders = () => {
  const { userData } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [view, setView] = useState<'list' | 'grid' | 'calendar'>('list');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedGridStatus, setSelectedGridStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!userData) {
      setLoading(false);
      setError('User not authenticated');
      return;
    }
    
    // Real-time listener for orders
    const unsubscribe = onSnapshot(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        try {
          const ordersData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              orderNumber: data.orderId || data.orderNumber || `ORD-${doc.id.slice(-6)}`,
              customerName: data.customerName || '',
              customerPhone: data.customerPhone || '',
              customerEmail: data.customerEmail || '',
              itemType: data.dressType || data.itemType || '',
              orderDate: data.createdAt?.toDate?.()?.toLocaleDateString() || new Date().toLocaleDateString(),
              deliveryDate: data.deliveryDate || '',
              totalAmount: data.totalAmount || 0,
              advanceAmount: data.advanceAmount || 0,
              remainingAmount: data.balance || data.remainingAmount || 0,
              quantity: data.items?.length || data.quantity || 1,
              status: data.status || 'received',
              measurements: data.measurements || {},
              notes: data.notes || '',
              designImages: data.designImages || [],
              assignedStaff: data.assignedStaff || [],
              requiredMaterials: data.requiredMaterials || []
            } as Order;
          });
          
          setOrders(ordersData);
          setLoading(false);
          setError(null);
        } catch (error) {
          console.error('Error processing orders:', error);
          setError('Failed to process orders data');
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error fetching orders:', error);
        setError('Failed to fetch orders');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userData]);

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
              <Button onClick={() => window.location.reload()}>
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
      (order.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.itemType || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Stats calculation
  const stats = {
    total: safeOrders.length,
    revenue: safeOrders.filter(o => o?.status === 'delivered').reduce((sum, o) => sum + (o?.totalAmount || 0), 0),
    pending: safeOrders.filter(o => o?.status === 'received').length,
    inProgress: safeOrders.filter(o => o?.status === 'in-progress').length,
    ready: safeOrders.filter(o => o?.status === 'ready').length,
    delivered: safeOrders.filter(o => o?.status === 'delivered').length,
    cancelled: safeOrders.filter(o => o?.status === 'cancelled').length
  };

  const handleViewOrder = (order: Order) => {
    if (!order) return;
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const handleSendWhatsApp = (order: Order) => {
    if (!order) return;
    setSelectedOrder(order);
    setIsWhatsAppModalOpen(true);
  };

  const handleGridStatusClick = (status: string) => {
    setSelectedGridStatus(status);
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

  const refreshOrders = () => {
    // Orders will refresh automatically due to real-time listener
    toast({
      title: "Success",
      description: "Orders refreshed successfully",
    });
  };

  // Empty state
  if (!loading && safeOrders.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
            <p className="text-gray-600">Track custom orders and customer requests</p>
          </div>
          <Button 
            className="bg-gradient-to-r from-blue-600 to-purple-600"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </div>
        <Card className="text-center py-12">
          <CardContent>
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-600 mb-6">Start by creating your first customer order</p>
            <Button 
              className="bg-gradient-to-r from-blue-600 to-purple-600"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Order
            </Button>
          </CardContent>
        </Card>
        
        <CreateOrderModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={refreshOrders}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-600">Track custom orders and customer requests</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* View Toggle */}
          <div className="flex rounded-lg border bg-white">
            <Button
              variant={view === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setView('list');
                setSelectedGridStatus(null);
              }}
              className="rounded-r-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setView('grid');
                setSelectedGridStatus(null);
              }}
              className="rounded-none border-x"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setView('calendar');
                setSelectedGridStatus(null);
              }}
              className="rounded-l-none"
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </div>
          <Button 
            className="bg-gradient-to-r from-blue-600 to-purple-600"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time orders</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <div className="text-green-600">₹</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.revenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From delivered orders</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Currently working</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      {(view === 'list' || (view === 'grid' && selectedGridStatus)) && (
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
        </div>
      )}

      {/* View Content */}
      {view === 'calendar' && (
        <OrderCalendar 
          orders={filteredOrders}
          onDateSelect={(date, dayOrders) => {
            console.log('Selected date:', date, 'Orders:', dayOrders);
          }}
        />
      )}

      {view === 'grid' && !selectedGridStatus && (
        <OrderGridView 
          orders={filteredOrders}
          onOrderClick={(order) => handleGridStatusClick(order.status)}
          onWhatsAppClick={handleSendWhatsApp}
        />
      )}

      {view === 'grid' && selectedGridStatus && (
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => setSelectedGridStatus(null)}
              size="sm"
            >
              ← Back to Overview
            </Button>
            <h3 className="text-lg font-semibold capitalize">{selectedGridStatus} Orders</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders
              .filter(order => selectedGridStatus === 'all' || order.status === selectedGridStatus)
              .map(order => (
                <Card key={order.id} className="hover:shadow-lg transition-all cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <div className="font-medium">#{order.orderNumber.slice(-3)}</div>
                      <Badge className={`${getStatusColor(order.status)} border`} variant="outline">
                        {order.status}
                      </Badge>
                    </div>
                    <div className="text-lg font-semibold">{order.customerName}</div>
                    <div className="text-sm text-gray-500">{order.orderDate}</div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-600 mb-2">{order.itemType}</div>
                    {order.remainingAmount > 0 && (
                      <div className="text-red-600 font-medium mb-2">
                        Balance: ₹{order.remainingAmount.toLocaleString()}
                      </div>
                    )}
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewOrder(order)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendWhatsApp(order)}
                        className="text-green-600"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}

      {view === 'list' && (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Orders ({filteredOrders.length})</CardTitle>
            <CardDescription>Manage customer orders and track progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">#{order.orderNumber.slice(-3)}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.customerName}</div>
                            <div className="text-sm text-gray-500">{order.customerEmail}</div>
                            <div className="text-sm text-gray-500">{order.customerPhone}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" onClick={() => window.open(`tel:${order.customerPhone}`)}>
                              <Phone className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleSendWhatsApp(order)} className="text-green-600">
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.itemType}</div>
                            <div className="text-sm text-gray-500">Qty: {order.quantity}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">₹{order.totalAmount.toLocaleString()}</div>
                            {order.remainingAmount > 0 && (
                              <div className="text-sm text-red-600">Balance: ₹{order.remainingAmount.toLocaleString()}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(order.status)} border`} variant="outline">
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(order.status)}
                              <span className="capitalize">{order.status}</span>
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell>{order.deliveryDate}</TableCell>
                        <TableCell>{order.orderDate}</TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button size="sm" variant="outline" onClick={() => handleViewOrder(order)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                        <p className="text-gray-600">Try adjusting your search or filters</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      {selectedOrder && (
        <>
          <OrderDetailsModal
            order={selectedOrder}
            isOpen={isDetailsModalOpen}
            onClose={() => {
              setIsDetailsModalOpen(false);
              setSelectedOrder(null);
            }}
            onWhatsAppClick={() => handleSendWhatsApp(selectedOrder)}
            onRefresh={refreshOrders}
          />
          <WhatsAppMessageModal
            order={selectedOrder}
            isOpen={isWhatsAppModalOpen}
            onClose={() => {
              setIsWhatsAppModalOpen(false);
              setSelectedOrder(null);
            }}
          />
        </>
      )}

      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={refreshOrders}
      />
    </div>
  );
};

export default Orders;
