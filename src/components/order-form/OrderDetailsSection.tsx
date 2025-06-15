
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { UseFormRegister, FieldErrors, UseFormSetValue } from 'react-hook-form';

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

interface OrderDetailsSectionProps {
  register: UseFormRegister<OrderFormData>;
  errors: FieldErrors<OrderFormData>;
  setValue: UseFormSetValue<OrderFormData>;
}

const OrderDetailsSection: React.FC<OrderDetailsSectionProps> = ({
  register,
  errors,
  setValue
}) => {
  const itemTypes = [
    'Lehenga', 'Saree Blouse', 'Salwar Kameez', 'Kurti', 'Gown', 'Dress',
    'Shirt', 'Pants', 'Skirt', 'Jacket', 'Suit', 'Other'
  ];

  return (
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
  );
};

export default OrderDetailsSection;
