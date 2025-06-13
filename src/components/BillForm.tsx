import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { BillItem, BillBreakdown, BankDetails, calculateBillTotals, generateUPILink, generateQRCodeDataURL, Bill } from '@/utils/billingUtils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

interface BillFormProps {
  billId?: string;
  onSave: (bill: Bill) => void;
  onCancel: () => void;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

const BillForm = ({ billId, onSave, onCancel }: BillFormProps) => {
  const [billIdState, setBillIdState] = useState(billId || '');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState<string | undefined>('');
  const [customerAddress, setCustomerAddress] = useState<string | undefined>('');
  const [orderId, setOrderId] = useState<string | undefined>('');
  const [items, setItems] = useState<BillItem[]>([]);
  const [breakdown, setBreakdown] = useState<BillBreakdown>({
    fabric: 0,
    stitching: 0,
    accessories: 0,
    customization: 0,
    otherCharges: 0,
  });
  const [subtotal, setSubtotal] = useState(0);
  const [gstPercent, setGstPercent] = useState(5);
  const [gstAmount, setGstAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('amount');
  const [totalAmount, setTotalAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [balance, setBalance] = useState(0);
  const [status, setStatus] = useState<'paid' | 'partial' | 'unpaid'>('unpaid');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    accountName: '',
    accountNumber: '',
    ifsc: '',
    bankName: '',
  });
  const [upiId, setUpiId] = useState('');
  const [upiLink, setUpiLink] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [notes, setNotes] = useState<string | undefined>('');
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'customers'));
        const customerList: Customer[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          phone: doc.data().phone,
          email: doc.data().email,
          address: doc.data().address,
        }));
        setCustomers(customerList);
      } catch (error) {
        console.error('Error fetching customers:', error);
        toast({
          title: "Error Fetching Customers",
          description: "Failed to load customer data.",
          variant: "destructive",
        });
      }
    };

    fetchCustomers();
  }, []);

  useEffect(() => {
    if (customerId) {
      const selectedCustomer = customers.find(customer => customer.id === customerId);
      if (selectedCustomer) {
        setCustomerName(selectedCustomer.name);
        setCustomerPhone(selectedCustomer.phone);
        setCustomerEmail(selectedCustomer.email);
        setCustomerAddress(selectedCustomer.address);
      }
    } else {
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setCustomerAddress('');
    }
  }, [customerId, customers]);

  useEffect(() => {
    const { subtotal: newSubtotal, gstAmount: newGstAmount, totalAmount: newTotalAmount, discountAmount } = calculateBillTotals(items, breakdown, gstPercent, discount, discountType);
    setSubtotal(newSubtotal);
    setGstAmount(newGstAmount);
    setTotalAmount(newTotalAmount);
    setBalance(newTotalAmount - paidAmount);
  }, [items, breakdown, gstPercent, discount, discountType, paidAmount]);

  useEffect(() => {
    setBalance(totalAmount - paidAmount);
    setStatus(
      paidAmount >= totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid'
    );
  }, [totalAmount, paidAmount]);

  const generateUpiLinkAndQrCode = useCallback(async () => {
    if (upiId && customerName && totalAmount && billIdState) {
      const newUpiLink = generateUPILink(upiId, customerName, totalAmount, billIdState);
      setUpiLink(newUpiLink);
      try {
        const qrCodeDataURL = await generateQRCodeDataURL(newUpiLink);
        setQrCodeUrl(qrCodeDataURL);
      } catch (error) {
        console.error("Error generating QR code:", error);
        toast({
          title: "QR Code Generation Failed",
          description: "Could not generate QR code. Please check UPI ID and try again.",
          variant: "destructive",
        });
        setQrCodeUrl('');
      }
    } else {
      setUpiLink('');
      setQrCodeUrl('');
    }
  }, [upiId, customerName, totalAmount, billIdState]);

  useEffect(() => {
    generateUpiLinkAndQrCode();
  }, [generateUpiLinkAndQrCode]);

  const addItem = () => {
    setItems([...items, {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0,
      chargeType: ''
    }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: string, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item };
        if (field === 'quantity' || field === 'rate') {
          const numericValue = Number(value);
          updatedItem[field] = numericValue;
          updatedItem.amount = updatedItem.quantity * updatedItem.rate;
        } else {
          updatedItem[field] = value;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const addBredownCharge = (chargeType: keyof BillBreakdown, value: number) => {
    setBreakdown(prev => ({ ...prev, [chargeType]: value }));
  };

  const removeBreakdownCharge = (chargeType: keyof BillBreakdown) => {
    setBreakdown(prev => {
      const { [chargeType]: removed, ...rest } = prev;
      return rest;
    });
  };

  const updateBreakdownCharge = (chargeType: keyof BillBreakdown, value: number) => {
    setBreakdown(prev => ({ ...prev, [chargeType]: value }));
  };

  const calculateTotals = () => {
    const itemsTotal = items.reduce((sum, item) => sum + item.amount, 0);
    const breakdownTotal = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
    const subtotal = itemsTotal + breakdownTotal;
    const gstAmount = (subtotal * gstPercent) / 100;
    let discountAmount = discount;
    if (discountType === 'percentage') {
      discountAmount = (subtotal * discount) / 100;
    }
    const totalAmount = subtotal + gstAmount - discountAmount;
    setSubtotal(subtotal);
    setGstAmount(gstAmount);
    setTotalAmount(totalAmount);
    setBalance(totalAmount - paidAmount);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    calculateTotals();

    const billData: Bill = {
      id: billId || uuidv4(),
      billId: billIdState,
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      orderId,
      items,
      breakdown,
      subtotal,
      gstPercent,
      gstAmount,
      discount,
      discountType,
      totalAmount,
      paidAmount,
      balance,
      status,
      date,
      dueDate,
      bankDetails,
      upiId,
      upiLink,
      qrCodeUrl,
      notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    onSave(billData);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          {billId ? 'Edit Bill' : 'Create New Bill'}
        </h2>
        <p className="text-gray-600">
          Manage your billing details and customer information here.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer and Order Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="customer">Select Customer</Label>
            <Select onValueChange={setCustomerId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map(customer => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name} - {customer.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="orderId">Order ID (Optional)</Label>
            <Input
              id="orderId"
              type="text"
              placeholder="Enter order ID"
              value={orderId || ''}
              onChange={(e) => setOrderId(e.target.value)}
            />
          </div>
        </div>

        {/* Items Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Bill Items</h3>
            <Button
              type="button"
              onClick={addItem}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Input
                        type="text"
                        placeholder="Item description"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Input
                        type="number"
                        placeholder="Quantity"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Input
                        type="number"
                        placeholder="Rate"
                        value={item.rate}
                        onChange={(e) => updateItem(item.id, 'rate', e.target.value)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        variant="ghost"
                        size="icon"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Breakdown Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fabric">Fabric</Label>
              <Input
                type="number"
                id="fabric"
                placeholder="Fabric charges"
                value={breakdown.fabric}
                onChange={(e) => addBredownCharge('fabric', Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="stitching">Stitching</Label>
              <Input
                type="number"
                id="stitching"
                placeholder="Stitching charges"
                value={breakdown.stitching}
                onChange={(e) => addBredownCharge('stitching', Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="accessories">Accessories</Label>
              <Input
                type="number"
                id="accessories"
                placeholder="Accessories charges"
                value={breakdown.accessories}
                onChange={(e) => addBredownCharge('accessories', Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="customization">Customization</Label>
              <Input
                type="number"
                id="customization"
                placeholder="Customization charges"
                value={breakdown.customization}
                onChange={(e) => addBredownCharge('customization', Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="other">Other Charges</Label>
              <Input
                type="number"
                id="other"
                placeholder="Other charges"
                value={breakdown.otherCharges}
                onChange={(e) => addBredownCharge('otherCharges', Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Calculations */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Calculations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gst">GST (%)</Label>
              <Input
                type="number"
                id="gst"
                placeholder="GST percentage"
                value={gstPercent}
                onChange={(e) => setGstPercent(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="discount">Discount</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  id="discount"
                  placeholder="Discount amount"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
                <Select value={discountType} onValueChange={(value) => setDiscountType(value as 'amount' | 'percentage')}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amount">Amount</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="subtotal">Subtotal</Label>
              <Input
                type="text"
                id="subtotal"
                value={subtotal}
                readOnly
              />
            </div>
            <div>
              <Label htmlFor="total">Total</Label>
              <Input
                type="text"
                id="total"
                value={totalAmount}
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="paid">Paid Amount</Label>
              <Input
                type="number"
                id="paid"
                placeholder="Paid amount"
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="balance">Balance</Label>
              <Input
                type="text"
                id="balance"
                value={balance}
                readOnly
              />
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <DatePicker date={date} onDateChange={setDate} />
            </div>
            <div>
              <Label htmlFor="due-date">Due Date</Label>
              <DatePicker date={dueDate} onDateChange={setDueDate} />
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Bank Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                type="text"
                id="accountName"
                placeholder="Account name"
                value={bankDetails.accountName}
                onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                type="text"
                id="accountNumber"
                placeholder="Account number"
                value={bankDetails.accountNumber}
                onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="ifsc">IFSC</Label>
              <Input
                type="text"
                id="ifsc"
                placeholder="IFSC code"
                value={bankDetails.ifsc}
                onChange={(e) => setBankDetails({ ...bankDetails, ifsc: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                type="text"
                id="bankName"
                placeholder="Bank name"
                value={bankDetails.bankName}
                onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* UPI Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">UPI Details</h3>
          <div>
            <Label htmlFor="upiId">UPI ID</Label>
            <Input
              type="text"
              id="upiId"
              placeholder="Enter UPI ID"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
            />
          </div>
          {qrCodeUrl && (
            <div>
              <img src={qrCodeUrl} alt="UPI QR Code" className="max-w-xs" />
            </div>
          )}
          {upiLink && (
            <div>
              <a href={upiLink} target="_blank" rel="noopener noreferrer" className="text-blue-500">
                Pay via UPI
              </a>
            </div>
          )}
        </div>

        {/* Notes Section */}
        <div className="space-y-4">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Input
            id="notes"
            type="text"
            placeholder="Enter any notes"
            value={notes || ''}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Form Buttons */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
          >
            Save Bill
          </Button>
        </div>
      </form>
    </div>
  );
};

export default BillForm;
