
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { User, Package, CreditCard, Users, Calendar, Upload, FileText, Plus } from 'lucide-react';
import { collection, addDoc, getDocs, query, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Staff {
  id: string;
  name: string;
  phone: string;
  photo?: string;
}

interface Material {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
}

interface OrderFormData {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  itemType: string;
  quantity: number;
  status: string;
  orderDate: string;
  deliveryDate: string;
  totalAmount: number;
  advanceAmount: number;
  notes: string;
}

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [designImages, setDesignImages] = useState<File[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<OrderFormData>({
    defaultValues: {
      status: 'received',
      orderDate: new Date().toISOString().split('T')[0],
      quantity: 1
    }
  });

  const customerNameValue = watch('customerName');

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (customerNameValue && customerNameValue.length > 1) {
      setShowCustomerSuggestions(true);
    } else {
      setShowCustomerSuggestions(false);
    }
  }, [customerNameValue]);

  const fetchData = async () => {
    try {
      // Fetch staff
      const staffSnapshot = await getDocs(collection(db, 'staff'));
      const staffData = staffSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Staff[];
      setStaff(staffData);

      // Fetch materials/inventory
      const materialsSnapshot = await getDocs(collection(db, 'inventory'));
      const materialsData = materialsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Material[];
      setMaterials(materialsData);

      // Fetch customers
      const customersSnapshot = await getDocs(collection(db, 'customers'));
      const customersData = customersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load form data",
        variant: "destructive",
      });
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(customerNameValue?.toLowerCase() || '')
  );

  const selectCustomer = (customer: any) => {
    setValue('customerName', customer.name);
    setValue('customerPhone', customer.phone || '');
    setValue('customerEmail', customer.email || '');
    setShowCustomerSuggestions(false);
  };

  const handleStaffToggle = (staffId: string) => {
    setSelectedStaff(prev => 
      prev.includes(staffId) 
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    );
  };

  const handleMaterialToggle = (materialId: string) => {
    setSelectedMaterials(prev => 
      prev.includes(materialId) 
        ? prev.filter(id => id !== materialId)
        : [...prev, materialId]
    );
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setDesignImages(prev => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setDesignImages(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: OrderFormData) => {
    setLoading(true);
    try {
      // Generate order number
      const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
      
      // Calculate remaining amount
      const remainingAmount = (data.totalAmount || 0) - (data.advanceAmount || 0);

      // Create order document
      const orderData = {
        orderId: orderNumber,
        orderNumber: orderNumber,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail || '',
        dressType: data.itemType,
        itemType: data.itemType,
        quantity: data.quantity,
        status: data.status,
        totalAmount: data.totalAmount || 0,
        advanceAmount: data.advanceAmount || 0,
        balance: remainingAmount,
        remainingAmount: remainingAmount,
        deliveryDate: data.deliveryDate,
        notes: data.notes || '',
        assignedStaff: selectedStaff,
        requiredMaterials: selectedMaterials,
        designImages: [], // TODO: Upload images to storage
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        measurements: {},
        progress: {
          cutting: false,
          stitching: false,
          finishing: false
        },
        priority: 'normal'
      };

      // Add order to Firestore
      const orderRef = await addDoc(collection(db, 'orders'), orderData);

      // Create customer if not exists
      if (data.customerName && !customers.find(c => c.name === data.customerName)) {
        await addDoc(collection(db, 'customers'), {
          name: data.customerName,
          phone: data.customerPhone,
          email: data.customerEmail || '',
          createdAt: serverTimestamp(),
          orders: [orderRef.id]
        });
      } else {
        // Update existing customer with new order
        const existingCustomer = customers.find(c => c.name === data.customerName);
        if (existingCustomer) {
          await updateDoc(doc(db, 'customers', existingCustomer.id), {
            orders: [...(existingCustomer.orders || []), orderRef.id],
            updatedAt: serverTimestamp()
          });
        }
      }

      // Update inventory quantities for selected materials
      for (const materialId of selectedMaterials) {
        const material = materials.find(m => m.id === materialId);
        if (material && material.quantity > 0) {
          await updateDoc(doc(db, 'inventory', materialId), {
            quantity: material.quantity - 1,
            updatedAt: serverTimestamp()
          });
        }
      }

      toast({
        title: "Success",
        description: "Order created successfully",
      });

      reset();
      setSelectedStaff([]);
      setSelectedMaterials([]);
      setDesignImages([]);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "Error",
        description: "Failed to create order",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const itemTypes = [
    'Lehenga', 'Saree Blouse', 'Salwar Kameez', 'Kurti', 'Gown', 'Dress',
    'Shirt', 'Pants', 'Skirt', 'Jacket', 'Suit', 'Other'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    {...register('customerName', { required: 'Customer name is required' })}
                    placeholder="Start typing customer name..."
                    autoComplete="off"
                  />
                  {errors.customerName && (
                    <p className="text-sm text-red-600 mt-1">{errors.customerName.message}</p>
                  )}
                  
                  {/* Customer Suggestions */}
                  {showCustomerSuggestions && filteredCustomers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                      {filteredCustomers.slice(0, 5).map(customer => (
                        <div
                          key={customer.id}
                          className="p-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => selectCustomer(customer)}
                        >
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-gray-500">{customer.phone}</div>
                        </div>
                      ))}
                      <div
                        className="p-2 hover:bg-gray-100 cursor-pointer border-t text-blue-600"
                        onClick={() => setShowCustomerSuggestions(false)}
                      >
                        <Plus className="h-4 w-4 inline mr-1" />
                        Create New Customer
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="customerPhone">Phone Number *</Label>
                  <Input
                    id="customerPhone"
                    {...register('customerPhone', { required: 'Phone number is required' })}
                    placeholder="Phone number"
                  />
                  {errors.customerPhone && (
                    <p className="text-sm text-red-600 mt-1">{errors.customerPhone.message}</p>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="customerEmail">Email (Optional)</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  {...register('customerEmail')}
                  placeholder="Email address"
                />
              </div>
            </CardContent>
          </Card>

          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Order Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="itemType">Item Type *</Label>
                  <Select onValueChange={(value) => setValue('itemType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select item type" />
                    </SelectTrigger>
                    <SelectContent>
                      {itemTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.itemType && (
                    <p className="text-sm text-red-600 mt-1">Item type is required</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    {...register('quantity', { min: 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select defaultValue="received" onValueChange={(value) => setValue('status', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="received">Received</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="ready">Ready</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="orderDate">Order Date</Label>
                  <Input
                    id="orderDate"
                    type="date"
                    {...register('orderDate')}
                  />
                </div>
                <div>
                  <Label htmlFor="deliveryDate">Delivery Date *</Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    {...register('deliveryDate', { required: 'Delivery date is required' })}
                  />
                  {errors.deliveryDate && (
                    <p className="text-sm text-red-600 mt-1">{errors.deliveryDate.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="totalAmount">Total Amount (₹) *</Label>
                  <Input
                    id="totalAmount"
                    type="number"
                    min="0"
                    {...register('totalAmount', { required: 'Total amount is required', min: 0 })}
                    placeholder="0"
                  />
                  {errors.totalAmount && (
                    <p className="text-sm text-red-600 mt-1">{errors.totalAmount.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="advanceAmount">Advance Amount (₹)</Label>
                  <Input
                    id="advanceAmount"
                    type="number"
                    min="0"
                    {...register('advanceAmount', { min: 0 })}
                    placeholder="0"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assign Staff */}
          {staff.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Assign Staff
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {staff.map(member => (
                    <div
                      key={member.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedStaff.includes(member.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleStaffToggle(member.id)}
                    >
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedStaff.includes(member.id)}
                          onChange={() => handleStaffToggle(member.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{member.name}</div>
                          <div className="text-xs text-gray-500">{member.phone}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Required Materials */}
          {materials.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Required Materials
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-40 overflow-y-auto">
                  {materials.map(material => (
                    <div
                      key={material.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedMaterials.includes(material.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleMaterialToggle(material.id)}
                    >
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedMaterials.includes(material.id)}
                          onChange={() => handleMaterialToggle(material.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{material.name}</div>
                          <div className="text-xs text-gray-500">
                            Available: {material.quantity} {material.unit}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Design Images */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 mr-2" />
                Design Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-4 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> design images
                      </p>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>
                {designImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {designImages.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Design ${index + 1}`}
                          className="w-full h-20 object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                {...register('notes')}
                placeholder="Any special instructions or notes..."
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Footer Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              {loading ? 'Creating...' : 'Create Order'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOrderModal;
