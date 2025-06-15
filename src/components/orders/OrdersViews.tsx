
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, MessageCircle } from 'lucide-react';
import OrderCalendar from '@/components/OrderCalendar';
import OrderGridView from '@/components/OrderGridView';
import OrdersListView from './OrdersListView';

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
  filteredOrders: Order[];
  selectedGridStatus: string | null;
  setSelectedGridStatus: (status: string | null) => void;
  handleViewOrder: (order: Order) => void;
  handleSendWhatsApp: (order: Order) => void;
  handleGridStatusClick: (status: string) => void;
}

const OrdersViews: React.FC<OrdersViewsProps> = ({
  view,
  filteredOrders,
  selectedGridStatus,
  setSelectedGridStatus,
  handleViewOrder,
  handleSendWhatsApp,
  handleGridStatusClick
}) => {
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

  if (view === 'grid' && !selectedGridStatus) {
    return (
      <OrderGridView 
        orders={filteredOrders}
        onOrderClick={(order) => handleGridStatusClick(order.status)}
        onWhatsAppClick={handleSendWhatsApp}
      />
    );
  }

  if (view === 'grid' && selectedGridStatus) {
    return (
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
    );
  }

  return (
    <OrdersListView
      filteredOrders={filteredOrders}
      handleViewOrder={handleViewOrder}
      handleSendWhatsApp={handleSendWhatsApp}
    />
  );
};

export default OrdersViews;
