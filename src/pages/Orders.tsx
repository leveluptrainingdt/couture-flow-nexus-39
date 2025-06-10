
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, ShoppingCart, Search, Edit, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import ContactActions from '@/components/ContactActions';
import ImageViewer from '@/components/ImageViewer';
import { getOrderStatusMessage } from '@/utils/contactUtils';

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  orderItems: Array<{
    itemName: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  status: 'received' | 'in-progress' | 'ready' | 'delivered';
  deliveryDate: string;
  designImages: string[];
  notes?: string;
  createdAt: any;
  measurements?: {
    chest?: string;
    waist?: string;
    length?: string;
    shoulder?: string;
  };
}

const Orders = () => {
  const { userData } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [currentImages, setCurrentImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    orderItems: [{ itemName: '', quantity: 1, price: 0 }],
    status: 'received' as 'received' | 'in-progress' | 'ready' | 'delivered',
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
      const ordersQuery = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc')
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      const ordersData = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        designImages: doc.data().designImages || []
      })) as Order[];
      
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
      const totalAmount = formData.orderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      
      const orderData = {
        ...formData,
        totalAmount,
        designImages: [],
        ...(editingOrder ? { updatedAt: serverTimestamp() } : { createdAt: serverTimestamp() })
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
          description: "Order added successfully",
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
      status: 'received',
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
      customerEmail: order.customerEmail || '',
      orderItems: order.orderItems,
      status: order.status,
      deliveryDate: order.deliveryDate,
      notes: order.notes || '',
      measurements: order.measurements || {
        chest: '',
        waist: '',
        length: '',
        shoulder: ''
      }
    });
    setIsDialogOpen(true);
  };

  const updateStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast({
        title: "Success",
        description: "Order status updated successfully",
      });
      fetchOrders();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const uploadImage = async (file: File, orderId: string) => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'swetha');

      const response = await fetch('https://api.cloudinary.com/v1_1/dvmrhs2ek/image/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.secure_url) {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          const updatedImages = [...order.designImages, data.secure_url];

          await updateDoc(doc(db, 'orders', orderId), {
            designImages: updatedImages,
            updatedAt: serverTimestamp()
          });

          toast({
            title: "Success",
            description: "Design image uploaded successfully",
          });
          fetchOrders();
        }
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const openImageViewer = (images: string[], index: number = 0) => {
    setCurrentImages(images);
    setCurrentImageIndex(index);
    setImageViewerOpen(true);
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'received': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'in-progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'ready': return 'bg-green-100 text-green-700 border-green-200';
      case 'delivered': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filteredOrders = orders.filter(order =>
    order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customerPhone.includes(searchTerm) ||
    order.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Order Management</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalOrders = orders.length;
  const activeOrders = orders.filter(order => ['received', 'in-progress'].includes(order.status)).length;
  const completedOrders = orders.filter(order => ['ready', 'delivered'].includes(order.status)).length;
  const totalRevenue = orders.filter(order => order.status === 'delivered').reduce((sum, order) => sum + (order.totalAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-600">Track and manage customer orders</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              onClick={() => {
                setEditingOrder(null);
                resetForm();
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingOrder ? 'Edit Order' : 'Add New Order'}
              </DialogTitle>
              <DialogDescription>
                Fill in the order details below.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                    placeholder="Customer name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                    placeholder="Phone number"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="customerEmail">Email (Optional)</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                  placeholder="Email address"
                />
              </div>

              <div>
                <Label>Order Items</Label>
                {formData.orderItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-3 gap-2 mt-2">
                    <Input
                      placeholder="Item name"
                      value={item.itemName}
                      onChange={(e) => {
                        const newItems = [...formData.orderItems];
                        newItems[index].itemName = e.target.value;
                        setFormData({...formData, orderItems: newItems});
                      }}
                      required
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...formData.orderItems];
                        newItems[index].quantity = parseInt(e.target.value) || 1;
                        setFormData({...formData, orderItems: newItems});
                      }}
                      required
                    />
                    <Input
                      type="number"
                      placeholder="Price"
                      min="0"
                      value={item.price}
                      onChange={(e) => {
                        const newItems = [...formData.orderItems];
                        newItems[index].price = parseFloat(e.target.value) || 0;
                        setFormData({...formData, orderItems: newItems});
                      }}
                      required
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setFormData({
                    ...formData,
                    orderItems: [...formData.orderItems, { itemName: '', quantity: 1, price: 0 }]
                  })}
                >
                  Add Item
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as 'received' | 'in-progress' | 'ready' | 'delivered'})}
                    required
                  >
                    <option value="received">Received</option>
                    <option value="in-progress">In Progress</option>
                    <option value="ready">Ready</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </div>
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
                <Label>Measurements</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Input
                    placeholder="Chest"
                    value={formData.measurements.chest}
                    onChange={(e) => setFormData({
                      ...formData,
                      measurements: {...formData.measurements, chest: e.target.value}
                    })}
                  />
                  <Input
                    placeholder="Waist"
                    value={formData.measurements.waist}
                    onChange={(e) => setFormData({
                      ...formData,
                      measurements: {...formData.measurements, waist: e.target.value}
                    })}
                  />
                  <Input
                    placeholder="Length"
                    value={formData.measurements.length}
                    onChange={(e) => setFormData({
                      ...formData,
                      measurements: {...formData.measurements, length: e.target.value}
                    })}
                  />
                  <Input
                    placeholder="Shoulder"
                    value={formData.measurements.shoulder}
                    onChange={(e) => setFormData({
                      ...formData,
                      measurements: {...formData.measurements, shoulder: e.target.value}
                    })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional notes or special instructions"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600">
                  {editingOrder ? 'Update Order' : 'Add Order'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
            <ShoppingCart className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalOrders}</div>
            <p className="text-xs text-gray-500">All time orders</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Orders</CardTitle>
            <ShoppingCart className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{activeOrders}</div>
            <p className="text-xs text-gray-500">In progress</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
            <ShoppingCart className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{completedOrders}</div>
            <p className="text-xs text-gray-500">Ready & delivered</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Revenue</CardTitle>
            <ShoppingCart className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">₹{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-gray-500">From delivered orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Orders Table */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>Manage customer orders and track progress</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredOrders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Images</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>#{order.id.slice(-6)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.customerName}</div>
                        <div className="text-sm text-gray-500 flex items-center space-x-2">
                          <span>{order.customerPhone}</span>
                          <ContactActions 
                            phone={order.customerPhone}
                            message={getOrderStatusMessage(order.customerName, order.id, order.status)}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {order.orderItems.map((item, idx) => (
                          <div key={idx}>{item.itemName} x{item.quantity}</div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>₹{(order.totalAmount || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status)} variant="outline">
                        {order.status.replace('-', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.deliveryDate}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {order.designImages.length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openImageViewer(order.designImages, 0)}
                          >
                            <ImageIcon className="h-4 w-4" />
                            {order.designImages.length}
                          </Button>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadImage(file, order.id);
                          }}
                          style={{ display: 'none' }}
                          id={`upload-${order.id}`}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => document.getElementById(`upload-${order.id}`)?.click()}
                          disabled={uploadingImage}
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(order)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {order.status === 'received' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600"
                            onClick={() => updateStatus(order.id, 'in-progress')}
                          >
                            Start
                          </Button>
                        )}
                        {order.status === 'in-progress' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600"
                            onClick={() => updateStatus(order.id, 'ready')}
                          >
                            Ready
                          </Button>
                        )}
                        {order.status === 'ready' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-purple-600"
                            onClick={() => updateStatus(order.id, 'delivered')}
                          >
                            Deliver
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'No orders match your search.' : 'Start by adding your first order.'}
              </p>
              {!searchTerm && (
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-purple-600"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Order
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Viewer */}
      <ImageViewer
        images={currentImages}
        currentIndex={currentImageIndex}
        isOpen={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
        title="Order Design Images"
      />
    </div>
  );
};

export default Orders;
