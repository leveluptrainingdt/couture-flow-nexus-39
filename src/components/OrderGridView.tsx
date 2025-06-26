
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Phone, MessageSquare, Eye } from 'lucide-react';
import { Order } from '@/components/orders/OrdersPage';

interface OrderGridViewProps {
  orders: Order[];
  onOrderClick: (order: Order) => void;
  onWhatsAppClick: (order: Order) => void;
  selectedStatus?: string;
}

const OrderGridView: React.FC<OrderGridViewProps> = ({
  orders,
  onOrderClick,
  onWhatsAppClick,
  selectedStatus
}) => {
  const statusCounts = {
    received: orders.filter(o => o.status === 'received').length,
    'in-progress': orders.filter(o => o.status === 'in-progress').length,
    ready: orders.filter(o => o.status === 'ready').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    all: orders.length
  };

  const statusCards = [
    { status: 'received', label: 'Order Taken', color: 'bg-blue-100 text-blue-700 border-blue-200', count: statusCounts.received },
    { status: 'in-progress', label: 'In Progress', color: 'bg-orange-100 text-orange-700 border-orange-200', count: statusCounts['in-progress'] },
    { status: 'ready', label: 'Ready', color: 'bg-green-100 text-green-700 border-green-200', count: statusCounts.ready },
    { status: 'delivered', label: 'Delivered', color: 'bg-purple-100 text-purple-700 border-purple-200', count: statusCounts.delivered },
    { status: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-200', count: statusCounts.cancelled },
    { status: 'all', label: 'All Orders', color: 'bg-gray-100 text-gray-700 border-gray-200', count: statusCounts.all }
  ];

  const filteredOrders = selectedStatus && selectedStatus !== 'all' 
    ? orders.filter(order => order.status === selectedStatus)
    : orders;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'in-progress': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'ready': return 'bg-green-100 text-green-700 border-green-200';
      case 'delivered': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (!selectedStatus) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statusCards.map(card => (
          <Card 
            key={card.status} 
            className={`cursor-pointer hover:shadow-lg transition-all ${card.color} border-2`}
            onClick={() => onOrderClick({ status: card.status } as any)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.count}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredOrders.map(order => (
        <Card key={order.id} className="hover:shadow-lg transition-all">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div className="font-medium">#{order.orderNumber.slice(-3)}</div>
              <Badge className={getStatusColor(order.status)} variant="outline">
                {order.status}
              </Badge>
            </div>
            <div className="text-lg font-semibold">{order.customerName}</div>
            <div className="text-sm text-gray-500">{order.orderDate}</div>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOrderClick(order)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onWhatsAppClick(order)}
                className="text-green-600"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="md:hidden"
                onClick={() => window.open(`tel:${order.customerPhone}`)}
              >
                <Phone className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default OrderGridView;
