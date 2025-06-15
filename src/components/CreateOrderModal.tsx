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

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editOrder?: any; // Order to edit (if provided)
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

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  editOrder 
}) => {
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<RequiredMaterial[]>([]);
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
      if (editOrder) {
        populateEditForm();
      }
    }
  }, [isOpen, editOrder]);

  const populateEditForm = () => {
    if (!editOrder) return;
    
    setValue('customerName', editOrder.customerName || '');
    setValue('customerPhone', editOrder.customerPhone || '');
    setValue('customerEmail', editOrder.customerEmail || '');
    setValue('itemType', editOrder.itemType || '');
    setValue('quantity', editOrder.quantity || 1);
    setValue('status', editOrder.status || 'received');
    setValue('orderDate', editOrder.orderDate || new Date().toISOString().split('T')[0]);
    setValue('deliveryDate', editOrder.deliveryDate || '');
    setValue('totalAmount', editOrder.totalAmount || 0);
    setValue('advanceAmount', editOrder.advanceAmount || 0);
    setValue('notes', editOrder.notes || '');
    
    setSelectedStaff(editOrder.assignedStaff || []);
    setSelectedMaterials(editOrder.requiredMaterials || []);
  };

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

  const onSubmit = async (data: OrderFormData) => {
    setLoading(true);
    try {
      const remainingAmount = (data.totalAmount || 0) - (data.advanceAmount || 0);

      const orderData = {
        orderId: editOrder?.orderNumber || `ORD-${Date.now().toString().slice(-6)}`,
        orderNumber: editOrder?.orderNumber || `ORD-${Date.now().toString().slice(-6)}`,
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
        requiredMaterials: selectedMaterials.map(m => m.id),
        designImages: [], // TODO: Upload images to storage
        updatedAt: serverTimestamp(),
        measurements: editOrder?.measurements || {},
        progress: editOrder?.progress || {
          cutting: false,
          stitching: false,
          finishing: false
        },
        priority: editOrder?.priority || 'normal'
      };

      if (editOrder) {
        // Update existing order
        await updateDoc(doc(db, 'orders', editOrder.id), orderData);
        toast({
          title: "Success",
          description: "Order updated successfully",
        });
      } else {
        // Create new order
        await addDoc(collection(db, 'orders'), {
          ...orderData,
          createdAt: serverTimestamp()
        });
        toast({
          title: "Success",
          description: "Order created successfully",
        });
      }

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
      for (const material of selectedMaterials) {
        const inventoryItem = materials.find(m => m.id === material.id);
        if (inventoryItem && inventoryItem.quantity >= material.quantity) {
          await updateDoc(doc(db, 'inventory', material.id), {
            quantity: inventoryItem.quantity - material.quantity,
            updatedAt: serverTimestamp()
          });
        }
      }

      reset();
      setSelectedStaff([]);
      setSelectedMaterials([]);
      setDesignImages([]);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving order:', error);
      toast({
        title: "Error",
        description: `Failed to ${editOrder ? 'update' : 'create'} order`,
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
          <DialogTitle>{editOrder ? 'Edit Order' : 'Create New Order'}</DialogTitle>
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

          {/* Order Details */}
          <OrderDetailsSection
            register={register}
            errors={errors}
            setValue={setValue}
          />

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
              {loading ? (editOrder ? 'Updating...' : 'Creating...') : (editOrder ? 'Update Order' : 'Create Order')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOrderModal;
