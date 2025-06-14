
import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, QrCode, MessageSquare, Calculator } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { 
  Bill, 
  BillItem, 
  BillBreakdown, 
  BankDetails,
  generateBillId,
  generateUPILink,
  calculateBillTotals,
  generateQRCodeDataURL,
  calculateBillStatus,
  formatCurrency
} from '@/utils/billingUtils';
import CustomerAutoSuggest from '@/components/CustomerAutoSuggest';
import InventoryItemSelector from '@/components/InventoryItemSelector';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

interface Order {
  id: string;
  orderId: string;
  customerName: string;
  items: any[];
  totalAmount: number;
}

interface InventoryItem {
  id: string;
  itemName: string;
  stockQty: number;
  category?: string;
  unitPrice?: number;
}

interface BillFormAdvancedProps {
  billId?: string;
  bill?: Bill | null;
  onSave: (billData: Bill) => void;
  onCancel: () => void;
  onSuccess?: () => void;
}

const BillFormAdvanced: React.FC<BillFormAdvancedProps> = ({
  billId,
  bill,
  onSave,
  onCancel,
  onSuccess
}) => {
  // Form state
  const [formData, setFormData] = useState<Partial<Bill>>({
    billId: generateBillId(),
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    orderId: '',
    items: [],
    breakdown: {
      fabric: 0,
      stitching: 0,
      accessories: 0,
      customization: 0,
      otherCharges: 0
    },
    subtotal: 0,
    gstPercent: 0,
    gstAmount: 0,
    discount: 0,
    discountType: 'amount',
    totalAmount: 0,
    paidAmount: 0,
    balance: 0,
    status: 'unpaid',
    date: new Date(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    bankDetails: {
      accountName: 'Swetha\'s Couture',
      accountNumber: '1234567890',
      ifsc: 'HDFC0001234',
      bankName: 'HDFC Bank'
    },
    upiId: 'swethascouture@paytm',
    qrAmount: 0,
    notes: ''
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [chargeTypes, setChargeTypes] = useState<string[]>([
    'Fabric Cost', 'Stitching Charges', 'Accessories', 'Customization', 'Delivery Charges', 'Other'
  ]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [upiLink, setUpiLink] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    fetchCustomers();
    fetchOrders();
    fetchInventory();
    if (bill) {
      setFormData(bill);
      setSelectedCustomer({
        id: bill.customerId || '',
        name: bill.customerName,
        phone: bill.customerPhone,
        email: bill.customerEmail || '',
        address: bill.customerAddress || ''
      });
    }
  }, [bill]);

  const fetchCustomers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'customers'));
      const customerList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Customer[];
      setCustomers(customerList);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const snapshot = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')));
      const orderList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(orderList);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchInventory = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'inventory'));
      const inventoryList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryItem[];
      setInventory(inventoryList);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  // Calculate totals whenever relevant fields change
  useEffect(() => {
    const { subtotal, gstAmount, totalAmount } = calculateBillTotals(
      formData.items || [],
      formData.breakdown || { fabric: 0, stitching: 0, accessories: 0, customization: 0, otherCharges: 0 },
      formData.gstPercent || 0,
      formData.discount || 0,
      formData.discountType || 'amount'
    );

    const balance = totalAmount - (formData.paidAmount || 0);
    const status = calculateBillStatus(totalAmount, formData.paidAmount || 0);

    setFormData(prev => ({
      ...prev,
      subtotal,
      gstAmount,
      totalAmount,
      balance,
      status,
      qrAmount: prev.qrAmount || balance
    }));
  }, [
    formData.items,
    formData.breakdown,
    formData.gstPercent,
    formData.discount,
    formData.discountType,
    formData.paidAmount
  ]);

  // Generate UPI link and QR code
  const generateUpiAndQr = useCallback(async () => {
    if (formData.upiId && formData.customerName && formData.qrAmount && formData.billId) {
      const newUpiLink = generateUPILink(
        formData.upiId,
        formData.customerName,
        formData.qrAmount,
        formData.billId
      );
      setUpiLink(newUpiLink);

      try {
        const qrUrl = await generateQRCodeDataURL(newUpiLink);
        setQrCodeUrl(qrUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
        toast({
          title: "QR Code Generation Failed",
          description: "Could not generate QR code. Please try again.",
          variant: "destructive"
        });
      }
    }
  }, [formData.upiId, formData.customerName, formData.qrAmount, formData.billId]);

  useEffect(() => {
    generateUpiAndQr();
  }, [generateUpiAndQr]);

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({
      ...prev,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email || '',
      customerAddress: customer.address || ''
    }));
    
    // Filter orders for this customer
    const customerOrders = orders.filter(order => 
      order.customerName.toLowerCase() === customer.name.toLowerCase()
    );
  };

  const handleOrderSelect = (orderId: string) => {
    const selectedOrder = orders.find(order => order.id === orderId);
    if (selectedOrder) {
      setFormData(prev => ({
        ...prev,
        orderId: selectedOrder.orderId,
        items: selectedOrder.items.map(item => ({
          id: uuidv4(),
          description: item.description || item.type,
          quantity: item.quantity || 1,
          rate: item.rate || 0,
          amount: item.amount || 0,
          chargeType: 'Order Item'
        }))
      }));
    }
  };

  const addLineItem = () => {
    const newItem: BillItem = {
      id: uuidv4(),
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0,
      chargeType: 'Other'
    };
    setFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), newItem]
    }));
  };

  const updateLineItem = (id: string, field: keyof BillItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items?.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'quantity' || field === 'rate') {
            updatedItem.amount = updatedItem.quantity * updatedItem.rate;
          }
          return updatedItem;
        }
        return item;
      }) || []
    }));
  };

  const removeLineItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items?.filter(item => item.id !== id) || []
    }));
  };

  const updateBreakdown = (field: keyof BillBreakdown, value: number) => {
    setFormData(prev => ({
      ...prev,
      breakdown: {
        ...prev.breakdown!,
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const billData: Bill = {
        ...formData,
        id: billId || uuidv4(),
        billId: formData.billId!,
        customerName: formData.customerName!,
        customerPhone: formData.customerPhone!,
        items: formData.items!,
        breakdown: formData.breakdown!,
        subtotal: formData.subtotal!,
        gstPercent: formData.gstPercent!,
        gstAmount: formData.gstAmount!,
        discount: formData.discount!,
        totalAmount: formData.totalAmount!,
        paidAmount: formData.paidAmount!,
        balance: formData.balance!,
        status: formData.status!,
        date: formData.date!,
        bankDetails: formData.bankDetails!,
        upiLink,
        qrCodeUrl,
        createdAt: bill?.createdAt || new Date(),
        updatedAt: new Date()
      };

      await onSave(billData);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving bill:', error);
      toast({
        title: "Error",
        description: "Failed to save bill. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-2xl">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          {bill ? 'Edit Bill' : 'Create New Bill'}
        </h1>
        <p className="text-purple-100">
          {bill ? 'Update bill details and recalculate totals' : 'Generate a professional bill for your customer'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Order Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Customer & Order Details
              {bill && !isEditingCustomer && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingCustomer(true)}
                >
                  Change Customer
                </Button>
              )}
            </CardTitle>
            {bill && !isEditingCustomer && (
              <p className="text-sm text-gray-600">
                You are editing Bill #{formData.billId}. Customer details are locked.
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {(!bill || isEditingCustomer) ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <CustomerAutoSuggest
                    value={formData.customerName || ''}
                    onChange={(value) => setFormData(prev => ({ ...prev, customerName: value }))}
                    onCustomerSelect={handleCustomerSelect}
                    placeholder="Type customer name..."
                  />
                </div>
                <div>
                  <Label>Select Order (Optional)</Label>
                  <Select onValueChange={handleOrderSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Link to existing order" />
                    </SelectTrigger>
                    <SelectContent>
                      {orders
                        .filter(order => 
                          !selectedCustomer || 
                          order.customerName.toLowerCase() === selectedCustomer.name.toLowerCase()
                        )
                        .map(order => (
                        <SelectItem key={order.id} value={order.id}>
                          {order.orderId} - {formatCurrency(order.totalAmount)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <Label>Customer Name</Label>
                  <Input value={formData.customerName} readOnly className="bg-gray-50" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={formData.customerPhone} readOnly className="bg-gray-50" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <Label>Phone</Label>
                <Input
                  value={formData.customerPhone || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                  placeholder="Customer phone"
                  required
                />
              </div>
              <div>
                <Label>Email (Optional)</Label>
                <Input
                  value={formData.customerEmail || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                  placeholder="Customer email"
                  type="email"
                />
              </div>
            </div>

            <div>
              <Label>Address (Optional)</Label>
              <Input
                value={formData.customerAddress || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, customerAddress: e.target.value }))}
                placeholder="Customer address"
              />
            </div>
          </CardContent>
        </Card>

        {/* Line Items Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Line Items
              <Button type="button" onClick={addLineItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {formData.items?.map((item, index) => (
                <div key={item.id} className="grid grid-cols-1 lg:grid-cols-6 gap-4 p-4 border rounded-lg">
                  <div className="lg:col-span-2">
                    <Label>Description</Label>
                    <InventoryItemSelector
                      inventory={inventory}
                      value={item.description}
                      onValueChange={(value) => updateLineItem(item.id, 'description', value)}
                      onInventoryUpdate={fetchInventory}
                      quantity={item.quantity}
                    />
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, 'quantity', Number(e.target.value))}
                      min="1"
                    />
                  </div>
                  <div>
                    <Label>Rate (₹)</Label>
                    <Input
                      type="number"
                      value={item.rate}
                      onChange={(e) => updateLineItem(item.id, 'rate', Number(e.target.value))}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label>Amount (₹)</Label>
                    <Input
                      value={formatCurrency(item.amount)}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeLineItem(item.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {!formData.items?.length && (
                <div className="text-center py-8 text-gray-500">
                  No items added yet. Click "Add Item" to get started.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Breakdown Section */}
        <Card>
          <CardHeader>
            <CardTitle>Charges Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>Fabric (₹)</Label>
                <Input
                  type="number"
                  value={formData.breakdown?.fabric || 0}
                  onChange={(e) => updateBreakdown('fabric', Number(e.target.value))}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <Label>Stitching (₹)</Label>
                <Input
                  type="number"
                  value={formData.breakdown?.stitching || 0}
                  onChange={(e) => updateBreakdown('stitching', Number(e.target.value))}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <Label>Accessories (₹)</Label>
                <Input
                  type="number"
                  value={formData.breakdown?.accessories || 0}
                  onChange={(e) => updateBreakdown('accessories', Number(e.target.value))}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <Label>Customization (₹)</Label>
                <Input
                  type="number"
                  value={formData.breakdown?.customization || 0}
                  onChange={(e) => updateBreakdown('customization', Number(e.target.value))}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <Label>Other Charges (₹)</Label>
                <Input
                  type="number"
                  value={formData.breakdown?.otherCharges || 0}
                  onChange={(e) => updateBreakdown('otherCharges', Number(e.target.value))}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Calculation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>GST % (Optional)</Label>
                  <Input
                    type="number"
                    value={formData.gstPercent || 0}
                    onChange={(e) => setFormData(prev => ({ ...prev, gstPercent: Number(e.target.value) }))}
                    min="0"
                    max="30"
                    step="0.1"
                  />
                </div>
                <div>
                  <Label>Discount (₹)</Label>
                  <Input
                    type="number"
                    value={formData.discount || 0}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount: Number(e.target.value) }))}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <Label>Paid Amount (₹)</Label>
                <Input
                  type="number"
                  value={formData.paidAmount || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, paidAmount: Number(e.target.value) }))}
                  min="0"
                  max={formData.totalAmount}
                  step="0.01"
                />
                {(formData.paidAmount || 0) > (formData.totalAmount || 0) && (
                  <p className="text-red-600 text-sm mt-1">
                    Paid amount cannot exceed total amount
                  </p>
                )}
              </div>

              <div>
                <Label>QR Code Amount (₹)</Label>
                <Input
                  type="number"
                  value={formData.qrAmount || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, qrAmount: Number(e.target.value) }))}
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Amount encoded in QR code. Default is the balance amount.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Right: Summary & QR */}
          <Card>
            <CardHeader>
              <CardTitle>Bill Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(formData.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST ({formData.gstPercent || 0}%):</span>
                  <span>{formatCurrency(formData.gstAmount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-{formatCurrency(formData.discount || 0)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Amount:</span>
                  <span className="text-purple-600">{formatCurrency(formData.totalAmount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid Amount:</span>
                  <span className="text-green-600">{formatCurrency(formData.paidAmount || 0)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Balance:</span>
                  <span className={(formData.balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}>
                    {formatCurrency(formData.balance || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Status:</span>
                  <Badge 
                    className={
                      formData.status === 'paid' ? 'bg-green-100 text-green-800' :
                      formData.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }
                  >
                    {formData.status?.charAt(0).toUpperCase() + formData.status?.slice(1)}
                  </Badge>
                </div>
              </div>

              {qrCodeUrl && (
                <div className="mt-6 text-center">
                  <Label className="text-sm font-medium">UPI QR Code</Label>
                  <div className="mt-2 p-4 bg-white border rounded-lg">
                    <img src={qrCodeUrl} alt="UPI QR Code" className="w-32 h-32 mx-auto" />
                    <p className="text-xs text-gray-500 mt-2">
                      Scan to pay ₹{formData.qrAmount || 0}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="sm:order-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !formData.customerName || !formData.customerPhone}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 sm:order-2"
          >
            {loading ? 'Saving...' : (bill ? 'Update Bill' : 'Create Bill')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default BillFormAdvanced;
