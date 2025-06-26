
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, AlertCircle, CheckCircle, Package, XCircle, Eye, Edit, Trash2, Phone, MessageCircle, Receipt, User } from 'lucide-react';
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

interface OrdersListViewProps {
  filteredOrders: Order[];
  handleViewOrder: (order: Order) => void;
  handleEditOrder: (order: Order) => void;
  handleSendWhatsApp: (order: Order) => void;
  onRefresh: () => void;
}

const OrdersListView: React.FC<OrdersListViewProps> = ({
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

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle>Orders ({filteredOrders.length})</CardTitle>
        <CardDescription>Manage customer orders and track progress</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[100px]">Order #</TableHead>
                <TableHead className="min-w-[200px]">Customer</TableHead>
                <TableHead className="min-w-[250px]">Items</TableHead>
                <TableHead className="min-w-[150px]">Amount</TableHead>
                <TableHead className="min-w-[150px]">Status</TableHead>
                <TableHead className="min-w-[120px]">Delivery</TableHead>
                <TableHead className="min-w-[120px]">Order Date</TableHead>
                <TableHead className="min-w-[200px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const multipleItems = order.items && order.items.length > 1;
                  
                  return (
                    <TableRow key={order.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">#{order.orderNumber.slice(-3)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.customerName}</div>
                          {order.customerEmail && (
                            <div className="text-sm text-gray-500">{order.customerEmail}</div>
                          )}
                          <div className="text-sm text-gray-500">{order.customerPhone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {multipleItems ? (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">Multiple Items</span>
                              <Badge variant="secondary" className="text-xs">
                                {order.items!.length} items
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              {order.items!.slice(0, 2).map((item, idx) => (
                                <div key={idx} className="flex items-center space-x-2">
                                  <span>{item.category}</span>
                                  {item.madeFor !== order.customerName && (
                                    <Badge variant="outline" className="text-xs">
                                      <User className="h-3 w-3 mr-1" />
                                      {item.madeFor}
                                    </Badge>
                                  )}
                                  <span className="text-gray-400">({item.quantity})</span>
                                </div>
                              ))}
                              {order.items!.length > 2 && (
                                <div className="text-xs text-gray-500">
                                  +{order.items!.length - 2} more...
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium">{order.itemType}</div>
                            <div className="text-sm text-gray-500">Qty: {order.quantity}</div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">₹{order.totalAmount.toLocaleString()}</div>
                          {order.remainingAmount > 0 && (
                            <div className="text-sm text-red-600">Balance: ₹{order.remainingAmount.toLocaleString()}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={order.status}
                          onValueChange={(value) => updateOrderStatus(order.id, value)}
                          disabled={updatingOrderId === order.id}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue>
                              <Badge className={`${getStatusColor(order.status)} border`} variant="outline">
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(order.status)}
                                  <span className="capitalize text-xs">{order.status.replace('-', ' ')}</span>
                                </div>
                              </Badge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="received">Received</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="ready">Ready</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{order.deliveryDate}</div>
                          {/* TODO: Add delivery status indicator */}
                        </div>
                      </TableCell>
                      <TableCell>{order.orderDate}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" variant="outline" onClick={() => handleViewOrder(order)} title="View Order">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEditOrder(order)} title="Edit Order">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => window.open(`tel:${order.customerPhone}`)} title="Call Customer">
                            <Phone className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleSendWhatsApp(order)} className="text-green-600" title="WhatsApp">
                            <MessageCircle className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleBillClick(order)} className="text-purple-600" title="Generate Bill">
                            <Receipt className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => deleteOrder(order)}
                            title="Delete Order"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                    <p className="text-gray-600">Try adjusting your search or filters</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrdersListView;
