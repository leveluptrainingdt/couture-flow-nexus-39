
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Edit, MessageSquare, Receipt, Phone, User } from 'lucide-react';

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

interface OrdersListViewProps {
  filteredOrders: Order[];
  handleViewOrder: (order: Order) => void;
  handleEditOrder: (order: Order) => void;
  handleSendWhatsApp: (order: Order) => void;
  handleBillOrder?: (order: Order) => void;
  onRefresh: () => void;
}

const OrdersListView: React.FC<OrdersListViewProps> = ({
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
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Made For</TableHead>
            <TableHead>Item Type</TableHead>
            <TableHead>Order Date</TableHead>
            <TableHead>Delivery Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Balance</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredOrders.map(order => {
            const madeForItems = getMadeForItems(order);
            return (
              <TableRow key={order.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">
                  #{order.orderNumber.slice(-4)}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{order.customerName}</div>
                    <div className="text-sm text-gray-500">{order.customerPhone}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {madeForItems.map((person, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className={person !== order.customerName ? "text-purple-600" : ""}
                      >
                        <User className="h-3 w-3 mr-1" />
                        {person}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div>{order.itemType}</div>
                    {order.quantity > 1 && (
                      <Badge variant="outline" className="text-xs">
                        Qty: {order.quantity}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{order.orderDate}</TableCell>
                <TableCell>{order.deliveryDate}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(order.status)} variant="outline">
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">
                  ₹{order.totalAmount?.toLocaleString() || 0}
                </TableCell>
                <TableCell>
                  {order.remainingAmount > 0 ? (
                    <span className="text-red-600 font-medium">
                      ₹{order.remainingAmount.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-green-600">Paid</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-1">
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
                      onClick={() => handleEditOrder(order)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSendWhatsApp(order)}
                      className="text-green-600 hover:bg-green-50"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    {handleBillOrder && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBillOrder(order)}
                        className="text-purple-600 hover:bg-purple-50"
                      >
                        <Receipt className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="md:hidden"
                      onClick={() => window.open(`tel:${order.customerPhone}`)}
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default OrdersListView;
