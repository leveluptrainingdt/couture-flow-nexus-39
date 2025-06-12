
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Package, TrendingUp, Clock, Search, Edit, Trash2, Eye, Camera, MessageSquare, CalendarIcon, Filter, Grid3X3, List, Phone } from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import CustomerAutoSuggest from '@/components/CustomerAutoSuggest';
import DynamicMeasurements from '@/components/DynamicMeasurements';
import WhatsAppMessageModal from '@/components/WhatsAppMessageModal';
import OrderCalendar from '@/components/OrderCalendar';
import OrderGridView from '@/components/OrderGridView';
import OrderDetailsModal from '@/components/OrderDetailsModal';
import StaffAssignment from '@/components/StaffAssignment';
import RequiredMaterials from '@/components/RequiredMaterials';
import { deductInventoryForOrder } from '@/utils/inventoryOrderSync';
import { format } from 'date-fns';

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
  measurements?: any;
  designImages?: string[];
  notes?: string;
  assignedStaff?: string[];
  requiredMaterials?: any[];
  createdAt: any;
  updatedAt?: any;
}

const Orders = () => {
  const { userData } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [uploadingImages, setUploadingImages] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [selectedOrderForWhatsApp, setSelectedOrderForWhatsApp] = useState<Order | null>(null);
  const [currentView, setCurrentView] = useState<'list' | 'calendar' | 'grid'>('list');
  const [visibleOrders, setVisibleOrders] = useState(5);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [orderDetailsModalOpen, setOrderDetailsModalOpen] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [gridSelectedStatus, setGridSelectedStatus] = useState<string>('');
  const [orderCounter, setOrderCounter] = useState(100);

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
    measurements: {},
    designImages: [] as string[],
    assignedStaff: [] as string[],
    requiredMaterials: [] as any[]
  });

  const itemTypes = [
    'Blouse', 'Lehenga', 'Saree', 'Kurti', 'Dress', 'Gown', 'Suit', 'Add New Type'
  ];

  const statusOptions = [
    { value: 'all', label: 'All Orders' },
    { value: 'received', label: 'New Orders' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'ready', label: 'Ready' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'recent', label: 'Recently Modified' }
  ];

  useEffect(() => {
    fetchOrders();
    loadOrderCounter();
  }, []);

  const loadOrderCounter = () => {
    const savedCounter = localStorage.getItem('orderCounter');
    if (savedCounter) {
      setOrderCounter(parseInt(savedCounter));
    }
  };

  const saveOrderCounter = (counter: number) => {
    localStorage.setItem('orderCounter', counter.toString());
    setOrderCounter(counter);
  };

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
    const newCounter = orderCounter + 1;
    saveOrderCounter(newCounter);
    return `SC${newCounter}`;
  };

  const createCustomerRecord = async (orderData: any) => {
    try {
      // Check if customer already exists with same phone
      const customersSnapshot = await getDocs(collection(db, 'customers'));
      const existingCustomer = customersSnapshot.docs.find(doc => 
        doc.data().phone === orderData.customerPhone
      );

      if (!existingCustomer) {
        await addDoc(collection(db, 'customers'), {
          name: orderData.customerName,
          phone: orderData.customerPhone,
          email: orderData.customerEmail || '',
          measurements: orderData.measurements || {},
          totalOrders: 1,
          totalSpent: orderData.totalAmount,
          lastOrderDate: orderData.orderDate,
          customerType: 'regular',
          createdAt: serverTimestamp()
        });
        console.log('New customer record created');
      } else {
        // Update existing customer
        const customerData = existingCustomer.data();
        await updateDoc(doc(db, 'customers', existingCustomer.id), {
          totalOrders: (customerData.totalOrders || 0) + 1,
          totalSpent: (customerData.totalSpent || 0) + orderData.totalAmount,
          lastOrderDate: orderData.orderDate,
          measurements: { ...customerData.measurements, ...orderData.measurements },
          updatedAt: serverTimestamp()
        });
        console.log('Existing customer record updated');
      }
    } catch (error) {
      console.error('Error creating/updating customer record:', error);
    }
  };

  const uploadImages = async (files: FileList) => {
    setUploadingImages(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('upload_preset', 'swetha');

        const response = await fetch('https://api.cloudinary.com/v1_1/dvmrhs2ek/image/upload', {
          method: 'POST',
          body: formDataUpload
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
        
        // Create customer record if new order
        await createCustomerRecord(orderData);
        
        // Deduct inventory for required materials
        if (formData.requiredMaterials.length > 0) {
          try {
            await deductInventoryForOrder(formData.requiredMaterials.map(m => ({
              type: m.name,
              quantity: m.quantity
            })));
          } catch (inventoryError) {
            console.warn('Inventory sync failed:', inventoryError);
          }
        }

        toast({
          title: "Success",
          description: `Order #${orderData.orderNumber.slice(-3)} created successfully`,
        });
      }

      setIsDialogOpen(false);
      setEditingOrder(null);
      resetForm();
      setSelectedCustomer(null);
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
      measurements: {},
      designImages: [],
      assignedStaff: [],
      requiredMaterials: []
    });
  };

  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({
      ...prev,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email || '',
      measurements: customer.measurements || {}
    }));
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
      measurements: order.measurements || {},
      designImages: order.designImages || [],
      assignedStaff: order.assignedStaff || [],
      requiredMaterials: order.requiredMaterials || []
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
      case 'in-progress': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'ready': return 'bg-green-100 text-green-700 border-green-200';
      case 'delivered': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const openWhatsAppModal = (order: Order) => {
    setSelectedOrderForWhatsApp(order);
    setWhatsappModalOpen(true);
  };

  const openOrderDetails = (order: Order) => {
    setSelectedOrderForDetails(order);
    setOrderDetailsModalOpen(true);
  };

  const handleGridViewOrderClick = (order: any) => {
    if (order.status && order.status !== 'all') {
      setGridSelectedStatus(order.status);
    } else {
      openOrderDetails(order);
    }
  };

  const filterOrders = (orders: Order[]) => {
    let filtered = orders;

    // Text search filter
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerPhone?.includes(searchTerm) ||
        order.itemType?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'recent') {
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
        filtered = filtered.filter(order => {
          if (order.updatedAt && order.updatedAt.toDate) {
            return order.updatedAt.toDate() > fiveDaysAgo;
          }
          return false;
        });
      } else {
        filtered = filtered.filter(order => order.status === statusFilter);
      }
    }

    // Grid view status filter
    if (gridSelectedStatus && gridSelectedStatus !== 'all') {
      filtered = filtered.filter(order => order.status === gridSelectedStatus);
    }

    // Date filter
    if (dateFilter) {
      const filterDate = format(dateFilter, 'yyyy-MM-dd');
      filtered = filtered.filter(order => 
        order.orderDate === filterDate || order.deliveryDate === filterDate
      );
    }

    // Date range filter
    if (dateRange.from && dateRange.to) {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');
      filtered = filtered.filter(order => 
        (order.orderDate >= fromDate && order.orderDate <= toDate) ||
        (order.deliveryDate >= fromDate && order.deliveryDate <= toDate)
      );
    }

    return filtered;
  };

  const filteredOrders = filterOrders(orders);
  const displayedOrders = currentView === 'list' ? filteredOrders.slice(0, visibleOrders) : filteredOrders;

  const loadMoreOrders = () => {
    setVisibleOrders(prev => prev + 5);
  };

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
        <div className="flex space-x-2">
          <Tabs value={currentView} onValueChange={(value) => {
            setCurrentView(value as 'list' | 'calendar' | 'grid');
            setGridSelectedStatus('');
          }}>
            <TabsList>
              <TabsTrigger value="list"><List className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="grid"><Grid3X3 className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="calendar"><CalendarIcon className="h-4 w-4" /></TabsTrigger>
            </TabsList>
          </Tabs>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                onClick={() => {
                  setEditingOrder(null);
                  resetForm();
                  setSelectedCustomer(null);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
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
                    <CustomerAutoSuggest
                      value={formData.customerName}
                      onChange={(value) => setFormData({...formData, customerName: value})}
                      onCustomerSelect={handleCustomerSelect}
                      placeholder="Start typing customer name..."
                    />
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
                  {selectedCustomer && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-700">
                        ✓ Using existing customer data. You can modify the details above if needed.
                      </p>
                    </div>
                  )}
                </div>

                {/* Order Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Order Details</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="itemType">Item Type</Label>
                      <Select value={formData.itemType} onValueChange={(value) => {
                        if (value === 'Add New Type') {
                          const newType = prompt('Enter new item type:');
                          if (newType && newType.trim()) {
                            setFormData({...formData, itemType: newType.trim()});
                          }
                        } else {
                          setFormData({...formData, itemType: value});
                        }
                      }}>
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
                        placeholder="Enter total: ₹1500"
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
                        placeholder="Advance paid: ₹500"
                      />
                    </div>
                  </div>
                </div>

                {/* Staff Assignment */}
                <StaffAssignment
                  selectedStaff={formData.assignedStaff}
                  onChange={(staffIds) => setFormData({...formData, assignedStaff: staffIds})}
                />

                {/* Required Materials */}
                <RequiredMaterials
                  selectedMaterials={formData.requiredMaterials}
                  onChange={(materials) => setFormData({...formData, requiredMaterials: materials})}
                />

                {/* Dynamic Measurements */}
                {formData.itemType && formData.itemType !== 'Add New Type' && (
                  <DynamicMeasurements
                    itemType={formData.itemType}
                    measurements={formData.measurements}
                    onChange={(measurements) => setFormData({...formData, measurements})}
                  />
                )}

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

      {currentView === 'calendar' ? (
        <OrderCalendar 
          orders={orders} 
          onDateSelect={(date, dayOrders) => {
            console.log('Selected date:', date, 'Orders:', dayOrders);
          }}
        />
      ) : currentView === 'grid' ? (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Orders Overview</CardTitle>
              {gridSelectedStatus && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setGridSelectedStatus('')}
                >
                  ← Back to Overview
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <OrderGridView
              orders={orders}
              onOrderClick={handleGridViewOrderClick}
              onWhatsAppClick={openWhatsAppModal}
              selectedStatus={gridSelectedStatus}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {dateFilter ? format(dateFilter, 'PPP') : 'Filter by Date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFilter}
                  onSelect={setDateFilter}
                  initialFocus
                />
                {dateFilter && (
                  <div className="p-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateFilter(undefined)}
                      className="w-full"
                    >
                      Clear Filter
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Orders Table */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Orders ({filteredOrders.length})</CardTitle>
              <CardDescription>Manage customer orders and track progress</CardDescription>
            </CardHeader>
            <CardContent>
              {displayedOrders.length > 0 ? (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block">
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
                          <TableHead>Order Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayedOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">#{order.orderNumber.slice(-3)}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{order.customerName}</div>
                                <div className="text-sm text-gray-500">{order.customerEmail}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm">{order.customerPhone}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openWhatsAppModal(order)}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
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
                                {order.remainingAmount > 0 && (
                                  <div className="text-sm text-red-600 font-medium">
                                    Balance: ₹{(order.remainingAmount || 0).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(order.status)} variant="outline">
                                {order.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{order.deliveryDate}</TableCell>
                            <TableCell>
                              <div className="text-sm text-gray-600">{order.orderDate}</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => openOrderDetails(order)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
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
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-4">
                    {displayedOrders.map((order) => (
                      <Card key={order.id} className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-medium">#{order.orderNumber.slice(-3)}</div>
                            <div className="text-lg font-semibold">{order.customerName}</div>
                            <div className="text-sm text-gray-500">{order.itemType} • Qty: {order.quantity}</div>
                          </div>
                          <Badge className={getStatusColor(order.status)} variant="outline">
                            {order.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 mb-4">
                          <div className="text-sm">
                            <span className="font-medium">Amount:</span> ₹{(order.totalAmount || 0).toLocaleString()}
                          </div>
                          {order.remainingAmount > 0 && (
                            <div className="text-sm text-red-600 font-medium">
                              Balance: ₹{(order.remainingAmount || 0).toLocaleString()}
                            </div>
                          )}
                          <div className="text-sm">
                            <span className="font-medium">Order Date:</span> {order.orderDate}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Delivery:</span> {order.deliveryDate}
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openOrderDetails(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openWhatsAppModal(order)}
                            className="text-green-600"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`tel:${order.customerPhone}`)}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(order)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                  
                  {/* Load More Button */}
                  {visibleOrders < filteredOrders.length && (
                    <div className="text-center mt-6">
                      <Button 
                        variant="outline" 
                        onClick={loadMoreOrders}
                        className="w-full sm:w-auto"
                      >
                        Load More Orders ({filteredOrders.length - visibleOrders} remaining)
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm || statusFilter !== 'all' || dateFilter ? 'No orders match your filters.' : 'Start by creating your first order.'}
                  </p>
                  {!searchTerm && statusFilter === 'all' && !dateFilter && (
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
        </>
      )}

      {/* Order Details Modal */}
      <OrderDetailsModal
        isOpen={orderDetailsModalOpen}
        onClose={() => {
          setOrderDetailsModalOpen(false);
          setSelectedOrderForDetails(null);
        }}
        order={selectedOrderForDetails}
        onWhatsAppClick={openWhatsAppModal}
        onRefresh={fetchOrders}
      />

      {/* WhatsApp Message Modal */}
      {selectedOrderForWhatsApp && (
        <WhatsAppMessageModal
          isOpen={whatsappModalOpen}
          onClose={() => {
            setWhatsappModalOpen(false);
            setSelectedOrderForWhatsApp(null);
          }}
          order={selectedOrderForWhatsApp}
        />
      )}
    </div>
  );
};

export default Orders;
