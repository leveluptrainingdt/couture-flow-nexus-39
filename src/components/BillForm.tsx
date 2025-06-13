
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Calculator } from 'lucide-react';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Bill, 
  BillItem, 
  BillBreakdown, 
  BankDetails,
  generateBillId,
  generateUPILink,
  calculateBillTotals,
  generateQRCodeDataURL
} from '@/utils/billingUtils';
import { toast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  items: any[];
}

interface BillFormProps {
  bill?: Bill;
  onSuccess: () => void;
}

const BillForm: React.FC<BillFormProps> = ({ bill, onSuccess }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [items, setItems] = useState<BillItem[]>([
    { id: '1', description: '', quantity: 1, rate: 0, amount: 0 }
  ]);
  const [breakdown, setBreakdown] = useState<BillBreakdown>({
    fabric: 0,
    stitching: 0,
    accessories: 0,
    customization: 0,
    otherCharges: 0
  });
  const [gstPercent, setGstPercent] = useState(18);
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    accountName: 'Swetha\'s Couture',
    accountNumber: '1234567890',
    ifsc: 'HDFC0001234',
    bankName: 'HDFC Bank'
  });
  const [upiId, setUpiId] = useState('9849834102@ybl');

  // Calculated values
  const { subtotal, gstAmount, totalAmount } = calculateBillTotals(items, breakdown, gstPercent, discount);
  const balance = totalAmount - paidAmount;

  useEffect(() => {
    fetchCustomers();
    fetchOrders();
  }, []);

  useEffect(() => {
    if (bill) {
      // Populate form with existing bill data
      setCustomerId(bill.customerId);
      setOrderId(bill.orderId || '');
      setItems(bill.items);
      setBreakdown(bill.breakdown);
      setGstPercent(bill.gstPercent);
      setDiscount(bill.discount);
      setPaidAmount(bill.paidAmount);
      setBankDetails(bill.bankDetails);
      setUpiId(bill.upiId);
    }
  }, [bill]);

  const fetchCustomers = async () => {
    try {
      const customersSnapshot = await getDocs(collection(db, 'customers'));
      const customersData = customersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Customer[];
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const ordersSnapshot = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')));
      const ordersData = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const handleCustomerChange = (customerId: string) => {
    setCustomerId(customerId);
    const customer = customers.find(c => c.id === customerId);
    setSelectedCustomer(customer || null);
    
    // Filter orders for this customer
    const customerOrders = orders.filter(order => 
      order.customerName === customer?.name
    );
    // You might want to update this to use a better matching criteria
  };

  const handleOrderChange = (orderId: string) => {
    setOrderId(orderId);
    const order = orders.find(o => o.id === orderId);
    setSelectedOrder(order || null);
    
    // Auto-populate items from order if available
    if (order && order.items) {
      const orderItems: BillItem[] = order.items.map((item, index) => ({
        id: String(index + 1),
        description: item.type || item.description || 'Item',
        quantity: item.quantity || 1,
        rate: 0, // This needs to be set manually
        amount: 0
      }));
      setItems(orderItems);
    }
  };

  const addItem = () => {
    const newItem: BillItem = {
      id: String(items.length + 1),
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof BillItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          updatedItem.amount = updatedItem.quantity * updatedItem.rate;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const updateBreakdown = (field: keyof BillBreakdown, value: number) => {
    setBreakdown(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer) {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Generate bill ID
      const billsSnapshot = await getDocs(collection(db, 'bills'));
      const billNumber = billsSnapshot.size + 1001; // Start from BILL1001
      const billId = generateBillId(billNumber);

      // Generate UPI link and QR code
      const upiLink = generateUPILink(upiId, selectedCustomer.name, totalAmount, billId);
      const qrCodeUrl = generateQRCodeDataURL(upiLink);

      const billData = {
        billId,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        customerEmail: selectedCustomer.email || '',
        customerAddress: selectedCustomer.address || '',
        orderId: orderId || null,
        items,
        breakdown,
        subtotal,
        gstPercent,
        gstAmount,
        discount,
        totalAmount,
        paidAmount,
        balance,
        date: serverTimestamp(),
        bankDetails,
        upiId,
        upiLink,
        qrCodeUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'bills'), billData);

      toast({
        title: "Success",
        description: `Bill ${billId} created successfully`,
      });

      onSuccess();
    } catch (error) {
      console.error('Error creating bill:', error);
      toast({
        title: "Error",
        description: "Failed to create bill",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer and Order Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Customer *</Label>
          <Select value={customerId} onValueChange={handleCustomerChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select customer" />
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

        <div className="space-y-2">
          <Label>Order (Optional)</Label>
          <Select value={orderId} onValueChange={handleOrderChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select order" />
            </SelectTrigger>
            <SelectContent>
              {orders.filter(order => 
                !selectedCustomer || order.customerName === selectedCustomer.name
              ).map(order => (
                <SelectItem key={order.id} value={order.id}>
                  #{order.orderNumber} - {order.customerName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Items Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Bill Items</CardTitle>
            <Button type="button" onClick={addItem} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    placeholder="Item description"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Qty</Label>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rate</Label>
                  <Input
                    type="number"
                    value={item.rate}
                    onChange={(e) => updateItem(item.id, 'rate', Number(e.target.value))}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    value={item.amount}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Breakdown Section */}
      <Card>
        <CardHeader>
          <CardTitle>Charges Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Fabric</Label>
              <Input
                type="number"
                value={breakdown.fabric}
                onChange={(e) => updateBreakdown('fabric', Number(e.target.value))}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Stitching</Label>
              <Input
                type="number"
                value={breakdown.stitching}
                onChange={(e) => updateBreakdown('stitching', Number(e.target.value))}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Accessories</Label>
              <Input
                type="number"
                value={breakdown.accessories}
                onChange={(e) => updateBreakdown('accessories', Number(e.target.value))}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Customization</Label>
              <Input
                type="number"
                value={breakdown.customization}
                onChange={(e) => updateBreakdown('customization', Number(e.target.value))}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Other Charges</Label>
              <Input
                type="number"
                value={breakdown.otherCharges}
                onChange={(e) => updateBreakdown('otherCharges', Number(e.target.value))}
                min="0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calculations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calculator className="h-5 w-5 mr-2" />
            Calculations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>GST (%)</Label>
                <Input
                  type="number"
                  value={gstPercent}
                  onChange={(e) => setGstPercent(Number(e.target.value))}
                  min="0"
                  max="100"
                />
              </div>
              <div className="space-y-2">
                <Label>Discount</Label>
                <Input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  min="0"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Paid Amount</Label>
                <Input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label>UPI ID</Label>
                <Input
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="your-upi@bank"
                />
              </div>
            </div>
            <div className="space-y-4 text-right">
              <div className="text-sm">
                <div>Subtotal: ₹{subtotal.toFixed(2)}</div>
                <div>GST ({gstPercent}%): ₹{gstAmount.toFixed(2)}</div>
                <div>Discount: -₹{discount.toFixed(2)}</div>
                <div className="text-lg font-bold border-t pt-2">
                  Total: ₹{totalAmount.toFixed(2)}
                </div>
                <div className="text-lg font-bold text-red-600">
                  Balance: ₹{balance.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : bill ? 'Update Bill' : 'Create Bill'}
        </Button>
      </div>
    </form>
  );
};

export default BillForm;
