import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Phone, MessageSquare, User, Edit, Trash2, Ruler, ShoppingBag, Mail } from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  stylePreference?: string;
  measurements: {
    bust?: number;
    waist?: number;
    hips?: number;
    length?: number;
    shoulderWidth?: number;
    sleeveLength?: number;
  };
  orderHistory: {
    totalOrders: number;
    totalSpent: number;
    lastOrderDate?: any;
  };
  notes?: string;
  createdAt: any;
  updatedAt: any;
}

const Customers = () => {
  const { userData } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    stylePreference: '',
    measurements: {
      bust: 0,
      waist: 0,
      hips: 0,
      length: 0,
      shoulderWidth: 0,
      sleeveLength: 0
    },
    notes: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const customersQuery = query(
        collection(db, 'customers'),
        orderBy('createdAt', 'desc')
      );
      const customersSnapshot = await getDocs(customersQuery);
      const customersData = customersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        measurements: doc.data().measurements || {},
        orderHistory: doc.data().orderHistory || { totalOrders: 0, totalSpent: 0 }
      })) as Customer[];
      
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const customerData = {
        ...formData,
        orderHistory: editingCustomer?.orderHistory || { totalOrders: 0, totalSpent: 0 },
        updatedAt: serverTimestamp(),
        ...(editingCustomer ? {} : { createdAt: serverTimestamp() })
      };

      if (editingCustomer) {
        await updateDoc(doc(db, 'customers', editingCustomer.id), customerData);
        toast({
          title: "Success",
          description: "Customer updated successfully",
        });
      } else {
        await addDoc(collection(db, 'customers'), customerData);
        toast({
          title: "Success",
          description: "Customer added successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingCustomer(null);
      resetForm();
      fetchCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      toast({
        title: "Error",
        description: "Failed to save customer",
        variant: "destructive",
      });
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
        bust: 0,
        waist: 0,
        hips: 0,
        length: 0,
        shoulderWidth: 0,
        sleeveLength: 0
      },
      notes: ''
    });
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      stylePreference: customer.stylePreference || '',
      measurements: customer.measurements,
      notes: customer.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (customerId: string) => {
    if (window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
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

  const handleWhatsApp = (phone: string, name: string) => {
    const message = `Hello ${name}, this is Swetha's Couture. We hope you're doing well! How can we assist you with your fashion needs today?`;
    const whatsappUrl = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const viewCustomerDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsViewModalOpen(true);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Customer Management</h1>
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
          <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-gray-600">Manage your customer database and relationships</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              onClick={() => {
                setEditingCustomer(null);
                resetForm();
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </DialogTitle>
              <DialogDescription>
                Fill in the customer details and measurements below.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Customer Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Enter customer name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+91 9876543210"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="customer@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="stylePreference">Style Preference</Label>
                  <Input
                    id="stylePreference"
                    value={formData.stylePreference}
                    onChange={(e) => setFormData({...formData, stylePreference: e.target.value})}
                    placeholder="Traditional, Modern, Fusion"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Complete address"
                  rows={2}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-lg font-medium">Measurements (inches)</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="bust">Bust</Label>
                    <Input
                      id="bust"
                      type="number"
                      step="0.5"
                      value={formData.measurements.bust}
                      onChange={(e) => setFormData({
                        ...formData,
                        measurements: { ...formData.measurements, bust: parseFloat(e.target.value) || 0 }
                      })}
                      placeholder="32"
                    />
                  </div>
                  <div>
                    <Label htmlFor="waist">Waist</Label>
                    <Input
                      id="waist"
                      type="number"
                      step="0.5"
                      value={formData.measurements.waist}
                      onChange={(e) => setFormData({
                        ...formData,
                        measurements: { ...formData.measurements, waist: parseFloat(e.target.value) || 0 }
                      })}
                      placeholder="28"
                    />
                  </div>
                  <div>
                    <Label htmlFor="hips">Hips</Label>
                    <Input
                      id="hips"
                      type="number"
                      step="0.5"
                      value={formData.measurements.hips}
                      onChange={(e) => setFormData({
                        ...formData,
                        measurements: { ...formData.measurements, hips: parseFloat(e.target.value) || 0 }
                      })}
                      placeholder="36"
                    />
                  </div>
                  <div>
                    <Label htmlFor="length">Length</Label>
                    <Input
                      id="length"
                      type="number"
                      step="0.5"
                      value={formData.measurements.length}
                      onChange={(e) => setFormData({
                        ...formData,
                        measurements: { ...formData.measurements, length: parseFloat(e.target.value) || 0 }
                      })}
                      placeholder="40"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shoulderWidth">Shoulder Width</Label>
                    <Input
                      id="shoulderWidth"
                      type="number"
                      step="0.5"
                      value={formData.measurements.shoulderWidth}
                      onChange={(e) => setFormData({
                        ...formData,
                        measurements: { ...formData.measurements, shoulderWidth: parseFloat(e.target.value) || 0 }
                      })}
                      placeholder="14"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sleeveLength">Sleeve Length</Label>
                    <Input
                      id="sleeveLength"
                      type="number"
                      step="0.5"
                      value={formData.measurements.sleeveLength}
                      onChange={(e) => setFormData({
                        ...formData,
                        measurements: { ...formData.measurements, sleeveLength: parseFloat(e.target.value) || 0 }
                      })}
                      placeholder="18"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Any special requirements or notes about the customer"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-purple-600 to-blue-600">
                  {editingCustomer ? 'Update Customer' : 'Add Customer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Customers</CardTitle>
            <User className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{customers.length}</div>
            <p className="text-xs text-gray-500">Active customers</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
            <ShoppingBag className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {customers.reduce((sum, customer) => sum + customer.orderHistory.totalOrders, 0)}
            </div>
            <p className="text-xs text-gray-500">From all customers</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            <Mail className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              ₹{customers.reduce((sum, customer) => sum + customer.orderHistory.totalSpent, 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">Customer lifetime value</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">This Month</CardTitle>
            <User className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {customers.filter(c => c.createdAt && new Date(c.createdAt.seconds * 1000).getMonth() === new Date().getMonth()).length}
            </div>
            <p className="text-xs text-gray-500">New customers</p>
          </CardContent>
        </Card>
      </div>

      {/* Customer Grid */}
      {filteredCustomers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-lg transition-all duration-300 border-0 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <User className="h-5 w-5 text-purple-600" />
                      <span>{customer.name}</span>
                    </CardTitle>
                    <CardDescription className="flex items-center space-x-1 mt-1">
                      <Phone className="h-3 w-3" />
                      <span>{customer.phone}</span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {customer.email && (
                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                      <Mail className="h-3 w-3" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                  {customer.stylePreference && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Style:</span> {customer.stylePreference}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Orders:</span>
                    <Badge variant="outline">{customer.orderHistory.totalOrders}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Spent:</span>
                    <span className="font-medium">₹{customer.orderHistory.totalSpent.toLocaleString()}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-blue-600 hover:bg-blue-50"
                    onClick={() => viewCustomerDetails(customer)}
                  >
                    <Ruler className="h-3 w-3 mr-1" />
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 hover:bg-green-50"
                    onClick={() => handleWhatsApp(customer.phone, customer.name)}
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-purple-600 hover:bg-purple-50"
                    onClick={() => handleCall(customer.phone)}
                  >
                    <Phone className="h-3 w-3 mr-1" />
                    Call
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(customer)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(customer.id)}
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
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'No customers match your search criteria.' : 'Start by adding your first customer.'}
            </p>
            {!searchTerm && (
              <Button 
                className="bg-gradient-to-r from-purple-600 to-blue-600"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Customer
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Customer Detail Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>
              Complete customer information and measurements
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Name</Label>
                  <p className="text-lg font-medium">{selectedCustomer.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Phone</Label>
                  <p className="text-lg">{selectedCustomer.phone}</p>
                </div>
                {selectedCustomer.email && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Email</Label>
                    <p className="text-lg">{selectedCustomer.email}</p>
                  </div>
                )}
                {selectedCustomer.stylePreference && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Style Preference</Label>
                    <p className="text-lg">{selectedCustomer.stylePreference}</p>
                  </div>
                )}
              </div>

              {selectedCustomer.address && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Address</Label>
                  <p className="text-lg">{selectedCustomer.address}</p>
                </div>
              )}

              <div>
                <Label className="text-lg font-medium mb-3 block">Measurements (inches)</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(selectedCustomer.measurements).map(([key, value]) => (
                    value ? (
                      <div key={key} className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-600 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        <div className="text-lg font-bold text-purple-600">{value}"</div>
                      </div>
                    ) : null
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{selectedCustomer.orderHistory.totalOrders}</div>
                  <div className="text-sm text-gray-600">Total Orders</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">₹{selectedCustomer.orderHistory.totalSpent.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Spent</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-lg font-bold text-purple-600">
                    {selectedCustomer.orderHistory.lastOrderDate ? 
                      new Date(selectedCustomer.orderHistory.lastOrderDate.seconds * 1000).toLocaleDateString() : 
                      'No orders yet'
                    }
                  </div>
                  <div className="text-sm text-gray-600">Last Order</div>
                </div>
              </div>

              {selectedCustomer.notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Notes</Label>
                  <p className="text-lg bg-gray-50 p-3 rounded-lg">{selectedCustomer.notes}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => handleEdit(selectedCustomer)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Update Measurements
                </Button>
                <Button
                  className="bg-gradient-to-r from-purple-600 to-blue-600"
                  onClick={() => setIsViewModalOpen(false)}
                >
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
