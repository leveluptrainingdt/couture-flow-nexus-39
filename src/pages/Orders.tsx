
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Eye, Edit, Trash2, Package, Calendar, User, DollarSign } from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  orderItems: Array<{
    itemName: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  status: 'new' | 'in-progress' | 'completed' | 'delivered';
  deliveryDate: string;
  notes: string;
  createdAt: any;
  measurements?: {
    chest?: string;
    waist?: string;
    length?: string;
    shoulder?: string;
  };
}

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    orderItems: [{ itemName: '', quantity: 1, price: 0 }],
    deliveryDate: '',
    notes: '',
    measurements: {
      chest: '',
      waist: '',
      length: '',
      shoulder: ''
    }
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      const ordersData = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      
      // Sort by creation date, newest first
      ordersData.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return b.createdAt.seconds - a.createdAt.seconds;
        }
        return 0;
      });
      
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const totalAmount = formData.orderItems.reduce((sum, item) => 
        sum + (item.quantity * item.price), 0
      );

      const orderData = {
        ...formData,
        totalAmount,
        status: 'new' as const,
        createdAt: serverTimestamp(),
      };

      if (editingOrder) {
        await updateDoc(doc(db, 'orders', editingOrder.id), orderData);
        toast({
          title: "Success",
          description: "Order updated successfully",
        });
      } else {
        await addDoc(collection(db, 'orders'), orderData);
        toast({
          title: "Success",
          description: "Order created successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingOrder(null);
      resetForm();
      fetchOrders();
    } catch (error) {
      console.error('Error saving order:', error);
      toast({
        title: "Error",
        description: "Failed to save order",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      orderItems: [{ itemName: '', quantity: 1, price: 0 }],
      deliveryDate: '',
      notes: '',
      measurements: {
        chest: '',
        waist: '',
        length: '',
        shoulder: ''
      }
    });
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      orderItems: order.orderItems,
      deliveryDate: order.deliveryDate,
      notes: order.notes,
      measurements: order.measurements || {
        chest: '',
        waist: '',
        length: '',
        shoulder: ''
      }
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (orderId: string) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        await deleteDoc(doc(db, 'orders', orderId));
        toast({
          title: "Success",
          description: "Order deleted successfully",
        });
        fetchOrders();
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

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      toast({
        title: "Success",
        description: "Order status updated",
      });
      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const addOrderItem = () => {
    setFormData({
      ...formData,
      orderItems: [...formData.orderItems, { itemName: '', quantity: 1, price: 0 }]
    });
  };

  const removeOrderItem = (index: number) => {
    setFormData({
      ...formData,
      orderItems: formData.orderItems.filter((_, i) => i !== index)
    });
  };

  const updateOrderItem = (index: number, field: string, value: any) => {
    const updatedItems = [...formData.orderItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setFormData({ ...formData, orderItems: updatedItems });
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customerPhone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'in-progress': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'delivered': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Orders</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600">Manage your customer orders</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              onClick={() => {
                setEditingOrder(null);
                resetForm();
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingOrder ? 'Edit Order' : 'Create New Order'}
              </DialogTitle>
              <DialogDescription>
                Fill in the customer and order details below.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerName">Customer Name</Label>
                    <Input
                      id="customerName"
                      value={formData.customerName}
                      onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerPhone">Phone Number</Label>
                    <Input
                      id="customerPhone"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="customerEmail">Email (Optional)</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Order Items</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addOrderItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
                {formData.orderItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                    <div className="md:col-span-2">
                      <Label>Item Name</Label>
                      <Input
                        value={item.itemName}
                        onChange={(e) => updateOrderItem(index, 'itemName', e.target.value)}
                        placeholder="e.g., Blouse, Saree, Dress"
                        required
                      />
                    </div>
                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value))}
                        required
                      />
                    </div>
                    <div className="flex space-x-2">
                      <div className="flex-1">
                        <Label>Price (₹)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={item.price}
                          onChange={(e) => updateOrderItem(index, 'price', parseFloat(e.target.value))}
                          required
                        />
                      </div>
                      {formData.orderItems.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-6"
                          onClick={() => removeOrderItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="text-right">
                  <span className="text-lg font-semibold">
                    Total: ₹{formData.orderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Measurements */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Measurements (Optional)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Chest</Label>
                    <Input
                      value={formData.measurements.chest}
                      onChange={(e) => setFormData({
                        ...formData,
                        measurements: {...formData.measurements, chest: e.target.value}
                      })}
                      placeholder="in inches"
                    />
                  </div>
                  <div>
                    <Label>Waist</Label>
                    <Input
                      value={formData.measurements.waist}
                      onChange={(e) => setFormData({
                        ...formData,
                        measurements: {...formData.measurements, waist: e.target.value}
                      })}
                      placeholder="in inches"
                    />
                  </div>
                  <div>
                    <Label>Length</Label>
                    <Input
                      value={formData.measurements.length}
                      onChange={(e) => setFormData({
                        ...formData,
                        measurements: {...formData.measurements, length: e.target.value}
                      })}
                      placeholder="in inches"
                    />
                  </div>
                  <div>
                    <Label>Shoulder</Label>
                    <Input
                      value={formData.measurements.shoulder}
                      onChange={(e) => setFormData({
                        ...formData,
                        measurements: {...formData.measurements, shoulder: e.target.value}
                      })}
                      placeholder="in inches"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Additional Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="deliveryDate">Delivery Date</Label>
                    <Input
                      id="deliveryDate"
                      type="date"
                      value={formData.deliveryDate}
                      onChange={(e) => setFormData({...formData, deliveryDate: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Special instructions, design details, etc."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-purple-600 to-blue-600">
                  {editingOrder ? 'Update Order' : 'Create Order'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by customer name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Grid */}
      {filteredOrders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-lg transition-all duration-300 border-0 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{order.customerName}</CardTitle>
                    <CardDescription className="flex items-center space-x-1">
                      <User className="h-3 w-3" />
                      <span>{order.customerPhone}</span>
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(order.status)} variant="outline">
                    {order.status.replace('-', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center space-x-1 text-gray-600">
                      <Package className="h-3 w-3" />
                      <span>Items:</span>
                    </span>
                    <span className="font-medium">{order.orderItems.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center space-x-1 text-gray-600">
                      <DollarSign className="h-3 w-3" />
                      <span>Total:</span>
                    </span>
                    <span className="font-medium">₹{order.totalAmount?.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center space-x-1 text-gray-600">
                      <Calendar className="h-3 w-3" />
                      <span>Delivery:</span>
                    </span>
                    <span className="font-medium">{order.deliveryDate}</span>
                  </div>
                </div>

                {/* Order Items List */}
                <div className="space-y-1">
                  {order.orderItems.map((item, index) => (
                    <div key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                      {item.itemName} × {item.quantity} = ₹{(item.quantity * item.price).toLocaleString()}
                    </div>
                  ))}
                </div>

                {/* Status Update */}
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Update Status:</Label>
                  <Select value={order.status} onValueChange={(value) => updateOrderStatus(order.id, value as Order['status'])}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(order)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDelete(order.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating your first order.'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Button 
                className="bg-gradient-to-r from-purple-600 to-blue-600"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Order
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Orders;
