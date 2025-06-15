
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Plus } from 'lucide-react';
import { UseFormRegister, FieldErrors, UseFormSetValue } from 'react-hook-form';

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
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

interface CustomerInfoSectionProps {
  register: UseFormRegister<OrderFormData>;
  errors: FieldErrors<OrderFormData>;
  setValue: UseFormSetValue<OrderFormData>;
  customerNameValue: string;
  customers: Customer[];
  showCustomerSuggestions: boolean;
  setShowCustomerSuggestions: (show: boolean) => void;
}

const CustomerInfoSection: React.FC<CustomerInfoSectionProps> = ({
  register,
  errors,
  setValue,
  customerNameValue,
  customers,
  showCustomerSuggestions,
  setShowCustomerSuggestions
}) => {
  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(customerNameValue?.toLowerCase() || '')
  );

  const selectCustomer = (customer: Customer) => {
    setValue('customerName', customer.name);
    setValue('customerPhone', customer.phone || '');
    setValue('customerEmail', customer.email || '');
    setShowCustomerSuggestions(false);
  };

  return (
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
  );
};

export default CustomerInfoSection;
