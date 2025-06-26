
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Package, AlertCircle, Grid, List, Calendar as CalendarIcon, ArrowLeft, Clock, Truck } from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import OrderDetailsModal from '@/components/OrderDetailsModal';
import WhatsAppMessageModal from '@/components/WhatsAppMessageModal';
import CreateOrderModal from '@/components/CreateOrderModal';
import LoadingSpinner from '@/components/LoadingSpinner';
import OrdersStats from '@/components/orders/OrdersStats';
import OrdersFilters from '@/components/orders/OrdersFilters';
import OrdersGridView from '@/components/orders/OrdersGridView';
import OrdersListView from '@/components/orders/OrdersListView';
import OrdersCalendarView from '@/components/orders/OrdersCalendarView';

interface OrderItem {
  madeFor: string;
  category: string;
  description: string;
  price: number;
  quantity: number;
  status: string;
  orderDate: string;
  deliveryDate: string;
  assignedStaff: string[];
  requiredMaterials: any[];
  designImages: string[];
  notes: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  items?: OrderItem[];
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

const OrdersPage = () => {
  const { userData } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<{ from?: Date; to?: Date }>({});
  const [view, setView] = useState<'grid' | 'list' | 'calendar'>('grid');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarOrders, setCalendarOrders] = useState<Order[]>([]);
  const [calendarViewMode, setCalendarViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (!userData) {
      setLoading(false);
      setError('User not authenticated');
      return;
    }
    
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
              items: data.items || [],
              itemType: data.dressType || data.itemType || '',
              orderDate: data.orderDate || data.createdAt?.toDate?.()?.toLocaleDateString() || new Date().toLocaleDateString(),
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

  if (loading) {
    return <LoadingSpinner type="page" />;
  }

  const safeOrders = Array.isArray(orders) ? orders : [];
  
  // Date filtering logic
  const dateFilteredOrders = safeOrders.filter(order => {
    if (!dateFilter.from && !dateFilter.to) return true;
    
    const orderDate = new Date(order.orderDate);
    const deliveryDate = new Date(order.deliveryDate);
    
    if (dateFilter.from && dateFilter.to) {
      return (orderDate >= dateFilter.from && orderDate <= dateFilter.to) ||
             (deliveryDate >= dateFilter.from && deliveryDate <= dateFilter.to);
    } else if (dateFilter.from) {
      return orderDate >= dateFilter.from || deliveryDate >= dateFilter.from;
    } else if (dateFilter.to) {
      return orderDate <= dateFilter.to || deliveryDate <= dateFilter.to;
    }
    
    return true;
  });
  
  const filteredOrders = dateFilteredOrders.filter(order => {
    if (!order) return false;
    
    const matchesSearch = (
      (order.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.itemType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.items || []).some(item => 
        (item.madeFor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.category || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Enhanced stats with new categories
  const today = new Date();
  const fiveDaysFromNow = new Date();
  fiveDaysFromNow.setDate(today.getDate() + 5);

  const stats = {
    total: safeOrders.length,
    revenue: safeOrders.filter(o => o?.status === 'delivered').reduce((sum, o) => sum + (o?.totalAmount || 0), 0),
    pending: safeOrders.filter(o => o?.status === 'received').length,
    inProgress: safeOrders.filter(o => o?.status === 'in-progress').length,
    ready: safeOrders.filter(o => o?.status === 'ready').length,
    deliveryDeadline: safeOrders.filter(o => {
      if (!o?.deliveryDate) return false;
      const deliveryDate = new Date(o.deliveryDate);
      return deliveryDate >= today && deliveryDate <= fiveDaysFromNow && o.status !== 'delivered';
    }).length
  };

  const handleViewOrder = (order: Order) => {
    if (!order) return;
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const handleEditOrder = (order: Order) => {
    if (!order) return;
    setEditingOrder(order);
    setIsCreateModalOpen(true);
  };

  const handleSendWhatsApp = (order: Order) => {
    if (!order) return;
    setSelectedOrder(order);
    setIsWhatsAppModalOpen(true);
  };

  const handleDateSelect = (date: Date, dayOrders: Order[]) => {
    setSelectedDate(date);
    setCalendarOrders(dayOrders);
  };

  const refreshOrders = () => {
    toast({
      title: "Success",
      description: "Orders refreshed successfully",
    });
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setEditingOrder(null);
  };

  if (!loading && safeOrders.length === 0) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Orders</h1>
            <p className="text-gray-600">Manage customer orders and track progress</p>
          </div>
          <Button 
            className="bg-gradient-to-r from-blue-600 to-purple-600 w-full sm:w-auto"
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
          onClose={closeCreateModal}
          onSuccess={refreshOrders}
          editingOrder={editingOrder}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-4">
          {selectedDate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(null)}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Orders</h1>
            <p className="text-gray-600">
              {selectedDate 
                ? `Orders for ${selectedDate.toLocaleDateString()}` 
                : 'Manage customer orders and track progress'
              }
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 w-full lg:w-auto">
          {!selectedDate && (
            <>
              {/* View Toggle */}
              <div className="flex rounded-lg border bg-white">
                <Button
                  variant={view === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('grid')}
                  className="rounded-r-none flex-1 sm:flex-none"
                  title="Grid View"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={view === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('list')}
                  className="rounded-none flex-1 sm:flex-none"
                  title="List View"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={view === 'calendar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('calendar')}
                  className="rounded-l-none flex-1 sm:flex-none"
                  title="Calendar View"
                >
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
          
          {selectedDate && (
            <div className="flex rounded-lg border bg-white">
              <Button
                variant={calendarViewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCalendarViewMode('grid')}
                className="rounded-r-none flex-1 sm:flex-none"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={calendarViewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCalendarViewMode('list')}
                className="rounded-l-none flex-1 sm:flex-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <Button 
            className="bg-gradient-to-r from-blue-600 to-purple-600 w-full sm:w-auto"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      {!selectedDate && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => setStatusFilter('all')}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => setStatusFilter('received')}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => setStatusFilter('in-progress')}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => setStatusFilter('ready')}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Ready Orders</p>
                  <p className="text-2xl font-bold text-green-600">{stats.ready}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all cursor-pointer bg-red-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Truck className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm text-red-600">Delivery Deadline</p>
                  <p className="text-2xl font-bold text-red-600">{stats.deliveryDeadline}</p>
                  <p className="text-xs text-red-500">Due in 5 days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Revenue</p>
                  <p className="text-xl font-bold text-purple-600">₹{stats.revenue.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!selectedDate && view !== 'calendar' && (
        <OrdersFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
        />
      )}

      {/* Main Content */}
      {selectedDate ? (
        // Calendar Date View
        <div>
          {calendarViewMode === 'grid' ? (
            <OrdersGridView
              filteredOrders={calendarOrders}
              handleViewOrder={handleViewOrder}
              handleEditOrder={handleEditOrder}
              handleSendWhatsApp={handleSendWhatsApp}
              onRefresh={refreshOrders}
            />
          ) : (
            <OrdersListView
              filteredOrders={calendarOrders}
              handleViewOrder={handleViewOrder}
              handleEditOrder={handleEditOrder}
              handleSendWhatsApp={handleSendWhatsApp}
              onRefresh={refreshOrders}
            />
          )}
        </div>
      ) : view === 'calendar' ? (
        <OrdersCalendarView 
          orders={filteredOrders}
          onDateSelect={handleDateSelect}
        />
      ) : view === 'grid' ? (
        <OrdersGridView
          filteredOrders={filteredOrders}
          handleViewOrder={handleViewOrder}
          handleEditOrder={handleEditOrder}
          handleSendWhatsApp={handleSendWhatsApp}
          onRefresh={refreshOrders}
        />
      ) : (
        <OrdersListView
          filteredOrders={filteredOrders}
          handleViewOrder={handleViewOrder}
          handleEditOrder={handleEditOrder}
          handleSendWhatsApp={handleSendWhatsApp}
          onRefresh={refreshOrders}
        />
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
        onClose={closeCreateModal}
        onSuccess={refreshOrders}
        editingOrder={editingOrder}
      />
    </div>
  );
};

export default OrdersPage;
