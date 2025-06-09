import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  MessageCircle, 
  Eye,
  Edit,
  Trash2,
  ShoppingCart,
  DollarSign,
  Calendar
} from 'lucide-react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';

interface CustomerMeasurements {
  bust?: number;
  waist?: number;
  hips?: number;
  length?: number;
  shoulderWidth?: number;
  sleeveLength?: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  stylePreference?: string;
  measurements?: CustomerMeasurements;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: any;
  createdAt: any;
}

const Customers = () => {
  const { userData } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    stylePreference: '',
    measurements: {
      bust: '',
      waist: '',
      hips: '',
      length: '',
      shoulderWidth: '',
      sleeveLength: ''
    }
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const customersSnapshot = await getDocs(collection(db, 'customers'));
      const customersData: Customer[] = customersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          measurements: data.measurements || {}
        } as Customer;
      });
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch customers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      stylePreference: '',
      measurements: {
        bust: '',
        waist: '',
        hips: '',
        length: '',
        shoulderWidth: '',
        sleeveLength: ''
      }
    });
  };

  const handleAdd = async () => {
    try {
      const measurements: CustomerMeasurements = {};
      Object.entries(formData.measurements).forEach(([key, value]) => {
        if (value && !isNaN(Number(value))) {
          measurements[key as keyof CustomerMeasurements] = Number(value);
        }
      });

      const customerData = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        address: formData.address || undefined,
        stylePreference: formData.stylePreference || undefined,
        measurements,
        totalOrders: 0,
        totalSpent: 0,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'customers'), customerData);
      
      toast({
        title: "Success",
        description: "Customer added successfully",
      });
      
      setIsAddDialogOpen(false);
      resetForm();
      fetchCustomers();
    } catch (error) {
      console.error('Error adding customer:', error);
      toast({
        title: "Error",
        description: "Failed to add customer",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async () => {
    if (!selectedCustomer) return;
    
    try {
      const measurements: CustomerMeasurements = {};
      Object.entries(formData.measurements).forEach(([key, value]) => {
        if (value && !isNaN(Number(value))) {
          measurements[key as keyof CustomerMeasurements] = Number(value);
        }
      });

      const updateData = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        address: formData.address || undefined,
        stylePreference: formData.stylePreference || undefined,
        measurements
      };

      await updateDoc(doc(db, 'customers', selectedCustomer.id), updateData);
      
      toast({
        title: "Success",
        description: "Customer updated successfully",
      });
      
      setIsEditDialogOpen(false);
      setSelectedCustomer(null);
      resetForm();
      fetchCustomers();
    } catch (error) {
      console.error('Error updating customer:', error);
      toast({
        title: "Error",
        description: "Failed to update customer",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (customerId: string) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await deleteDoc(doc(db, 'customers', customerId));
        
        toast({
          title: "Success",
          description: "Customer deleted successfully",
        });
        
        fetchCustomers();
      } catch (error) {
        console.error('Error deleting customer:', error);
        toast({
          title: "Error",
          description: "Failed to delete customer",
          variant: "destructive",
        });
      }
    }
  };

  const openEditDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      stylePreference: customer.stylePreference || '',
      measurements: {
        bust: customer.measurements?.bust?.toString() || '',
        waist: customer.measurements?.waist?.toString() || '',
        hips: customer.measurements?.hips?.toString() || '',
        length: customer.measurements?.length?.toString() || '',
        shoulderWidth: customer.measurements?.shoulderWidth?.toString() || '',
        sleeveLength: customer.measurements?.sleeveLength?.toString() || ''
      }
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsViewDialogOpen(true);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalCustomers = customers.length;
  const totalOrders = customers.reduce((sum, customer) => sum + customer.totalOrders, 0);
  const totalRevenue = customers.reduce((sum, customer) => sum + customer.totalSpent, 0);

  const handleWhatsApp = (phone: string, name: string) => {
    const message = `Hello ${name}, this is Swetha's Couture. We hope you're doing well! How can we assist you today?`;
    const whatsappUrl = `https://wa.me/91${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCall = (phone: string) => {
    window.open(`tel:+91${phone.replace(/\D/g, '')}`, '_self');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Customer Management</h1>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-gray-600">Manage your customer database and relationships</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>
                Enter customer details and measurements
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Customer name"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="Email address"
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Complete address"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="stylePreference">Style Preference</Label>
                  <Input
                    id="stylePreference"
                    value={formData.stylePreference}
                    onChange={(e) => setFormData({...formData, stylePreference: e.target.value})}
                    placeholder="e.g., Traditional, Modern, Fusion"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Measurements (inches)</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="bust">Bust</Label>
                    <Input
                      id="bust"
                      type="number"
                      value={formData.measurements.bust}
                      onChange={(e) => setFormData({
                        ...formData, 
                        measurements: {...formData.measurements, bust: e.target.value}
                      })}
                      placeholder="36"
                    />
                  </div>
                  <div>
                    <Label htmlFor="waist">Waist</Label>
                    <Input
                      id="waist"
                      type="number"
                      value={formData.measurements.waist}
                      onChange={(e) => setFormData({
                        ...formData, 
                        measurements: {...formData.measurements, waist: e.target.value}
                      })}
                      placeholder="28"
                    />
                  </div>
                  <div>
                    <Label htmlFor="hips">Hips</Label>
                    <Input
                      id="hips"
                      type="number"
                      value={formData.measurements.hips}
                      onChange={(e) => setFormData({
                        ...formData, 
                        measurements: {...formData.measurements, hips: e.target.value}
                      })}
                      placeholder="38"
                    />
                  </div>
                  <div>
                    <Label htmlFor="length">Length</Label>
                    <Input
                      id="length"
                      type="number"
                      value={formData.measurements.length}
                      onChange={(e) => setFormData({
                        ...formData, 
                        measurements: {...formData.measurements, length: e.target.value}
                      })}
                      placeholder="42"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shoulderWidth">Shoulder Width</Label>
                    <Input
                      id="shoulderWidth"
                      type="number"
                      value={formData.measurements.shoulderWidth}
                      onChange={(e) => setFormData({
                        ...formData, 
                        measurements: {...formData.measurements, shoulderWidth: e.target.value}
                      })}
                      placeholder="15"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sleeveLength">Sleeve Length</Label>
                    <Input
                      id="sleeveLength"
                      type="number"
                      value={formData.measurements.sleeveLength}
                      onChange={(e) => setFormData({
                        ...formData, 
                        measurements: {...formData.measurements, sleeveLength: e.target.value}
                      })}
                      placeholder="20"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={!formData.name || !formData.phone}>
                Add Customer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Customers</CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalCustomers}</div>
            <p className="text-xs text-gray-500">Registered customers</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
            <ShoppingCart className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalOrders}</div>
            <p className="text-xs text-gray-500">From all customers</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">₹{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-gray-500">Customer lifetime value</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by name, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers List */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Customers ({filteredCustomers.length})</CardTitle>
          <CardDescription>Manage your customer database</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="font-medium text-gray-900">{customer.name}</div>
                        <div className="text-sm text-gray-600">{customer.phone}</div>
                        {customer.email && (
                          <div className="text-sm text-gray-500">{customer.email}</div>
                        )}
                      </div>
                      {customer.stylePreference && (
                        <Badge variant="outline">{customer.stylePreference}</Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {customer.totalOrders} orders • ₹{customer.totalSpent.toLocaleString()} spent
                      {customer.lastOrderDate && (
                        <span> • Last order: {new Date(customer.lastOrderDate.seconds * 1000).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCall(customer.phone)}
                    >
                      <Phone className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleWhatsApp(customer.phone, customer.name)}
                    >
                      <MessageCircle className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openViewDialog(customer)}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(customer)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(customer.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'No customers found matching your search.' : 'No customers found. Add your first customer!'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer details and measurements
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Customer name"
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Phone *</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="Email address"
                />
              </div>
              <div>
                <Label htmlFor="edit-address">Address</Label>
                <Textarea
                  id="edit-address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Complete address"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="edit-stylePreference">Style Preference</Label>
                <Input
                  id="edit-stylePreference"
                  value={formData.stylePreference}
                  onChange={(e) => setFormData({...formData, stylePreference: e.target.value})}
                  placeholder="e.g., Traditional, Modern, Fusion"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Measurements (inches)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit-bust">Bust</Label>
                  <Input
                    id="edit-bust"
                    type="number"
                    value={formData.measurements.bust}
                    onChange={(e) => setFormData({
                      ...formData, 
                      measurements: {...formData.measurements, bust: e.target.value}
                    })}
                    placeholder="36"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-waist">Waist</Label>
                  <Input
                    id="edit-waist"
                    type="number"
                    value={formData.measurements.waist}
                    onChange={(e) => setFormData({
                      ...formData, 
                      measurements: {...formData.measurements, waist: e.target.value}
                    })}
                    placeholder="28"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-hips">Hips</Label>
                  <Input
                    id="edit-hips"
                    type="number"
                    value={formData.measurements.hips}
                    onChange={(e) => setFormData({
                      ...formData, 
                      measurements: {...formData.measurements, hips: e.target.value}
                    })}
                    placeholder="38"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-length">Length</Label>
                  <Input
                    id="edit-length"
                    type="number"
                    value={formData.measurements.length}
                    onChange={(e) => setFormData({
                      ...formData, 
                      measurements: {...formData.measurements, length: e.target.value}
                    })}
                    placeholder="42"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-shoulderWidth">Shoulder Width</Label>
                  <Input
                    id="edit-shoulderWidth"
                    type="number"
                    value={formData.measurements.shoulderWidth}
                    onChange={(e) => setFormData({
                      ...formData, 
                      measurements: {...formData.measurements, shoulderWidth: e.target.value}
                    })}
                    placeholder="15"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-sleeveLength">Sleeve Length</Label>
                  <Input
                    id="edit-sleeveLength"
                    type="number"
                    value={formData.measurements.sleeveLength}
                    onChange={(e) => setFormData({
                      ...formData, 
                      measurements: {...formData.measurements, sleeveLength: e.target.value}
                    })}
                    placeholder="20"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={!formData.name || !formData.phone}>
              Update Customer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>
              Complete customer information and order history
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Contact Information</h3>
                  <div className="space-y-2">
                    <div><strong>Name:</strong> {selectedCustomer.name}</div>
                    <div><strong>Phone:</strong> {selectedCustomer.phone}</div>
                    {selectedCustomer.email && (
                      <div><strong>Email:</strong> {selectedCustomer.email}</div>
                    )}
                    {selectedCustomer.address && (
                      <div><strong>Address:</strong> {selectedCustomer.address}</div>
                    )}
                    {selectedCustomer.stylePreference && (
                      <div><strong>Style Preference:</strong> {selectedCustomer.stylePreference}</div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Measurements</h3>
                  {selectedCustomer.measurements && Object.keys(selectedCustomer.measurements).length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {selectedCustomer.measurements.bust && (
                        <div><strong>Bust:</strong> {selectedCustomer.measurements.bust}"</div>
                      )}
                      {selectedCustomer.measurements.waist && (
                        <div><strong>Waist:</strong> {selectedCustomer.measurements.waist}"</div>
                      )}
                      {selectedCustomer.measurements.hips && (
                        <div><strong>Hips:</strong> {selectedCustomer.measurements.hips}"</div>
                      )}
                      {selectedCustomer.measurements.length && (
                        <div><strong>Length:</strong> {selectedCustomer.measurements.length}"</div>
                      )}
                      {selectedCustomer.measurements.shoulderWidth && (
                        <div><strong>Shoulder:</strong> {selectedCustomer.measurements.shoulderWidth}"</div>
                      )}
                      {selectedCustomer.measurements.sleeveLength && (
                        <div><strong>Sleeve:</strong> {selectedCustomer.measurements.sleeveLength}"</div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No measurements recorded</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-medium text-lg">Order History</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{selectedCustomer.totalOrders}</div>
                    <div className="text-gray-600">Total Orders</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">₹{selectedCustomer.totalSpent.toLocaleString()}</div>
                    <div className="text-gray-600">Total Spent</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {selectedCustomer.lastOrderDate ? 
                        new Date(selectedCustomer.lastOrderDate.seconds * 1000).toLocaleDateString() : 
                        'Never'
                      }
                    </div>
                    <div className="text-gray-600">Last Order</div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between">
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => handleCall(selectedCustomer.phone)}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleWhatsApp(selectedCustomer.phone, selectedCustomer.name)}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                </div>
                <Button onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Customers;
