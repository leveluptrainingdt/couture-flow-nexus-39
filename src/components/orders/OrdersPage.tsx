import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Grid, List, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import OrderDetailsModal from '@/components/OrderDetailsModal';
import WhatsAppMessageModal from '@/components/WhatsAppMessageModal';
import CreateOrderModal from '@/components/CreateOrderModal';
import LoadingSpinner from '@/components/LoadingSpinner';
import OrderCalendar from '@/components/OrderCalendar';
import OrdersStats from '@/components/orders/OrdersStats';
import OrdersFilters from '@/components/orders/OrdersFilters';
import OrdersGridView from '@/components/orders/OrdersGridView';
import OrdersListView from '@/components/orders/OrdersListView';

interface OrderItem {
  madeFor: string;
  category: string;
  description: string;
  quantity: number;
  status: string;
  orderDate: string;
  deliveryDate: string;
  assignedStaff: string[];
  requiredMaterials: any[];
  designImages: string[];
  notes: string;
  sizes?: Record<string, string>;
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
  const [dateFilter, setDateFilter] = useState<{ from?: Date; to?: Date; single?: Date }>({});
  
  const [view, setView] = useState<'grid' | 'list' | 'calendar'>(() => {
    try {
      const saved = localStorage.getItem('orders-view');
      return (saved as 'grid' | 'list' | 'calendar') || 'grid';
    } catch (e) {
      return 'grid';
    }
  });
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('orders-view', view);
    } catch (e) {
      console.warn('Error saving to localStorage:', e);
    }
  }, [view]);

  useEffect(() => {
    if (!userData) {
      setLoading(false);
      setError('User not authenticated');
      return;
    }
    
    try {
      const unsubscribe = onSnapshot(
        query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
        (snapshot) => {
          try {
            const ordersData = snapshot.docs.map(doc => {
              const data = doc.data();
              
              return {
                id: doc.id,
                orderNumber: data.orderId || data.orderNumber || `ORD-${doc.id.slice(-6)}`,
                customerName: data.customerName || 'Unknown Customer',
                customerPhone: data.customerPhone || '',
                customerEmail: data.customerEmail || '',
                items: data.items || [],
                itemType: data.dressType || data.itemType || 'Unknown Item',
                orderDate: data.orderDate || data.createdAt?.toDate?.()?.toLocaleDateString() || new Date().toLocaleDateString(),
                deliveryDate: data.deliveryDate || '',
                quantity: data.items?.length || data.quantity || 1,
                status: data.status || 'received',
                measurements: data.measurements || {},
                notes: data.notes || '',
                designImages: data.designImages || [],
                assignedStaff: data.assignedStaff || [],
                requiredMaterials: data.requiredMaterials || []
              } as Order;
            }).filter(order => order && order.customerName && order.customerName !== 'Unknown Customer');
            
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
    } catch (error) {
      console.error('Error setting up orders listener:', error);
      setError('Failed to initialize orders listener');
      setLoading(false);
    }
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

  const safeOrders = Array.isArray(orders) ? orders.filter(order => order && order.customerName) : [];
  
  // Enhanced date filtering with single date and range support
  const dateFilteredOrders = safeOrders.filter(order => {
    if (!order) return false;
    if (!dateFilter.from && !dateFilter.to && !dateFilter.single) return true;
    
    const orderDate = new Date(order.orderDate);
    const deliveryDate = new Date(order.deliveryDate);
    
    if (dateFilter.single) {
      const targetDate = dateFilter.single;
      const targetDateStr = targetDate.toDateString();
      return orderDate.toDateString() === targetDateStr || deliveryDate.toDateString() === targetDateStr;
    }
    
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
    if (!order || !order.customerName) return false;
    
    const matchesSearch = (
      (order.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.itemType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.items || []).some(item => 
        item && (
          (item.madeFor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.category || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    );
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate enhanced stats
  const today = new Date();
  const fiveDaysFromNow = new Date(today.getTime() + (5 * 24 * 60 * 60 * 1000));
  
  const stats = {
    total: safeOrders.length,
    pending: safeOrders.filter(order => order && order.status === 'received').length,
    inProgress: safeOrders.filter(order => order && order.status === 'in-progress').length,
    ready: safeOrders.filter(order => order && order.status === 'ready').length,
    deliveryDeadline: safeOrders.filter(order => {
      if (!order || !order.deliveryDate) return false;
      const deliveryDate = new Date(order.deliveryDate);
      return deliveryDate <= fiveDaysFromNow && deliveryDate >= today;
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

  const handleRefresh = () => {
    toast({
      title: "Refreshed",
      description: "Orders data is up to date",
    });
  };

  const renderContent = () => {
    try {
      if (view === 'calendar') {
        // Transform orders to match OrderCalendar expected format
        const calendarOrders = filteredOrders.map(order => ({
          ...order,
          totalAmount: 0,
          advanceAmount: 0,
          remainingAmount: 0
        }));
        
        return (
          <OrderCalendar 
            orders={calendarOrders}
            onDateSelect={(date, dayOrders) => {
              console.log('Selected date:', date, 'Orders:', dayOrders);
            }}
          />
        );
      }

      if (view === 'grid') {
        return (
          <OrdersGridView
            filteredOrders={filteredOrders}
            handleViewOrder={handleViewOrder}
            handleEditOrder={handleEditOrder}
            handleSendWhatsApp={handleSendWhatsApp}
            onRefresh={handleRefresh}
          />
        );
      }

      return (
        <OrdersListView
          filteredOrders={filteredOrders}
          handleViewOrder={handleViewOrder}
          handleEditOrder={handleEditOrder}
          handleSendWhatsApp={handleSendWhatsApp}
          onRefresh={handleRefresh}
        />
      );
    } catch (error) {
      console.error('Error rendering content:', error);
      return (
        <div className="text-center p-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error rendering content</h3>
          <p className="text-gray-600">Please try refreshing the page</p>
        </div>
      );
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header with view toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600">Manage customer orders and track progress</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* View Toggle */}
          <div className="flex rounded-lg border bg-white">
            <Button
              variant={view === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('list')}
              className="rounded-r-none"
              title="List View"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('grid')}
              className="rounded-none"
              title="Grid View"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('calendar')}
              className="rounded-l-none"
              title="Calendar View"
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

      {/* Enhanced Stats */}
      <OrdersStats stats={stats} />

      {/* Enhanced Filters */}
      <OrdersFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
      />

      {/* Content */}
      {renderContent()}

      {/* Modals */}
      {selectedOrder && (
        <OrderDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
          onWhatsAppClick={handleSendWhatsApp}
          onRefresh={handleRefresh}
        />
      )}

      {selectedOrder && (
        <WhatsAppMessageModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => {
            setIsWhatsAppModalOpen(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
        />
      )}

      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingOrder(null);
        }}
        onSuccess={() => {
          handleRefresh();
        }}
        editingOrder={editingOrder}
      />
    </div>
  );
};

export default OrdersPage;
