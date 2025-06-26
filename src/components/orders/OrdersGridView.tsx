
import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Edit, Trash2, Phone, MessageCircle, Clock, AlertCircle, CheckCircle, Package, XCircle, User, Receipt, Calendar } from 'lucide-react';
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
  items?: Array<{
    madeFor: string;
    category: string;
    price: number;
    quantity: number;
  }>;
}

interface OrdersGridViewProps {
  filteredOrders: Order[];
  handleViewOrder: (order: Order) => void;
  handleEditOrder: (order: Order) => void;
  handleSendWhatsApp: (order: Order) => void;
  onRefresh: () => void;
}

const OrdersGridView: React.FC<OrdersGridViewProps> = ({
  filteredOrders,
  handleViewOrder,
  handleEditOrder,
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

  const getDeliveryStatus = (deliveryDate: string, status: string) => {
    if (status === 'delivered') return null;
    
    const today = new Date();
    const delivery = new Date(deliveryDate);
    const diffTime = delivery.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { type: 'overdue', text: 'Overdue', color: 'text-red-600 bg-red-100' };
    if (diffDays === 0) return { type: 'today', text: 'Due Today', color: 'text-orange-600 bg-orange-100' };
    if (diffDays <= 5) return { type: 'soon', text: `${diffDays} days left`, color: 'text-yellow-600 bg-yellow-100' };
    
    return null;
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

  const handleBillClick = (order: Order) => {
    // TODO: Navigate to billing page or generate bill
    console.log('Generate bill for order:', order.id);
    toast({
      title: "Bill Feature",
      description: "Bill generation will be implemented soon",
    });
  };

  if (filteredOrders.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
          <p className="text-gray-600">Try adjusting your search or filters</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredOrders.map(order => {
        const deliveryStatus = getDeliveryStatus(order.deliveryDate, order.status);
        const multipleItems = order.items && order.items.length > 1;
        
        return (
          <Card key={order.id} className="hover:shadow-xl transition-all duration-300 border-0 shadow-md rounded-xl overflow-hidden">
            <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-lg">#{order.orderNumber.slice(-3)}</span>
                    {multipleItems && (
                      <Badge variant="secondary" className="text-xs">
                        {order.items!.length} items
                      </Badge>
                    )}
                  </div>
                  {deliveryStatus && (
                    <Badge className={`${deliveryStatus.color} border-0 text-xs`}>
                      <Calendar className="h-3 w-3 mr-1" />
                      {deliveryStatus.text}
                    </Badge>
                  )}
                </div>
                <Badge className={`${getStatusColor(order.status)} border`} variant="outline">
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(order.status)}
                    <span className="capitalize">{order.status.replace('-', ' ')}</span>
                  </div>
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="p-6 space-y-4">
              {/* Customer Info */}
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-gray-900">{order.customerName}</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>{order.customerPhone}</div>
                  {order.customerEmail && <div>{order.customerEmail}</div>}
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-2">
                {multipleItems ? (
                  <div>
                    <div className="font-medium text-gray-700">Multiple Items:</div>
                    <div className="space-y-1">
                      {order.items!.slice(0, 2).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <span>{item.category}</span>
                            {item.madeFor !== order.customerName && (
                              <Badge variant="outline" className="text-xs">
                                <User className="h-3 w-3 mr-1" />
                                {item.madeFor}
                              </Badge>
                            )}
                          </div>
                          <span className="text-gray-500">Qty: {item.quantity}</span>
                        </div>
                      ))}
                      {order.items!.length > 2 && (
                        <div className="text-xs text-gray-500">
                          +{order.items!.length - 2} more items
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="font-medium">{order.itemType}</span>
                    <span className="text-gray-500">Qty: {order.quantity}</span>
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="flex justify-between text-sm text-gray-600">
                <div>
                  <span className="font-medium">Order:</span> {order.orderDate}
                </div>
                <div>
                  <span className="font-medium">Delivery:</span> {order.deliveryDate}
                </div>
              </div>

              {/* Payment Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-lg font-bold text-gray-900">₹{order.totalAmount.toLocaleString()}</div>
                    {order.remainingAmount > 0 && (
                      <div className="text-sm text-red-600 font-medium">
                        Balance: ₹{order.remainingAmount.toLocaleString()}
                      </div>
                    )}
                  </div>
                  {order.remainingAmount === 0 && (
                    <Badge className="bg-green-100 text-green-700">Paid</Badge>
                  )}
                </div>
              </div>

              {/* Status Update */}
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

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewOrder(order)}
                  className="flex items-center justify-center"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEditOrder(order)}
                  className="flex items-center justify-center"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`tel:${order.customerPhone}`)}
                  className="flex items-center justify-center"
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSendWhatsApp(order)}
                  className="text-green-600 flex items-center justify-center"
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBillClick(order)}
                  className="text-purple-600 flex items-center justify-center"
                >
                  <Receipt className="h-4 w-4" />
                </Button>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="w-full text-red-600 hover:bg-red-50"
                onClick={() => deleteOrder(order)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Order
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default OrdersGridView;
