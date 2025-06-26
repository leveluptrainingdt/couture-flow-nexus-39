import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Package, AlertCircle, Grid, List, Calendar as CalendarIcon, ArrowLeft, Clock, Truck } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
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
  totalAmount: number;
  advanceAmount: number;
  balance: number;
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
  
  // Persistent view preferences with localStorage
  const [view, setView] = useState<'grid' | 'list' | 'calendar'>(() => {
    const saved = localStorage.getItem('orders-view');
    return (saved as 'grid' | 'list' | 'calendar') || 'grid';
  });
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarOrders, setCalendarOrders] = useState<Order[]>([]);
  const [calendarViewMode, setCalendarViewMode] = useState<'grid' | 'list'>('grid');

  // Save view preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('orders-view', view);
  }, [view]);

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

  // New Bill functionality
  const handleBillOrder = async (order: Order) => {
    if (!order) return;
    
    try {
      // Check if bill already exists for this order
      const billsSnapshot = await getDocs(collection(db, 'bills'));
      const existingBill = billsSnapshot.docs.find(doc => 
        doc.data().orderId === order.id || doc.data().orderNumber === order.orderNumber
      );

      if (existingBill) {
        // Navigate to existing bill
        window.location.href = `/billing/${existingBill.id}`;
      } else {
        // Create new bill
        const billData = {
          billId: `BILL${Date.now().toString().slice(-6)}`,
          customerId: order.id,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail || '',
          orderId: order.id,
          orderNumber: order.orderNumber,
          items: order.items || [{
            description: order.itemType,
            quantity: order.quantity,
            rate: order.totalAmount / order.quantity,
            amount: order.totalAmount
          }],
          totalAmount: order.totalAmount,
          paidAmount: order.advanceAmount,
          balance: order.remainingAmount,
          date: new Date(),
          createdAt: serverTimestamp()
        };
        
        const docRef = await addDoc(collection(db, 'bills'), billData);
        
        toast({
          title: "Success",
          description: "Bill created successfully",
        });
        
        // Navigate to new bill
        window.location.href = `/billing/${docRef.id}`;
      }
    } catch (error) {
      console.error('Error creating bill:', error);
      toast({
        title: "Error",
        description: "Failed to create bill",
        variant: "destructive",
      });
    }
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setIsCreateModalOpen(true);
  };

  const handleSendWhatsApp = (order: Order) => {
    setSelectedOrder(order);
    setIsWhatsAppModalOpen(true);
  };

  const handleRefresh = () => {
    // Orders are already real-time, this is just for UI feedback
    toast({
      title: "Refreshed",
      description: "Orders data is up to date",
    });
  };

  const renderContent = () => {
    if (view === 'calendar') {
      return (
        <OrdersCalendarView
          orders={filteredOrders}
          onDateSelect={(date, dayOrders) => {
            setSelectedDate(date);
            setCalendarOrders(dayOrders);
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
          handleBillOrder={handleBillOrder}
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
        handleBillOrder={handleBillOrder}
        onRefresh={handleRefresh}
      />
    );
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

      {/* Stats */}
      <OrdersStats orders={safeOrders} />

      {/* Filters */}
      <OrdersFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        totalOrders={safeOrders.length}
        filteredCount={filteredOrders.length}
      />

      {/* Content */}
      {renderContent()}

      {/* Modals */}
      <OrderDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
      />

      <WhatsAppMessageModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => {
          setIsWhatsAppModalOpen(false);
          setSelectedOrder(null);
        }}
        customerName={selectedOrder?.customerName || ''}
        customerPhone={selectedOrder?.customerPhone || ''}
        orderNumber={selectedOrder?.orderNumber || ''}
        deliveryDate={selectedOrder?.deliveryDate || ''}
      />

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
