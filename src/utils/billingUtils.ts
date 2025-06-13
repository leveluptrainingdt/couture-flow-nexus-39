
export interface BillItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface BillBreakdown {
  fabric: number;
  stitching: number;
  accessories: number;
  customization: number;
  otherCharges: number;
}

export interface BankDetails {
  accountName: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
}

export interface Bill {
  id: string;
  billId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  orderId?: string;
  items: BillItem[];
  breakdown: BillBreakdown;
  subtotal: number;
  gstPercent: number;
  gstAmount: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  date: any;
  bankDetails: BankDetails;
  upiId: string;
  upiLink: string;
  qrCodeUrl: string;
  createdAt: any;
  updatedAt: any;
}

export const generateBillId = (billNumber: number): string => {
  return `BILL${String(billNumber).padStart(4, '0')}`;
};

export const generateUPILink = (
  upiId: string,
  customerName: string,
  amount: number,
  billId: string
): string => {
  const encodedNote = encodeURIComponent(`Bill ${billId}`);
  return `upi://pay?pa=${upiId}&pn=${customerName}&am=${amount}&cu=INR&tn=${encodedNote}`;
};

export const calculateBillTotals = (
  items: BillItem[],
  breakdown: BillBreakdown,
  gstPercent: number,
  discount: number
) => {
  const itemsTotal = items.reduce((sum, item) => sum + item.amount, 0);
  const breakdownTotal = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  const subtotal = itemsTotal + breakdownTotal;
  const gstAmount = (subtotal * gstPercent) / 100;
  const totalAmount = subtotal + gstAmount - discount;
  
  return {
    subtotal,
    gstAmount,
    totalAmount
  };
};

export const generateQRCodeDataURL = (upiLink: string): string => {
  // This is a simple QR code generation - in production, you'd use a proper QR library
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 200;
  canvas.height = 200;
  
  if (ctx) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Arial';
    ctx.fillText('QR Code', 10, 100);
    ctx.fillText('(UPI Payment)', 10, 120);
  }
  
  return canvas.toDataURL();
};

export const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN')}`;
};

export const getBillStatusColor = (balance: number): string => {
  if (balance <= 0) return 'text-green-600';
  return 'text-red-600';
};

export const generateWhatsAppMessage = (
  template: 'billDelivery' | 'paymentReminder',
  customerName: string,
  billId: string,
  totalAmount: number,
  balance: number,
  upiLink: string
): string => {
  switch (template) {
    case 'billDelivery':
      return `Hello ${customerName}, here is your digital bill ${billId} for ${formatCurrency(totalAmount)}. Please review and pay via this link: ${upiLink} or scan the QR code. Thank you for choosing Swetha's Couture!`;
    case 'paymentReminder':
      return `Dear ${customerName}, your pending balance for bill ${billId} is ${formatCurrency(balance)}. Kindly pay via UPI: ${upiLink}. We appreciate your prompt settlement.`;
    default:
      return '';
  }
};
