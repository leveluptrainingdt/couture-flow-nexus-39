
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { collection, addDoc, getDocs, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import CustomerInfoSection from '@/components/order-form/CustomerInfoSection';
import OrderDetailsSection from '@/components/order-form/OrderDetailsSection';
import StaffAssignment from '@/components/StaffAssignment';
import RequiredMaterials from '@/components/RequiredMaterials';
import DesignImagesSection from '@/components/order-form/DesignImagesSection';
import NotesSection from '@/components/order-form/NotesSection';
import MultipleItemsSection from '@/components/order-form/MultipleItemsSection';

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

interface RequiredMaterial {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

interface OrderItem {
  category: string;
  description: string;
  price: number;
  quantity: number;
  assignedPerson: string;
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

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ isOpen, onClose, onSuccess, editingOrder }) => {
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<RequiredMaterial[]>([]);
  const [designImages, setDesignImages] = useState<File[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [useMultipleItems, setUseMultipleItems] = useState(false);

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
    setValue('itemType', editingOrder.itemType || '');
    setValue('quantity', editingOrder.quantity || 1);
    setValue('status', editingOrder.status || 'received');
    setValue('orderDate', editingOrder.orderDate || new Date().toISOString().split('T')[0]);
    setValue('deliveryDate', editingOrder.deliveryDate || '');
    setValue('totalAmount', editingOrder.totalAmount || 0);
    setValue('advanceAmount', editingOrder.advanceAmount || 0);
    setValue('notes', editingOrder.notes || '');

    if (editingOrder.items && editingOrder.items.length > 0) {
      setOrderItems(editingOrder.items);
      setUseMultipleItems(true);
    }

    setSelectedStaff(editingOrder.assignedStaff || []);
    setSelectedMaterials(editingOrder.requiredMaterials || []);
  };

  const resetForm = () => {
    reset({
      status: 'received',
      orderDate: new Date().toISOString().split('T')[0],
      quantity: 1
    });
    setSelectedStaff([]);
    setSelectedMaterials([]);
    setDesignImages([]);
    setOrderItems([]);
    setUseMultipleItems(false);
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
    setLoading(true);
    try {
      // Calculate total from items if using multiple items
      let finalTotalAmount = data.totalAmount || 0;
      let finalQuantity = data.quantity || 1;

      if (useMultipleItems && orderItems.length > 0) {
        finalTotalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        finalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
      }

      const remainingAmount = finalTotalAmount - (data.advanceAmount || 0);

      const orderData = {
        orderId: editingOrder?.orderNumber || `ORD-${Date.now().toString().slice(-6)}`,
        orderNumber: editingOrder?.orderNumber || `ORD-${Date.now().toString().slice(-6)}`,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail || '',
        dressType: data.itemType,
        itemType: data.itemType,
        items: useMultipleItems ? orderItems : [],
        quantity: finalQuantity,
        status: data.status,
        totalAmount: finalTotalAmount,
        advanceAmount: data.advanceAmount || 0,
        balance: remainingAmount,
        remainingAmount: remainingAmount,
        deliveryDate: data.deliveryDate,
        notes: data.notes || '',
        assignedStaff: selectedStaff,
        requiredMaterials: selectedMaterials.map(m => m.id),
        designImages: [], // TODO: Upload images to storage
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
        // Create new order - add createdAt for new orders only
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
        for (const material of selectedMaterials) {
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
          description: "Order created successfully",
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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

          {/* Multiple Items or Single Order Details */}
          <MultipleItemsSection
            useMultipleItems={useMultipleItems}
            setUseMultipleItems={setUseMultipleItems}
            orderItems={orderItems}
            setOrderItems={setOrderItems}
            customerName={customerNameValue}
          />

          {!useMultipleItems && (
            <OrderDetailsSection
              register={register}
              errors={errors}
              setValue={setValue}
            />
          )}

          {/* Assign Staff */}
          {staff.length > 0 && (
            <StaffAssignment
              selectedStaff={selectedStaff}
              onChange={setSelectedStaff}
            />
          )}

          {/* Required Materials */}
          {materials.length > 0 && (
            <RequiredMaterials
              selectedMaterials={selectedMaterials}
              onChange={setSelectedMaterials}
            />
          )}

          {/* Design Images */}
          <DesignImagesSection
            designImages={designImages}
            setDesignImages={setDesignImages}
          />

          {/* Notes */}
          <NotesSection register={register} />

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
              {loading ? (editingOrder ? 'Updating...' : 'Creating...') : (editingOrder ? 'Update Order' : 'Create Order')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOrderModal;
