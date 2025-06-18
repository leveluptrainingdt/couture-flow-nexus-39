
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Edit, Trash2, Phone, MessageCircle, Clock, AlertCircle, CheckCircle, Package, XCircle } from 'lucide-react';
import { updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';

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

interface OrdersGridViewProps {
  filteredOrders: Order[];
  handleViewOrder: (order: Order) => void;
  handleSendWhatsApp: (order: Order) => void;
  onRefresh: () => void;
}

const OrdersGridView: React.FC<OrdersGridViewProps> = ({
  filteredOrders,
  handleViewOrder,
  handleSendWhatsApp,
  onRefresh
}) => {
  const [updatingOrderId, setUpdatingOrderId] = useState<string>('');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'received': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'in-progress': return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'ready': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'delivered': return <Package className="h-4 w-4 text-gray-600" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'in-progress': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'ready': return 'text-green-600 bg-green-50 border-green-200';
      case 'delivered': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast({
        title: "Success",
        description: "Order status updated successfully",
      });
      onRefresh();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setUpdatingOrderId('');
    }
  };

  const deleteOrder = async (order: Order) => {
    if (window.confirm(`Are you sure you want to delete order #${order.orderNumber.slice(-3)}?`)) {
      try {
        await deleteDoc(doc(db, 'orders', order.id));
        toast({
          title: "Success",
          description: "Order deleted successfully",
        });
        onRefresh();
      } catch (error) {
        console.error('Error deleting order:', error);
        toast({
          title: "Error",
          description: "Failed to delete order",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filteredOrders.map(order => (
        <Card key={order.id} className="hover:shadow-lg transition-all">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div className="font-medium">#{order.orderNumber.slice(-3)}</div>
              <Badge className={`${getStatusColor(order.status)} border`} variant="outline">
                <div className="flex items-center space-x-1">
                  {getStatusIcon(order.status)}
                  <span className="capitalize">{order.status}</span>
                </div>
              </Badge>
            </div>
            <div className="text-lg font-semibold">{order.customerName}</div>
            <div className="text-sm text-gray-500">
              <div>{order.customerEmail}</div>
              <div>{order.customerPhone}</div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="font-medium">{order.itemType}</div>
              <div className="text-sm text-gray-500">Qty: {order.quantity}</div>
            </div>
            
            <div>
              <div className="font-medium">₹{order.totalAmount.toLocaleString()}</div>
              {order.remainingAmount > 0 && (
                <div className="text-sm text-red-600">Balance: ₹{order.remainingAmount.toLocaleString()}</div>
              )}
            </div>

            <div className="text-sm text-gray-600">
              <div>Order: {order.orderDate}</div>
              <div>Delivery: {order.deliveryDate}</div>
            </div>

            <div className="space-y-2">
              <Select
                value={order.status}
                onValueChange={(value) => updateOrderStatus(order.id, value)}
                disabled={updatingOrderId === order.id}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewOrder(order)}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => deleteOrder(order)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`tel:${order.customerPhone}`)}
                  className="flex-1"
                >
                  <Phone className="h-4 w-4 mr-1" />
                  Call
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSendWhatsApp(order)}
                  className="text-green-600 flex-1"
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  WhatsApp
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default OrdersGridView;
