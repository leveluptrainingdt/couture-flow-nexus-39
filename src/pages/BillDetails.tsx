
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowLeft, Edit, Trash2, Download, MessageSquare, CreditCard, QrCode } from 'lucide-react';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Bill, formatCurrency, getBillStatusColor, downloadPDF, getWhatsAppTemplates } from '@/utils/billingUtils';
import { toast } from '@/hooks/use-toast';
import BillWhatsAppModal from '@/components/BillWhatsAppModal';
import BillForm from '@/components/BillForm';

const BillDetails = () => {
  const { billId } = useParams<{ billId: string }>();
  const navigate = useNavigate();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (billId) {
      fetchBill();
    }
  }, [billId]);

  const fetchBill = async () => {
    if (!billId) return;
    
    try {
      const billDoc = await getDoc(doc(db, 'bills', billId));
      if (billDoc.exists()) {
        setBill({ id: billDoc.id, ...billDoc.data() } as Bill);
      } else {
        toast({
          title: "Error",
          description: "Bill not found",
          variant: "destructive",
        });
        navigate('/billing');
      }
    } catch (error) {
      console.error('Error fetching bill:', error);
      toast({
        title: "Error",
        description: "Failed to fetch bill details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!bill || !window.confirm('Are you sure you want to delete this bill?')) return;
    
    try {
      await deleteDoc(doc(db, 'bills', bill.id));
      toast({
        title: "Success",
        description: "Bill deleted successfully",
      });
      navigate('/billing');
    } catch (error) {
      console.error('Error deleting bill:', error);
      toast({
        title: "Error",
        description: "Failed to delete bill",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = async () => {
    if (!bill) return;
    
    setDownloading(true);
    try {
      await downloadPDF(bill);
      toast({
        title: "PDF Downloaded",
        description: "Bill has been downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download PDF",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleWhatsAppShare = (templateType: string) => {
    if (!bill) return;
    
    const templates = getWhatsAppTemplates(
      bill.customerName,
      bill.billId,
      bill.totalAmount,
      bill.balance,
      bill.upiLink,
      bill.dueDate ? new Date(bill.dueDate.toDate()).toLocaleDateString() : undefined
    );
    
    const message = templates[templateType as keyof typeof templates] || templates.billDelivery;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${bill.customerPhone}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const handlePayWithUPI = () => {
    if (!bill) return;
    
    if (bill.upiLink) {
      window.open(bill.upiLink, '_blank');
    } else {
      toast({
        title: "UPI Link Not Available",
        description: "UPI payment link is not configured for this bill",
        variant: "destructive",
      });
    }
  };

  const handleBillSave = async (updatedBill: Bill) => {
    // Handle bill save logic here
    toast({
      title: "Success", 
      description: "Bill updated successfully",
    });
    setShowEditDialog(false);
    fetchBill();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/billing')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Billing
          </Button>
        </div>
        <div className="text-center py-8">Loading bill details...</div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/billing')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Billing
          </Button>
        </div>
        <div className="text-center py-8">Bill not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/billing')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Billing
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bill {bill.billId}</h1>
            <p className="text-gray-500">
              Created on {bill.date?.toDate?.()?.toLocaleDateString() || 'N/A'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Bill {bill.billId}</DialogTitle>
              </DialogHeader>
              <BillForm 
                bill={bill} 
                onSave={handleBillSave}
                onCancel={() => setShowEditDialog(false)}
                onSuccess={() => {
                  setShowEditDialog(false);
                  fetchBill();
                }} 
              />
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={handleDownloadPDF} disabled={downloading}>
            <Download className="h-4 w-4 mr-2" />
            {downloading ? 'Downloading...' : 'Download PDF'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowWhatsAppModal(true)}
            className="text-green-600"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" onClick={handleDelete} className="text-red-600">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Bill Content */}
      <div className="max-w-4xl mx-auto">
        {/* Header Card */}
        <Card className="mb-6">
          <CardHeader className="text-center bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            <CardTitle className="text-2xl">Swetha's Couture</CardTitle>
            <p className="text-purple-100">Premium Tailoring & Fashion</p>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Bill Details</h3>
                <p><strong>Bill No:</strong> {bill.billId}</p>
                <p><strong>Date:</strong> {bill.date?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
                {bill.orderId && <p><strong>Order ID:</strong> {bill.orderId}</p>}
              </div>
              <div>
                <h3 className="font-semibold mb-2">Customer Details</h3>
                <p><strong>Name:</strong> {bill.customerName}</p>
                <p><strong>Phone:</strong> {bill.customerPhone}</p>
                {bill.customerEmail && <p><strong>Email:</strong> {bill.customerEmail}</p>}
                {bill.customerAddress && <p><strong>Address:</strong> {bill.customerAddress}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Bill Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bill.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatCurrency(item.rate)}</TableCell>
                    <TableCell>{formatCurrency(item.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} className="font-semibold">Items Subtotal</TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(bill.items.reduce((sum, item) => sum + item.amount, 0))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Breakdown */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Charges Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell>Fabric</TableCell>
                  <TableCell>{formatCurrency(bill.breakdown.fabric)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Stitching</TableCell>
                  <TableCell>{formatCurrency(bill.breakdown.stitching)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Accessories</TableCell>
                  <TableCell>{formatCurrency(bill.breakdown.accessories)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Customization</TableCell>
                  <TableCell>{formatCurrency(bill.breakdown.customization)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Other Charges</TableCell>
                  <TableCell>{formatCurrency(bill.breakdown.otherCharges)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Bill Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(bill.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST ({bill.gstPercent}%)</span>
                <span>{formatCurrency(bill.gstAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount</span>
                <span>-{formatCurrency(bill.discount)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total Amount</span>
                <span>{formatCurrency(bill.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span>Paid Amount</span>
                <span className="text-green-600">{formatCurrency(bill.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Balance</span>
                <span className={getBillStatusColor(bill.status)}>
                  {formatCurrency(bill.balance)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bank Details */}
              <div>
                <h3 className="font-semibold mb-4">Bank Transfer</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Account Name:</strong> {bill.bankDetails.accountName}</p>
                  <p><strong>Account Number:</strong> {bill.bankDetails.accountNumber}</p>
                  <p><strong>IFSC Code:</strong> {bill.bankDetails.ifsc}</p>
                  <p><strong>Bank Name:</strong> {bill.bankDetails.bankName}</p>
                </div>
              </div>

              {/* UPI Payment */}
              <div>
                <h3 className="font-semibold mb-4">UPI Payment</h3>
                <div className="space-y-4">
                  <Button onClick={handlePayWithUPI} className="w-full">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay with UPI
                  </Button>
                  <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <QrCode className="h-4 w-4 mr-2" />
                        Show QR Code
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>UPI QR Code</DialogTitle>
                      </DialogHeader>
                      <div className="text-center">
                        {bill.qrCodeUrl ? (
                          <img src={bill.qrCodeUrl} alt="UPI QR Code" className="w-48 h-48 mx-auto" />
                        ) : (
                          <div className="w-48 h-48 mx-auto bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                            <p className="text-gray-500">QR Code Not Available</p>
                          </div>
                        )}
                        <p className="mt-4 text-sm text-gray-600">
                          Scan this QR code with any UPI app to pay {formatCurrency(bill.balance)}
                        </p>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600 mb-2">Thank you for choosing Swetha's Couture!</p>
            <p className="text-sm text-gray-500">
              For any queries, please contact us. Payment due within 7 days.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* WhatsApp Modal */}
      {showWhatsAppModal && (
        <BillWhatsAppModal
          isOpen={showWhatsAppModal}
          onClose={() => setShowWhatsAppModal(false)}
          customerName={bill.customerName}
          customerPhone={bill.customerPhone}
          defaultMessage={`Hello ${bill.customerName}, here is your digital bill ${bill.billId} for ${formatCurrency(bill.totalAmount)}. Please review and pay via UPI. Thank you for choosing Swetha's Couture!`}
        />
      )}
    </div>
  );
};

export default BillDetails;
