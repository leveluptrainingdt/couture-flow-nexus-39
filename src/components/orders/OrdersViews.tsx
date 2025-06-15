
import React from 'react';
import OrderCalendar from '@/components/OrderCalendar';
import OrdersListView from './OrdersListView';
import OrdersGridView from './OrdersGridView';

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
}

interface OrdersViewsProps {
  view: 'list' | 'grid' | 'calendar';
  adaptiveView: 'list' | 'grid';
  filteredOrders: Order[];
  handleViewOrder: (order: Order) => void;
  handleEditOrder: (order: Order) => void;
  handleSendWhatsApp: (order: Order) => void;
  onAdaptiveViewChange: (isOverflowing: boolean) => void;
  onRefresh: () => void;
}

const OrdersViews: React.FC<OrdersViewsProps> = ({
  view,
  adaptiveView,
  filteredOrders,
  handleViewOrder,
  handleEditOrder,
  handleSendWhatsApp,
  onAdaptiveViewChange,
  onRefresh
}) => {
  if (view === 'calendar') {
    return (
      <OrderCalendar 
        orders={filteredOrders}
        onDateSelect={(date, dayOrders) => {
          console.log('Selected date:', date, 'Orders:', dayOrders);
        }}
      />
    );
  }

  // Use adaptive view or manual view preference
  const effectiveView = view === 'list' ? adaptiveView : view;

  if (effectiveView === 'grid') {
    return (
      <OrdersGridView
        filteredOrders={filteredOrders}
        handleViewOrder={handleViewOrder}
        handleEditOrder={handleEditOrder}
        handleSendWhatsApp={handleSendWhatsApp}
        onRefresh={onRefresh}
      />
    );
  }

  return (
    <OrdersListView
      filteredOrders={filteredOrders}
      handleViewOrder={handleViewOrder}
      handleEditOrder={handleEditOrder}
      handleSendWhatsApp={handleSendWhatsApp}
      onAdaptiveViewChange={onAdaptiveViewChange}
      onRefresh={onRefresh}
    />
  );
};

export default OrdersViews;
