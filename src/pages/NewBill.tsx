
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Calculator, Save, CreditCard, QrCode } from 'lucide-react';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Bill, 
  BillItem, 
  BillBreakdown, 
  BankDetails,
  generateBillId,
  generateUPILink,
  calculateBillTotals,
  generateQRCodeDataURL,
  formatCurrency,
  calculateBillStatus
} from '@/utils/billingUtils';
import { toast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  items: any[];
}

const NewBill = () => {
  const { billId } = useParams();
  const navigate = useNavigate();
  const isEditing = !!billId;
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

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
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('amount');
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    accountName: 'Swetha\'s Couture',
    accountNumber: '1234567890',
    ifsc: 'HDFC0001234',
    bankName: 'HDFC Bank'
  });
  const [upiId, setUpiId] = useState('9849834102@ybl');

  // Calculated values
  const { subtotal, gstAmount, totalAmount, discountAmount } = calculateBillTotals(
    items, 
    breakdown, 
    gstPercent, 
    discount, 
    discountType
  );
  const balance = totalAmount - paidAmount;
  const status = calculateBillStatus(totalAmount, paidAmount);

  useEffect(() => {
    fetchCustomers();
    fetchOrders();
    if (isEditing) {
      fetchBill();
    }
  }, [isEditing, billId]);

  useEffect(() => {
    if (selectedCustomer && totalAmount > 0) {
      generateQRCode();
    }
  }, [selectedCustomer, totalAmount]);

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

  const fetchBill = async () => {
    if (!billId) return;
    
    try {
      const billDoc = await getDoc(doc(db, 'bills', billId));
      if (billDoc.exists()) {
        const billData = { id: billDoc.id, ...billDoc.data() } as Bill;
        
        // Populate form with existing bill data
        setCustomerId(billData.customerId);
        setOrderId(billData.orderId || '');
        setItems(billData.items);
        setBreakdown(billData.breakdown);
        setGstPercent(billData.gstPercent);
        setDiscount(billData.discount);
        setDiscountType(billData.discountType || 'amount');
        setPaidAmount(billData.paidAmount);
        setNotes(billData.notes || '');
        setBankDetails(billData.bankDetails);
        setUpiId(billData.upiId);
        
        // Set selected customer
        const customer = customers.find(c => c.id === billData.customerId);
        setSelectedCustomer(customer || null);
      }
    } catch (error) {
      console.error('Error fetching bill:', error);
      toast({
        title: "Error",
        description: "Failed to fetch bill details",
        variant: "destructive",
      });
    }
  };

  const generateQRCode = async () => {
    if (!selectedCustomer || totalAmount <= 0) return;
    
    const upiLink = generateUPILink(upiId, selectedCustomer.name, totalAmount, 'TEMP');
    try {
      const qrUrl = await generateQRCodeDataURL(upiLink);
      setQrCodeUrl(qrUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
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
    setOrderId(''); // Reset order selection
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

    if (items.every(item => !item.description.trim())) {
      toast({
        title: "Error",
        description: "Please add at least one item",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const billIdValue = isEditing ? (await getDoc(doc(db, 'bills', billId!))).data()?.billId : generateBillId();
      const upiLink = generateUPILink(upiId, selectedCustomer.name, totalAmount, billIdValue);
      const qrCodeUrl = await generateQRCodeDataURL(upiLink);

      const billData = {
        ...(isEditing ? {} : { billId: billIdValue }),
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        customerEmail: selectedCustomer.email || '',
        customerAddress: selectedCustomer.address || '',
        orderId: orderId || null,
        items: items.filter(item => item.description.trim()),
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
        date: serverTimestamp(),
        bankDetails,
        upiId,
        upiLink,
        qrCodeUrl,
        notes,
        updatedAt: serverTimestamp(),
        ...(isEditing ? {} : { createdAt: serverTimestamp() })
      };

      if (isEditing) {
        await updateDoc(doc(db, 'bills', billId!), billData);
        toast({
          title: "Success",
          description: `Bill updated successfully`,
        });
      } else {
        await addDoc(collection(db, 'bills'), billData);
        toast({
          title: "Success",
          description: `Bill ${billIdValue} created successfully`,
        });
      }

      navigate('/billing');
    } catch (error) {
      console.error('Error saving bill:', error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} bill`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayWithUPI = () => {
    if (!selectedCustomer || totalAmount <= 0) return;
    
    const upiLink = generateUPILink(upiId, selectedCustomer.name, totalAmount, 'TEMP');
    window.open(upiLink, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/billing')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Billing
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditing ? 'Edit Bill' : 'Create New Bill'}
          </h1>
          <p className="text-gray-500">
            {isEditing ? 'Update bill details and recalculate totals' : 'Generate a new bill for your customer'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer and Order Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer & Order Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Customer *</Label>
                <Select value={customerId} onValueChange={handleCustomerChange} disabled={isEditing && !!customerId}>
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
                {selectedCustomer && (
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    <p><strong>Phone:</strong> {selectedCustomer.phone}</p>
                    {selectedCustomer.email && <p><strong>Email:</strong> {selectedCustomer.email}</p>}
                    {selectedCustomer.address && <p><strong>Address:</strong> {selectedCustomer.address}</p>}
                  </div>
                )}
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
          </CardContent>
        </Card>

        {/* Items Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Bill Items</CardTitle>
              <Button type="button" onClick={addItem} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end p-4 border rounded-lg bg-gray-50">
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
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      value={item.amount}
                      readOnly
                      className="bg-white font-medium text-purple-600"
                    />
                  </div>
                  <div>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:bg-red-50"
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
            <CardTitle className="text-lg">Charges Breakdown</CardTitle>
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
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label>Stitching</Label>
                <Input
                  type="number"
                  value={breakdown.stitching}
                  onChange={(e) => updateBreakdown('stitching', Number(e.target.value))}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label>Accessories</Label>
                <Input
                  type="number"
                  value={breakdown.accessories}
                  onChange={(e) => updateBreakdown('accessories', Number(e.target.value))}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label>Customization</Label>
                <Input
                  type="number"
                  value={breakdown.customization}
                  onChange={(e) => updateBreakdown('customization', Number(e.target.value))}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label>Other Charges</Label>
                <Input
                  type="number"
                  value={breakdown.otherCharges}
                  onChange={(e) => updateBreakdown('otherCharges', Number(e.target.value))}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calculations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Calculator className="h-5 w-5 mr-2" />
                Calculations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>GST (%)</Label>
                    <Input
                      type="number"
                      value={gstPercent}
                      onChange={(e) => setGstPercent(Number(e.target.value))}
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Discount Type</Label>
                    <Select value={discountType} onValueChange={(value: 'amount' | 'percentage') => setDiscountType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="amount">Amount (₹)</SelectItem>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Discount {discountType === 'percentage' ? '(%)' : '(₹)'}</Label>
                    <Input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Paid Amount</Label>
                    <Input
                      type="number"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(Number(e.target.value))}
                      min="0"
                      max={totalAmount}
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>UPI ID</Label>
                  <Input
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="your-upi@bank"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional notes..."
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bill Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>GST ({gstPercent}%):</span>
                    <span>{formatCurrency(gstAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Discount:</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total Amount:</span>
                    <span className="text-purple-600">{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Paid Amount:</span>
                    <span className="text-green-600">{formatCurrency(paidAmount)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Balance:</span>
                    <span className={balance > 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatCurrency(balance)}
                    </span>
                  </div>
                </div>

                {selectedCustomer && totalAmount > 0 && (
                  <div className="space-y-3">
                    <Button
                      type="button"
                      onClick={handlePayWithUPI}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pay with UPI
                    </Button>
                    
                    {qrCodeUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowQRCode(true)}
                        className="w-full"
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        Show QR Code
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate('/billing')}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={loading || !selectedCustomer}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Saving...' : (isEditing ? 'Update Bill' : 'Create Bill')}
          </Button>
        </div>
      </form>

      {/* QR Code Modal */}
      {showQRCode && qrCodeUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium mb-4 text-center">UPI Payment QR Code</h3>
            <div className="text-center">
              <img src={qrCodeUrl} alt="UPI QR Code" className="mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-4">
                Scan this QR code with any UPI app to pay {formatCurrency(totalAmount)}
              </p>
              <Button onClick={() => setShowQRCode(false)} className="w-full">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewBill;
