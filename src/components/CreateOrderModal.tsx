
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { collection, addDoc, getDocs, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import CustomerInfoSection from '@/components/order-form/CustomerInfoSection';
import MultipleOrderItemsSection from '@/components/order-form/MultipleOrderItemsSection';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingOrder?: any;
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

interface OrderItem {
  madeFor: string;
  category: string;
  description: string;
  price: number;
  quantity: number;
  status: string;
  orderDate: string;
  deliveryDate: string;
  assignedStaff: string[];
  requiredMaterials: { id: string; name: string; quantity: number; unit: string; }[];
  designImages: string[];
  notes: string;
}

interface OrderFormData {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
}

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ isOpen, onClose, onSuccess, editingOrder }) => {
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<OrderFormData>();

  const customerNameValue = watch('customerName');

  useEffect(() => {
    if (isOpen) {
      fetchData();
      if (editingOrder) {
        populateEditForm();
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingOrder]);

  useEffect(() => {
    if (customerNameValue && customerNameValue.length > 1) {
      setShowCustomerSuggestions(true);
    } else {
      setShowCustomerSuggestions(false);
    }
  }, [customerNameValue]);

  const populateEditForm = () => {
    if (!editingOrder) return;

    setValue('customerName', editingOrder.customerName || '');
    setValue('customerPhone', editingOrder.customerPhone || '');
    setValue('customerEmail', editingOrder.customerEmail || '');

    if (editingOrder.items && editingOrder.items.length > 0) {
      setOrderItems(editingOrder.items);
    } else {
      // Convert single order to item format for backward compatibility
      const singleItem: OrderItem = {
        madeFor: editingOrder.customerName || '',
        category: editingOrder.itemType || '',
        description: '',
        price: editingOrder.totalAmount || 0,
        quantity: editingOrder.quantity || 1,
        status: editingOrder.status || 'received',
        orderDate: editingOrder.orderDate || new Date().toISOString().split('T')[0],
        deliveryDate: editingOrder.deliveryDate || '',
        assignedStaff: editingOrder.assignedStaff || [],
        requiredMaterials: editingOrder.requiredMaterials || [],
        designImages: editingOrder.designImages || [],
        notes: editingOrder.notes || ''
      };
      setOrderItems([singleItem]);
    }
  };

  const resetForm = () => {
    reset();
    setOrderItems([{
      madeFor: '',
      category: '',
      description: '',
      price: 0,
      quantity: 1,
      status: 'received',
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: '',
      assignedStaff: [],
      requiredMaterials: [],
      designImages: [],
      notes: ''
    }]);
  };

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

  const onSubmit = async (data: OrderFormData) => {
    if (orderItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the order",
        variant: "destructive",
      });
      return;
    }

    // Validate each item
    for (let i = 0; i < orderItems.length; i++) {
      const item = orderItems[i];
      if (!item.madeFor || !item.category || !item.deliveryDate || item.price <= 0) {
        toast({
          title: "Error",
          description: `Please complete all required fields for item ${i + 1}`,
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      const totalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalAdvance = orderItems.reduce((sum, item) => {
        // For simplicity, we'll distribute advance proportionally
        return sum;
      }, 0);

      const orderData = {
        orderId: editingOrder?.orderNumber || `ORD-${Date.now().toString().slice(-6)}`,
        orderNumber: editingOrder?.orderNumber || `ORD-${Date.now().toString().slice(-6)}`,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail || '',
        items: orderItems,
        itemType: orderItems.length === 1 ? orderItems[0].category : 'Multiple Items',
        quantity: totalQuantity,
        status: orderItems[0]?.status || 'received',
        totalAmount: totalAmount,
        advanceAmount: 0, // To be set later via payment tracking
        balance: totalAmount,
        remainingAmount: totalAmount,
        orderDate: orderItems[0]?.orderDate || new Date().toISOString().split('T')[0],
        deliveryDate: orderItems[0]?.deliveryDate || '',
        notes: orderItems.map(item => item.notes).filter(Boolean).join('\n'),
        assignedStaff: [...new Set(orderItems.flatMap(item => item.assignedStaff))],
        requiredMaterials: [...new Set(orderItems.flatMap(item => item.requiredMaterials.map(m => m.id)))],
        designImages: [...new Set(orderItems.flatMap(item => item.designImages))],
        updatedAt: serverTimestamp(),
        measurements: editingOrder?.measurements || {},
        progress: editingOrder?.progress || {
          cutting: false,
          stitching: false,
          finishing: false
        },
        priority: editingOrder?.priority || 'normal'
      };

      if (editingOrder) {
        // Update existing order
        await updateDoc(doc(db, 'orders', editingOrder.id), orderData);
        toast({
          title: "Success",
          description: "Order updated successfully",
        });
      } else {
        // Create new order
        const newOrderData = {
          ...orderData,
          createdAt: serverTimestamp()
        };
        
        const docRef = await addDoc(collection(db, 'orders'), newOrderData);

        // Create customer if not exists
        if (data.customerName && !customers.find(c => c.name === data.customerName)) {
          await addDoc(collection(db, 'customers'), {
            name: data.customerName,
            phone: data.customerPhone,
            email: data.customerEmail || '',
            createdAt: serverTimestamp(),
            orders: [docRef.id]
          });
        } else {
          // Update existing customer with new order
          const existingCustomer = customers.find(c => c.name === data.customerName);
          if (existingCustomer) {
            await updateDoc(doc(db, 'customers', existingCustomer.id), {
              orders: [...(existingCustomer.orders || []), docRef.id],
              updatedAt: serverTimestamp()
            });
          }
        }

        // Update inventory quantities for selected materials
        const allMaterials = orderItems.flatMap(item => item.requiredMaterials);
        for (const material of allMaterials) {
          const inventoryItem = materials.find(m => m.id === material.id);
          if (inventoryItem && inventoryItem.quantity >= material.quantity) {
            await updateDoc(doc(db, 'inventory', material.id), {
              quantity: inventoryItem.quantity - material.quantity,
              updatedAt: serverTimestamp()
            });
          }
        }

        toast({
          title: "Success",
          description: `Order created successfully with ${orderItems.length} item${orderItems.length > 1 ? 's' : ''}`,
        });
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving order:', error);
      toast({
        title: "Error",
        description: editingOrder ? "Failed to update order" : "Failed to create order",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingOrder ? 'Edit Order' : 'Create New Order'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Customer Information */}
          <CustomerInfoSection
            register={register}
            errors={errors}
            setValue={setValue}
            customerNameValue={customerNameValue}
            customers={customers}
            showCustomerSuggestions={showCustomerSuggestions}
            setShowCustomerSuggestions={setShowCustomerSuggestions}
          />

          {/* Multiple Order Items */}
          <MultipleOrderItemsSection
            orderItems={orderItems}
            setOrderItems={setOrderItems}
            customerName={customerNameValue}
            staff={staff}
            materials={materials}
          />

          {/* Footer Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || orderItems.length === 0}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              {loading ? (editingOrder ? 'Updating...' : 'Creating...') : (editingOrder ? 'Update Order' : 'Create Order')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOrderModal;
