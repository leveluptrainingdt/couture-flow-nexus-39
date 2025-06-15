
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Package, AlertCircle } from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import OrderDetailsModal from '@/components/OrderDetailsModal';
import WhatsAppMessageModal from '@/components/WhatsAppMessageModal';
import CreateOrderModal from '@/components/CreateOrderModal';
import LoadingSpinner from '@/components/LoadingSpinner';
import OrdersHeader from '@/components/orders/OrdersHeader';
import OrdersStats from '@/components/orders/OrdersStats';
import OrdersFilters from '@/components/orders/OrdersFilters';
import OrdersViews from '@/components/orders/OrdersViews';

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
        <OrdersHeader
          view={view}
          setView={setView}
          setSelectedGridStatus={setSelectedGridStatus}
          setIsCreateModalOpen={setIsCreateModalOpen}
        />
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
      <OrdersHeader
        view={view}
        setView={setView}
        setSelectedGridStatus={setSelectedGridStatus}
        setIsCreateModalOpen={setIsCreateModalOpen}
      />

      {/* Stats Cards */}
      <OrdersStats stats={stats} />

      {/* Filters and Search */}
      {(view === 'list' || (view === 'grid' && selectedGridStatus)) && (
        <OrdersFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />
      )}

      {/* View Content */}
      <OrdersViews
        view={view}
        filteredOrders={filteredOrders}
        selectedGridStatus={selectedGridStatus}
        setSelectedGridStatus={setSelectedGridStatus}
        handleViewOrder={handleViewOrder}
        handleSendWhatsApp={handleSendWhatsApp}
        handleGridStatusClick={handleGridStatusClick}
      />

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
