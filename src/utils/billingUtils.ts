
export interface BillItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  chargeType?: string;
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
  customerEmail?: string;
  customerAddress?: string;
  orderId?: string;
  items: BillItem[];
  breakdown: BillBreakdown;
  subtotal: number;
  gstPercent: number;
  gstAmount: number;
  discount: number;
  discountType: 'amount' | 'percentage';
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: 'paid' | 'partial' | 'unpaid';
  date: any;
  dueDate?: any;
  bankDetails: BankDetails;
  upiId: string;
  upiLink: string;
  qrCodeUrl: string;
  notes?: string;
  createdAt: any;
  updatedAt: any;
}

export const generateBillId = (): string => {
  const timestamp = Date.now().toString().slice(-6);
  return `BILL${timestamp}`;
};

export const generateUPILink = (
  upiId: string,
  customerName: string,
  amount: number,
  billId: string
): string => {
  const encodedNote = encodeURIComponent(`Bill ${billId}`);
  const encodedName = encodeURIComponent(customerName);
  return `upi://pay?pa=${upiId}&pn=${encodedName}&am=${amount}&cu=INR&tn=${encodedNote}`;
};

export const calculateBillTotals = (
  items: BillItem[],
  breakdown: BillBreakdown,
  gstPercent: number,
  discount: number,
  discountType: 'amount' | 'percentage' = 'amount'
) => {
  const itemsTotal = items.reduce((sum, item) => sum + item.amount, 0);
  const breakdownTotal = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  const subtotal = itemsTotal + breakdownTotal;
  const gstAmount = (subtotal * gstPercent) / 100;
  
  let discountAmount = discount;
  if (discountType === 'percentage') {
    discountAmount = (subtotal * discount) / 100;
  }
  
  const totalAmount = subtotal + gstAmount - discountAmount;
  
  return {
    subtotal,
    gstAmount,
    totalAmount: Math.max(0, totalAmount),
    discountAmount
  };
};

export const generateQRCodeDataURL = async (upiLink: string): Promise<string> => {
  try {
    const QRCode = (await import('qrcode')).default;
    return await QRCode.toDataURL(upiLink, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return '';
  }
};

export const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const getBillStatusColor = (status: string): string => {
  switch (status) {
    case 'paid': return 'text-green-600 bg-green-100';
    case 'partial': return 'text-yellow-600 bg-yellow-100';
    case 'unpaid': return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};

export const calculateBillStatus = (totalAmount: number, paidAmount: number): 'paid' | 'partial' | 'unpaid' => {
  if (paidAmount >= totalAmount) return 'paid';
  if (paidAmount > 0) return 'partial';
  return 'unpaid';
};

export const getWhatsAppTemplates = (
  customerName: string,
  billId: string,
  totalAmount: number,
  balance: number,
  upiLink: string,
  dueDate?: string
) => ({
  billDelivery: `Hello ${customerName}! 🪡✨\n\nYour bill ${billId} for ${formatCurrency(totalAmount)} is ready from Swetha's Couture.\n\nPay conveniently via UPI: ${upiLink}\n\nOr scan the QR code attached. Thank you for choosing us! 💜`,
  
  paymentReminder: `Dear ${customerName},\n\nFriendly reminder: Your pending balance for bill ${billId} is ${formatCurrency(balance)}.\n\n${dueDate ? `Due date: ${dueDate}\n\n` : ''}Please complete payment via UPI: ${upiLink}\n\nThank you for your understanding! 🙏`,
  
  thankYou: `Dear ${customerName},\n\nThank you for your payment! ✨ We've received your settlement for bill ${billId}.\n\nWe truly appreciate your business and look forward to serving you again at Swetha's Couture! 🪡💜`,
  
  custom1: `Hi ${customerName}! Your custom order is ready for pickup. Bill ${billId} - ${formatCurrency(totalAmount)}. Pay via: ${upiLink}`,
  
  custom2: `Dear ${customerName}, your alteration work is complete! Please review bill ${billId} and make payment. Thanks!`,
  
  custom3: `${customerName}, your exclusive design is ready! Bill ${billId} for ${formatCurrency(totalAmount)}. Secure payment: ${upiLink}`
});

export const downloadPDF = async (bill: Bill) => {
  try {
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;
    
    // Create a temporary div with bill content
    const element = document.createElement('div');
    element.innerHTML = generateBillHTML(bill);
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.background = 'white';
    element.style.padding = '20px';
    element.style.width = '800px';
    
    document.body.appendChild(element);
    
    const canvas = await html2canvas(element);
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF();
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    
    let position = 0;
    
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    pdf.save(`${bill.billId}.pdf`);
    document.body.removeChild(element);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

const generateBillHTML = (bill: Bill): string => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #7c3aed; padding-bottom: 20px;">
        <h1 style="color: #7c3aed; font-size: 28px; margin: 0;">Swetha's Couture</h1>
        <p style="color: #6b7280; margin: 5px 0;">Premium Tailoring & Fashion</p>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
        <div>
          <h3 style="color: #374151; margin-bottom: 10px;">Bill Details</h3>
          <p><strong>Bill No:</strong> ${bill.billId}</p>
          <p><strong>Date:</strong> ${new Date(bill.date?.toDate?.() || bill.date).toLocaleDateString()}</p>
          ${bill.orderId ? `<p><strong>Order ID:</strong> ${bill.orderId}</p>` : ''}
        </div>
        <div>
          <h3 style="color: #374151; margin-bottom: 10px;">Customer Details</h3>
          <p><strong>Name:</strong> ${bill.customerName}</p>
          <p><strong>Phone:</strong> ${bill.customerPhone}</p>
          ${bill.customerEmail ? `<p><strong>Email:</strong> ${bill.customerEmail}</p>` : ''}
          ${bill.customerAddress ? `<p><strong>Address:</strong> ${bill.customerAddress}</p>` : ''}
        </div>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left;">Description</th>
            <th style="border: 1px solid #d1d5db; padding: 10px; text-align: right;">Qty</th>
            <th style="border: 1px solid #d1d5db; padding: 10px; text-align: right;">Rate</th>
            <th style="border: 1px solid #d1d5db; padding: 10px; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${bill.items.map(item => `
            <tr>
              <td style="border: 1px solid #d1d5db; padding: 10px;">${item.description}</td>
              <td style="border: 1px solid #d1d5db; padding: 10px; text-align: right;">${item.quantity}</td>
              <td style="border: 1px solid #d1d5db; padding: 10px; text-align: right;">${formatCurrency(item.rate)}</td>
              <td style="border: 1px solid #d1d5db; padding: 10px; text-align: right;">${formatCurrency(item.amount)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div style="text-align: right; margin-bottom: 30px;">
        <p><strong>Subtotal:</strong> ${formatCurrency(bill.subtotal)}</p>
        <p><strong>GST (${bill.gstPercent}%):</strong> ${formatCurrency(bill.gstAmount)}</p>
        <p><strong>Discount:</strong> -${formatCurrency(bill.discount)}</p>
        <p style="font-size: 18px; color: #7c3aed;"><strong>Total:</strong> ${formatCurrency(bill.totalAmount)}</p>
        <p><strong>Paid:</strong> ${formatCurrency(bill.paidAmount)}</p>
        <p style="font-size: 16px; color: #dc2626;"><strong>Balance:</strong> ${formatCurrency(bill.balance)}</p>
      </div>
      
      <div style="margin-top: 40px; text-align: center; color: #6b7280;">
        <p>Thank you for choosing Swetha's Couture!</p>
        <p>For any queries, please contact us. Payment due within 7 days.</p>
      </div>
    </div>
  `;
};
