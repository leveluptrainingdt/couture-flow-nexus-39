import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Package, TrendingUp, Clock, Search, Edit, Trash2, Eye, Camera } from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import ContactActions from '@/components/ContactActions';
import ImageViewer from '@/components/ImageViewer';
import { updateInventoryStock } from '@/utils/inventoryOrderSync';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  itemType: string;
  quantity: number;
  totalAmount: number;
  advanceAmount: number;
  remainingAmount: number;
  status: 'received' | 'in-progress' | 'ready' | 'delivered' | 'cancelled';
  orderDate: string;
  deliveryDate: string;
  measurements?: {
    chest?: string;
    waist?: string;
    length?: string;
    shoulder?: string;
  };
  designImages?: string[];
  notes?: string;
  createdAt: any;
}

const Orders = () => {
  const { userData } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const [formData, setFormData] = useState({
    orderNumber: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    itemType: '',
    quantity: 1,
    totalAmount: 0,
    advanceAmount: 0,
    status: 'received' as 'received' | 'in-progress' | 'ready' | 'delivered' | 'cancelled',
    orderDate: '',
    deliveryDate: '',
    notes: '',
    measurements: {
      chest: '',
      waist: '',
      length: '',
      shoulder: ''
    },
    designImages: [] as string[]
  });

  const itemTypes = [
    'Blouse', 'Lehenga', 'Saree', 'Kurti', 'Dress', 'Gown', 'Suit', 'Other'
  ];

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
        ...doc.data()
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

  const generateOrderNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `SC${year}${month}${day}${random}`;
  };

  const uploadImages = async (files: FileList) => {
    setUploadingImages(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'swetha');

        const response = await fetch('https://api.cloudinary.com/v1_1/dvmrhs2ek/image/upload', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();
        if (data.secure_url) {
          uploadedUrls.push(data.secure_url);
        }
      }

      setFormData(prev => ({
        ...prev,
        designImages: [...prev.designImages, ...uploadedUrls]
      }));

      toast({
        title: "Success",
        description: `${uploadedUrls.length} image(s) uploaded successfully`,
      });
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: "Error",
        description: "Failed to upload images",
        variant: "destructive",
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      designImages: prev.designImages.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const remainingAmount = formData.totalAmount - formData.advanceAmount;
      
      const orderData = {
        ...formData,
        remainingAmount,
        orderNumber: editingOrder ? editingOrder.orderNumber : generateOrderNumber(),
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
        
        // Update inventory stock
        try {
          await updateInventoryStock([{
            type: formData.itemType,
            quantity: formData.quantity
          }]);
        } catch (inventoryError) {
          console.warn('Inventory sync failed:', inventoryError);
        }

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
      orderNumber: '',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      itemType: '',
      quantity: 1,
      totalAmount: 0,
      advanceAmount: 0,
      status: 'received',
      orderDate: '',
      deliveryDate: '',
      notes: '',
      measurements: {
        chest: '',
        waist: '',
        length: '',
        shoulder: ''
      },
      designImages: []
    });
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail || '',
      itemType: order.itemType,
      quantity: order.quantity,
      totalAmount: order.totalAmount || 0,
      advanceAmount: order.advanceAmount || 0,
      status: order.status,
      orderDate: order.orderDate,
      deliveryDate: order.deliveryDate,
      notes: order.notes || '',
      measurements: {
        chest: order.measurements?.chest || '',
        waist: order.measurements?.waist || '',
        length: order.measurements?.length || '',
        shoulder: order.measurements?.shoulder || ''
      },
      designImages: order.designImages || []
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

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'received': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'in-progress': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'ready': return 'bg-green-100 text-green-700 border-green-200';
      case 'delivered': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const openImageViewer = (images: string[], index: number = 0) => {
    setSelectedImages(images);
    setSelectedImageIndex(index);
    setImageViewerOpen(true);
  };

  const filteredOrders = orders.filter(order =>
    order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customerPhone?.includes(searchTerm) ||
    order.itemType?.toLowerCase().includes(searchTerm.toLowerCase())
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

  // Safe calculations with null checks
  const totalOrders = orders.length;
  const totalRevenue = orders
    .filter(order => order.status === 'delivered')
    .reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  const pendingOrders = orders.filter(order => order.status === 'received').length;
  const inProgressOrders = orders.filter(order => order.status === 'in-progress').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-600">Track custom orders and customer requests</p>
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
              New Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingOrder ? 'Edit Order' : 'Create New Order'}
              </DialogTitle>
              <DialogDescription>
                Fill in the order details below.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Customer Information</h3>
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
                    <Label htmlFor="customerPhone">Phone Number</Label>
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
              </div>

              {/* Order Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Order Details</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="itemType">Item Type</Label>
                    <Select value={formData.itemType} onValueChange={(value) => setFormData({...formData, itemType: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select item type" />
                      </SelectTrigger>
                      <SelectContent>
                        {itemTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value as Order['status']})}>
                      <SelectTrigger>
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
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="orderDate">Order Date</Label>
                    <Input
                      id="orderDate"
                      type="date"
                      value={formData.orderDate}
                      onChange={(e) => setFormData({...formData, orderDate: e.target.value})}
                      required
                    />
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="totalAmount">Total Amount (₹)</Label>
                    <Input
                      id="totalAmount"
                      type="number"
                      min="0"
                      value={formData.totalAmount}
                      onChange={(e) => setFormData({...formData, totalAmount: parseFloat(e.target.value) || 0})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="advanceAmount">Advance Amount (₹)</Label>
                    <Input
                      id="advanceAmount"
                      type="number"
                      min="0"
                      max={formData.totalAmount}
                      value={formData.advanceAmount}
                      onChange={(e) => setFormData({...formData, advanceAmount: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
              </div>

              {/* Measurements */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Measurements</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="chest">Chest</Label>
                    <Input
                      id="chest"
                      value={formData.measurements.chest}
                      onChange={(e) => setFormData({
                        ...formData,
                        measurements: {...formData.measurements, chest: e.target.value}
                      })}
                      placeholder="inches"
                    />
                  </div>
                  <div>
                    <Label htmlFor="waist">Waist</Label>
                    <Input
                      id="waist"
                      value={formData.measurements.waist}
                      onChange={(e) => setFormData({
                        ...formData,
                        measurements: {...formData.measurements, waist: e.target.value}
                      })}
                      placeholder="inches"
                    />
                  </div>
                  <div>
                    <Label htmlFor="length">Length</Label>
                    <Input
                      id="length"
                      value={formData.measurements.length}
                      onChange={(e) => setFormData({
                        ...formData,
                        measurements: {...formData.measurements, length: e.target.value}
                      })}
                      placeholder="inches"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shoulder">Shoulder</Label>
                    <Input
                      id="shoulder"
                      value={formData.measurements.shoulder}
                      onChange={(e) => setFormData({
                        ...formData,
                        measurements: {...formData.measurements, shoulder: e.target.value}
                      })}
                      placeholder="inches"
                    />
                  </div>
                </div>
              </div>

              {/* Design Images */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Design Images</h3>
                <div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => e.target.files && uploadImages(e.target.files)}
                    style={{ display: 'none' }}
                    id="design-images"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('design-images')?.click()}
                    disabled={uploadingImages}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {uploadingImages ? 'Uploading...' : 'Upload Images'}
                  </Button>
                </div>
                {formData.designImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-4">
                    {formData.designImages.map((url, index) => (
                      <div key={index} className="relative">
                        <img src={url} alt={`Design ${index + 1}`} className="w-full h-20 object-cover rounded" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 p-0"
                          onClick={() => removeImage(index)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Any special instructions or notes"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600">
                  {editingOrder ? 'Update Order' : 'Create Order'}
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
            <Package className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalOrders}</div>
            <p className="text-xs text-gray-500">All time orders</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">₹{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-gray-500">From delivered orders</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Orders</CardTitle>
            <Clock className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{pendingOrders}</div>
            <p className="text-xs text-gray-500">Awaiting processing</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">In Progress</CardTitle>
            <Package className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{inProgressOrders}</div>
            <p className="text-xs text-gray-500">Currently working</p>
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
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.customerName}</div>
                        <div className="text-sm text-gray-500">{order.customerEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{order.customerPhone}</span>
                        <ContactActions 
                          phone={order.customerPhone}
                          message={`Hi ${order.customerName}, your order ${order.orderNumber} for ${order.itemType} is currently ${order.status}. Thank you for choosing Swetha's Couture!`}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.itemType}</div>
                        <div className="text-sm text-gray-500">Qty: {order.quantity}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">₹{(order.totalAmount || 0).toLocaleString()}</div>
                        <div className="text-sm text-gray-500">
                          Balance: ₹{(order.remainingAmount || 0).toLocaleString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status)} variant="outline">
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.deliveryDate}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {order.designImages && order.designImages.length > 0 && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openImageViewer(order.designImages!, 0)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(order.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'No orders match your search.' : 'Start by creating your first order.'}
              </p>
              {!searchTerm && (
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-purple-600"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Order
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Viewer */}
      <ImageViewer
        images={selectedImages}
        currentIndex={selectedImageIndex}
        isOpen={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
        title="Order Design Images"
      />
    </div>
  );
};

export default Orders;
