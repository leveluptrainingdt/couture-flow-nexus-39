
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Edit, MessageSquare, Receipt, Phone, User, Calendar, Package } from 'lucide-react';

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
  remainingAmount: number;
  status: string;
  quantity: number;
  items?: any[];
}

interface OrdersGridViewProps {
  filteredOrders: Order[];
  handleViewOrder: (order: Order) => void;
  handleEditOrder: (order: Order) => void;
  handleSendWhatsApp: (order: Order) => void;
  handleBillOrder?: (order: Order) => void;
  onRefresh: () => void;
}

const OrdersGridView: React.FC<OrdersGridViewProps> = ({
  filteredOrders,
  handleViewOrder,
  handleEditOrder,
  handleSendWhatsApp,
  handleBillOrder,
  onRefresh
}) => {
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

  const getMadeForItems = (order: Order) => {
    if (!order.items || order.items.length === 0) return [order.customerName];
    return [...new Set(order.items.map(item => item.madeFor || order.customerName))];
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredOrders.map(order => {
        const madeForItems = getMadeForItems(order);
        return (
          <Card key={order.id} className="hover:shadow-lg transition-all duration-200 border border-gray-200 rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-lg">#{order.orderNumber.slice(-4)}</span>
                    <Badge className={getStatusColor(order.status)} variant="outline">
                      {order.status}
                    </Badge>
                  </div>
                  <div className="text-xl font-semibold text-gray-900 truncate">{order.customerName}</div>
                </div>
                <div className="text-right text-sm text-gray-500 ml-2">
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span className="text-xs">{order.orderDate}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Order Details */}
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <Package className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{order.itemType}</span>
                  {order.quantity > 1 && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      Qty: {order.quantity}
                    </Badge>
                  )}
                </div>
                
                {/* Made For (if different people) */}
                {madeForItems.length > 1 || (madeForItems[0] !== order.customerName) && (
                  <div className="flex items-start text-sm">
                    <User className="h-4 w-4 mr-2 mt-0.5 text-purple-600 flex-shrink-0" />
                    <div className="flex flex-wrap gap-1 min-w-0 flex-1">
                      {madeForItems.map((person, index) => (
                        <Badge key={index} variant="outline" className="text-purple-600 text-xs truncate max-w-full">
                          {person}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Delivery:</span>
                  <span className="font-medium text-xs">{order.deliveryDate}</span>
                </div>
              </div>

              {/* Payment Information */}
              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Amount:</span>
                  <span className="font-bold">₹{order.totalAmount?.toLocaleString() || 0}</span>
                </div>
                
                {order.remainingAmount > 0 && (
                  <div className="flex justify-between items-center text-red-600">
                    <span className="text-sm font-medium">Balance Due:</span>
                    <span className="font-bold">₹{order.remainingAmount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons - Responsive Grid */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                {/* First Row */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewOrder(order)}
                  className="text-xs"
                  title="View Order"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEditOrder(order)}
                  className="text-xs"
                  title="Edit Order"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSendWhatsApp(order)}
                  className="text-green-600 hover:bg-green-50 text-xs"
                  title="Send WhatsApp"
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  WhatsApp
                </Button>
              </div>

              {/* Second Row */}
              <div className="grid grid-cols-2 gap-2">
                {handleBillOrder && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBillOrder(order)}
                    className="text-purple-600 hover:bg-purple-50 text-xs"
                    title="Generate Bill"
                  >
                    <Receipt className="h-3 w-3 mr-1" />
                    Bill
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="md:hidden text-xs"
                  onClick={() => window.open(`tel:${order.customerPhone}`)}
                  title="Call Customer"
                >
                  <Phone className="h-3 w-3 mr-1" />
                  Call
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default OrdersGridView;
