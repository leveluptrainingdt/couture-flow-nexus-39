
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
import { Plus, Package, TrendingUp, Clock, Search, Edit, Trash2, Eye, Camera, MessageSquare, CalendarIcon, Filter, Grid3X3, List, Phone, Barcode, Users, FileText } from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
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
import { generateBarcode } from '@/utils/barcodeUtils';
import { format } from 'date-fns';

interface OrderItem {
  id: string;
  invId?: string;
  type: string;
  description: string;
  qty: number;
  rate: number;
  amount: number;
  barcodeUrl?: string;
}

interface Order {
  id: string;
  orderId: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;
  items: OrderItem[];
  measurements?: any;
  dressType: string;
  requiredMaterials?: any[];
  assignedStaff?: any[];
  status: 'Received' | 'In Progress' | 'Ready' | 'Delivered' | 'Cancelled';
  progress: { done: number; total: number };
  totalAmount: number;
  advancePaid: number;
  balance: number;
  deliveryDate: string;
  notes?: string;
  createdAt: any;
  updatedAt?: any;
}

const Orders = () => {
  const { userData } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [selectedOrderForWhatsApp, setSelectedOrderForWhatsApp] = useState<Order | null>(null);
  const [currentView, setCurrentView] = useState<'list' | 'calendar' | 'grid'>('list');
  const [visibleOrders, setVisibleOrders] = useState(5);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [orderDetailsModalOpen, setOrderDetailsModalOpen] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [gridSelectedStatus, setGridSelectedStatus] = useState<string>('');
  const [orderCounter, setOrderCounter] = useState(1000);
  const [generatingBarcode, setGeneratingBarcode] = useState<string>('');

  const [formData, setFormData] = useState({
    orderId: '',
    customerId: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    items: [] as OrderItem[],
    measurements: {},
    dressType: '',
    requiredMaterials: [] as any[],
    assignedStaff: [] as any[],
    status: 'Received' as Order['status'],
    progress: { done: 0, total: 1 },
    totalAmount: 0,
    advancePaid: 0,
    balance: 0,
    deliveryDate: '',
    notes: ''
  });

  const dressTypes = [
    'Blouse', 'Lehenga', 'Saree', 'Kurti', 'Dress', 'Gown', 'Suit', 'Add New Type'
  ];

  const statusOptions = [
    { value: 'all', label: 'All Orders' },
    { value: 'Received', label: 'New Orders' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Ready', label: 'Ready' },
    { value: 'Delivered', label: 'Delivered' },
    { value: 'Cancelled', label: 'Cancelled' }
  ];

  useEffect(() => {
    fetchAllData();
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

  const fetchAllData = async () => {
    try {
      // Set up real-time listeners
      const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
        const ordersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Order[];
        setOrders(ordersData);
        setLoading(false);
      });

      const customersQuery = query(collection(db, 'customers'), orderBy('name'));
      const unsubscribeCustomers = onSnapshot(customersQuery, (snapshot) => {
        const customersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCustomers(customersData);
      });

      const inventoryQuery = query(collection(db, 'inventory'), orderBy('name'));
      const unsubscribeInventory = onSnapshot(inventoryQuery, (snapshot) => {
        const inventoryData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setInventory(inventoryData);
      });

      const staffQuery = query(collection(db, 'staff'), orderBy('name'));
      const unsubscribeStaff = onSnapshot(staffQuery, (snapshot) => {
        const staffData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setStaff(staffData);
      });

      // Return cleanup function
      return () => {
        unsubscribeOrders();
        unsubscribeCustomers();
        unsubscribeInventory();
        unsubscribeStaff();
      };
    } catch (error) {
      console.error('Error setting up real-time listeners:', error);
      setLoading(false);
    }
  };

  const generateOrderId = () => {
    const newCounter = orderCounter + 1;
    saveOrderCounter(newCounter);
    return `O${newCounter}`;
  };

  const addNewItem = () => {
    const newItem: OrderItem = {
      id: Date.now().toString(),
      type: '',
      description: '',
      qty: 1,
      rate: 0,
      amount: 0
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Recalculate amount if qty or rate changed
      if (field === 'qty' || field === 'rate') {
        newItems[index].amount = newItems[index].qty * newItems[index].rate;
      }
      
      // Recalculate total
      const newTotal = newItems.reduce((sum, item) => sum + item.amount, 0);
      const newBalance = newTotal - prev.advancePaid;
      
      return {
        ...prev,
        items: newItems,
        totalAmount: newTotal,
        balance: newBalance
      };
    });
  };

  const removeItem = (index: number) => {
    setFormData(prev => {
      const newItems = prev.items.filter((_, i) => i !== index);
      const newTotal = newItems.reduce((sum, item) => sum + item.amount, 0);
      const newBalance = newTotal - prev.advancePaid;
      
      return {
        ...prev,
        items: newItems,
        totalAmount: newTotal,
        balance: newBalance
      };
    });
  };

  const generateItemBarcode = async (itemIndex: number) => {
    try {
      setGeneratingBarcode(itemIndex.toString());
      const item = formData.items[itemIndex];
      const barcodeText = `${formData.orderId}-${item.type}-${itemIndex + 1}`;
      const barcodeUrl = await generateBarcode(barcodeText);
      
      updateItem(itemIndex, 'barcodeUrl', barcodeUrl);
      
      toast({
        title: "Success",
        description: "Barcode generated successfully",
      });
    } catch (error) {
      console.error('Error generating barcode:', error);
      toast({
        title: "Error",
        description: "Failed to generate barcode",
        variant: "destructive",
      });
    } finally {
      setGeneratingBarcode('');
    }
  };

  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({
      ...prev,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email || '',
      customerAddress: customer.address || '',
      measurements: customer.measurements || {}
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const orderData = {
        ...formData,
        orderId: editingOrder ? editingOrder.orderId : generateOrderId(),
        balance: formData.totalAmount - formData.advancePaid,
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
        
        // Create customer record if new
        if (!selectedCustomer && formData.customerName) {
          await addDoc(collection(db, 'customers'), {
            name: formData.customerName,
            phone: formData.customerPhone,
            email: formData.customerEmail,
            address: formData.customerAddress,
            measurements: formData.measurements,
            totalOrders: 1,
            totalSpent: formData.totalAmount,
            lastOrderDate: new Date(),
            createdAt: serverTimestamp()
          });
        }
        
        // Deduct required materials from inventory
        if (formData.requiredMaterials.length > 0) {
          try {
            await deductInventoryForOrder(formData.requiredMaterials.map(m => ({
              type: m.id,
              quantity: m.quantity
            })));
          } catch (inventoryError) {
            console.warn('Inventory sync failed:', inventoryError);
          }
        }

        toast({
          title: "Success",
          description: `Order #${orderData.orderId.slice(-3)} created successfully`,
        });
      }

      setIsDialogOpen(false);
      setEditingOrder(null);
      resetForm();
      setSelectedCustomer(null);
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
      orderId: '',
      customerId: '',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
      items: [],
      measurements: {},
      dressType: '',
      requiredMaterials: [],
      assignedStaff: [],
      status: 'Received',
      progress: { done: 0, total: 1 },
      totalAmount: 0,
      advancePaid: 0,
      balance: 0,
      deliveryDate: '',
      notes: ''
    });
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      orderId: order.orderId,
      customerId: order.customerId || '',
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail || '',
      customerAddress: order.customerAddress || '',
      items: order.items || [],
      measurements: order.measurements || {},
      dressType: order.dressType || '',
      requiredMaterials: order.requiredMaterials || [],
      assignedStaff: order.assignedStaff || [],
      status: order.status,
      progress: order.progress || { done: 0, total: 1 },
      totalAmount: order.totalAmount || 0,
      advancePaid: order.advancePaid || 0,
      balance: order.balance || 0,
      deliveryDate: order.deliveryDate,
      notes: order.notes || ''
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
      case 'Received': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'In Progress': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Ready': return 'bg-green-100 text-green-700 border-green-200';
      case 'Delivered': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Cancelled': return 'bg-red-100 text-red-700 border-red-200';
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

    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerPhone?.includes(searchTerm) ||
        order.dressType?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    if (gridSelectedStatus && gridSelectedStatus !== 'all') {
      filtered = filtered.filter(order => order.status === gridSelectedStatus);
    }

    if (dateFilter) {
      const filterDate = format(dateFilter, 'yyyy-MM-dd');
      filtered = filtered.filter(order => 
        order.deliveryDate === filterDate
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

  const totalOrders = orders.length;
  const totalRevenue = orders
    .filter(order => order.status === 'Delivered')
    .reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  const pendingOrders = orders.filter(order => order.status === 'Received').length;
  const inProgressOrders = orders.filter(order => order.status === 'In Progress').length;

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
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
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
                <DialogTitle className="text-2xl font-bold text-purple-800">
                  {editingOrder ? 'Edit Order' : 'Create New Order'}
                </DialogTitle>
                <DialogDescription>
                  Fill in the order details below to create a comprehensive order record.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Customer Information */}
                <Card className="border-purple-200">
                  <CardHeader className="bg-purple-50">
                    <CardTitle className="flex items-center text-purple-800">
                      <Users className="h-5 w-5 mr-2" />
                      Customer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
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
                    <div className="grid grid-cols-2 gap-4">
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
                        <Label htmlFor="customerAddress">Address (Optional)</Label>
                        <Input
                          id="customerAddress"
                          value={formData.customerAddress}
                          onChange={(e) => setFormData({...formData, customerAddress: e.target.value})}
                          placeholder="Customer address"
                        />
                      </div>
                    </div>
                    {selectedCustomer && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-sm text-green-700">
                          ✓ Using existing customer data. You can modify the details above if needed.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Order Items */}
                <Card className="border-blue-200">
                  <CardHeader className="bg-blue-50">
                    <CardTitle className="flex items-center text-blue-800">
                      <Package className="h-5 w-5 mr-2" />
                      Order Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    <div className="space-y-4">
                      {formData.items.map((item, index) => (
                        <div key={item.id} className="grid grid-cols-12 gap-2 items-end p-4 border rounded-lg bg-gray-50">
                          <div className="col-span-3">
                            <Label>Type/Description</Label>
                            <Input
                              value={item.description}
                              onChange={(e) => updateItem(index, 'description', e.target.value)}
                              placeholder="Item description"
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Quantity</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) => updateItem(index, 'qty', parseInt(e.target.value) || 1)}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Rate (₹)</Label>
                            <Input
                              type="number"
                              min="0"
                              value={item.rate}
                              onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Amount (₹)</Label>
                            <Input
                              type="number"
                              value={item.amount}
                              readOnly
                              className="bg-gray-100"
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Actions</Label>
                            <div className="flex space-x-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => generateItemBarcode(index)}
                                disabled={generatingBarcode === index.toString()}
                                className="p-2"
                              >
                                {generatingBarcode === index.toString() ? (
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                                ) : (
                                  <Barcode className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => removeItem(index)}
                                className="p-2"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {item.barcodeUrl && (
                            <div className="col-span-12 mt-2">
                              <img src={item.barcodeUrl} alt="Barcode" className="h-12 border rounded" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addNewItem}
                      className="w-full border-dashed"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </CardContent>
                </Card>

                {/* Dress Type & Measurements */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-green-200">
                    <CardHeader className="bg-green-50">
                      <CardTitle className="flex items-center text-green-800">
                        <FileText className="h-5 w-5 mr-2" />
                        Dress Type
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div>
                        <Label htmlFor="dressType">Dress Type</Label>
                        <Select value={formData.dressType} onValueChange={(value) => {
                          if (value === 'Add New Type') {
                            const newType = prompt('Enter new dress type:');
                            if (newType && newType.trim()) {
                              setFormData({...formData, dressType: newType.trim()});
                            }
                          } else {
                            setFormData({...formData, dressType: value});
                          }
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select dress type" />
                          </SelectTrigger>
                          <SelectContent>
                            {dressTypes.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-yellow-200">
                    <CardHeader className="bg-yellow-50">
                      <CardTitle className="flex items-center text-yellow-800">
                        <Edit className="h-5 w-5 mr-2" />
                        Order Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value as Order['status']})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Received">Received</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Ready">Ready</SelectItem>
                            <SelectItem value="Delivered">Delivered</SelectItem>
                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
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
                    </CardContent>
                  </Card>
                </div>

                {/* Dynamic Measurements */}
                {formData.dressType && formData.dressType !== 'Add New Type' && (
                  <Card className="border-indigo-200">
                    <CardHeader className="bg-indigo-50">
                      <CardTitle className="text-indigo-800">Measurements for {formData.dressType}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <DynamicMeasurements
                        itemType={formData.dressType}
                        measurements={formData.measurements}
                        onChange={(measurements) => setFormData({...formData, measurements})}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Staff Assignment */}
                <Card className="border-orange-200">
                  <CardHeader className="bg-orange-50">
                    <CardTitle className="flex items-center text-orange-800">
                      <Users className="h-5 w-5 mr-2" />
                      Staff Assignment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <StaffAssignment
                      selectedStaff={formData.assignedStaff.map(s => s.uid)}
                      onChange={(staffIds) => {
                        const assignedStaff = staffIds.map(id => {
                          const staffMember = staff.find(s => s.id === id);
                          return {
                            uid: id,
                            name: staffMember?.name || 'Unknown',
                            role: staffMember?.role || ''
                          };
                        });
                        setFormData({...formData, assignedStaff});
                      }}
                    />
                  </CardContent>
                </Card>

                {/* Required Materials */}
                <Card className="border-red-200">
                  <CardHeader className="bg-red-50">
                    <CardTitle className="flex items-center text-red-800">
                      <Package className="h-5 w-5 mr-2" />
                      Required Materials
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <RequiredMaterials
                      selectedMaterials={formData.requiredMaterials}
                      onChange={(materials) => setFormData({...formData, requiredMaterials: materials})}
                    />
                  </CardContent>
                </Card>

                {/* Financial Details */}
                <Card className="border-purple-200">
                  <CardHeader className="bg-purple-50">
                    <CardTitle className="flex items-center text-purple-800">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Financial Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="totalAmount">Total Amount (₹)</Label>
                        <Input
                          id="totalAmount"
                          type="number"
                          value={formData.totalAmount}
                          readOnly
                          className="bg-gray-100 text-lg font-semibold"
                        />
                      </div>
                      <div>
                        <Label htmlFor="advancePaid">Advance Paid (₹)</Label>
                        <Input
                          id="advancePaid"
                          type="number"
                          min="0"
                          max={formData.totalAmount}
                          value={formData.advancePaid}
                          onChange={(e) => {
                            const advance = parseFloat(e.target.value) || 0;
                            setFormData({
                              ...formData, 
                              advancePaid: advance,
                              balance: formData.totalAmount - advance
                            });
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="balance">Balance (₹)</Label>
                        <Input
                          id="balance"
                          type="number"
                          value={formData.balance}
                          readOnly
                          className="bg-gray-100 text-lg font-semibold"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                <Card className="border-gray-200">
                  <CardHeader className="bg-gray-50">
                    <CardTitle className="text-gray-800">Additional Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
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
                  </CardContent>
                </Card>

                <div className="flex justify-end space-x-3 pt-6">
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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
            <Package className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalOrders}</div>
            <p className="text-xs text-gray-500">All time orders</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">₹{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-gray-500">From delivered orders</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Orders</CardTitle>
            <Clock className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{pendingOrders}</div>
            <p className="text-xs text-gray-500">Awaiting processing</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
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
        <Card className="border-0 shadow-lg">
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
          <Card className="border-0 shadow-lg">
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
                          <TableHead>Dress Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Delivery</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayedOrders.map((order) => (
                          <TableRow key={order.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium">#{order.orderId.slice(-3)}</TableCell>
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
                                <div className="font-medium">{order.dressType}</div>
                                <div className="text-sm text-gray-500">{order.items?.length || 0} items</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">₹{(order.totalAmount || 0).toLocaleString()}</div>
                                {order.balance > 0 && (
                                  <div className="text-sm text-red-600 font-medium">
                                    Balance: ₹{(order.balance || 0).toLocaleString()}
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
                                {order.status === 'Received' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-blue-600"
                                    onClick={() => updateStatus(order.id, 'In Progress')}
                                  >
                                    Start
                                  </Button>
                                )}
                                {order.status === 'In Progress' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600"
                                    onClick={() => updateStatus(order.id, 'Ready')}
                                  >
                                    Ready
                                  </Button>
                                )}
                                {order.status === 'Ready' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-purple-600"
                                    onClick={() => updateStatus(order.id, 'Delivered')}
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
                      <Card key={order.id} className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-medium">#{order.orderId.slice(-3)}</div>
                            <div className="text-lg font-semibold">{order.customerName}</div>
                            <div className="text-sm text-gray-500">{order.dressType} • {order.items?.length || 0} items</div>
                          </div>
                          <Badge className={getStatusColor(order.status)} variant="outline">
                            {order.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 mb-4">
                          <div className="text-sm">
                            <span className="font-medium">Amount:</span> ₹{(order.totalAmount || 0).toLocaleString()}
                          </div>
                          {order.balance > 0 && (
                            <div className="text-sm text-red-600 font-medium">
                              Balance: ₹{(order.balance || 0).toLocaleString()}
                            </div>
                          )}
                          <div className="text-sm">
                            <span className="font-medium">Delivery:</span> {order.deliveryDate}
                          </div>
                        </div>

                        <div className="flex space-x-2 flex-wrap">
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
                      className="bg-gradient-to-r from-purple-600 to-blue-600"
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
        onRefresh={fetchAllData}
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
