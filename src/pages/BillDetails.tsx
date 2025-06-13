
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
import { doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
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

  const handleBillSave = async (updatedBill: Bill) => {
    try {
      // Update bill in Firestore
      await updateDoc(doc(db, 'bills', updatedBill.id), {
        ...updatedBill,
        updatedAt: new Date(),
      });
      
      toast({
        title: "Success",
        description: `Bill ${updatedBill.billId} updated successfully`,
      });
      
      setShowEditDialog(false);
      // Refresh bill data
      await fetchBill();
    } catch (error) {
      console.error('Error updating bill:', error);
      toast({
        title: "Error",
        description: "Failed to update bill",
        variant: "destructive",
      });
    }
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

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
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
      <div className="space-y-6 p-4 sm:p-6">
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
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header - Responsive */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/billing')} size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Bill {bill.billId}</h1>
            <p className="text-sm sm:text-base text-gray-500">
              Created on {bill.date?.toDate?.()?.toLocaleDateString() || 'N/A'}
            </p>
          </div>
        </div>
        
        {/* Action Buttons - Responsive */}
        <div className="flex flex-wrap gap-2">
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
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
          
          <Button variant="outline" onClick={handleDownloadPDF} disabled={downloading} size="sm">
            <Download className="h-4 w-4 mr-2" />
            {downloading ? 'Downloading...' : 'PDF'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setShowWhatsAppModal(true)}
            className="text-green-600"
            size="sm"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Share
          </Button>
          
          <Button variant="outline" onClick={handleDelete} className="text-red-600" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Bill Content - Responsive Layout */}
      <div className="max-w-6xl mx-auto">
        {/* Header Card */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="text-center bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            <CardTitle className="text-xl sm:text-2xl">Swetha's Couture</CardTitle>
            <p className="text-purple-100 text-sm sm:text-base">Premium Tailoring & Fashion</p>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <h3 className="font-semibold mb-2 text-sm sm:text-base">Bill Details</h3>
                <div className="text-sm space-y-1">
                  <p><strong>Bill No:</strong> {bill.billId}</p>
                  <p><strong>Date:</strong> {bill.date?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
                  {bill.orderId && <p><strong>Order ID:</strong> {bill.orderId}</p>}
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-sm sm:text-base">Customer Details</h3>
                <div className="text-sm space-y-1">
                  <p><strong>Name:</strong> {bill.customerName}</p>
                  <p><strong>Phone:</strong> {bill.customerPhone}</p>
                  {bill.customerEmail && <p><strong>Email:</strong> {bill.customerEmail}</p>}
                  {bill.customerAddress && <p><strong>Address:</strong> {bill.customerAddress}</p>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items Table - Responsive */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Bill Items</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile Card View */}
            <div className="block sm:hidden space-y-3">
              {bill.items.map((item, index) => (
                <div key={index} className="border rounded-lg p-3 bg-gray-50">
                  <div className="font-medium">{item.description}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Qty: {item.quantity} × Rate: {formatCurrency(item.rate)}
                  </div>
                  <div className="text-right font-medium text-purple-600">
                    {formatCurrency(item.amount)}
                  </div>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Items Subtotal</span>
                <span>{formatCurrency(bill.items.reduce((sum, item) => sum + item.amount, 0))}</span>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bill.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.rate)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} className="font-semibold">Items Subtotal</TableCell>
                    <TableCell className="font-semibold text-right">
                      {formatCurrency(bill.items.reduce((sum, item) => sum + item.amount, 0))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Breakdown and Summary - Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          {/* Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Charges Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Fabric</span>
                  <span>{formatCurrency(bill.breakdown.fabric)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Stitching</span>
                  <span>{formatCurrency(bill.breakdown.stitching)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Accessories</span>
                  <span>{formatCurrency(bill.breakdown.accessories)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customization</span>
                  <span>{formatCurrency(bill.breakdown.customization)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Other Charges</span>
                  <span>{formatCurrency(bill.breakdown.otherCharges)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bill Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(bill.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>GST ({bill.gstPercent}%)</span>
                  <span>{formatCurrency(bill.gstAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Discount</span>
                  <span>-{formatCurrency(bill.discount)}</span>
                </div>
                <div className="flex justify-between font-bold text-base sm:text-lg border-t pt-2">
                  <span>Total Amount</span>
                  <span className="text-purple-600">{formatCurrency(bill.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Paid Amount</span>
                  <span className="text-green-600">{formatCurrency(bill.paidAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-base sm:text-lg">
                  <span>Balance</span>
                  <span className={getBillStatusColor(bill.status).includes('red') ? 'text-red-600' : 'text-green-600'}>
                    {formatCurrency(bill.balance)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Section - Responsive */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Payment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Bank Details */}
              <div>
                <h3 className="font-semibold mb-3 text-sm sm:text-base">Bank Transfer</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Account Name:</strong> {bill.bankDetails.accountName}</p>
                  <p><strong>Account Number:</strong> {bill.bankDetails.accountNumber}</p>
                  <p><strong>IFSC Code:</strong> {bill.bankDetails.ifsc}</p>
                  <p><strong>Bank Name:</strong> {bill.bankDetails.bankName}</p>
                </div>
              </div>

              {/* UPI Payment */}
              <div>
                <h3 className="font-semibold mb-3 text-sm sm:text-base">UPI Payment</h3>
                <div className="space-y-3">
                  <Button onClick={handlePayWithUPI} className="w-full" size="sm">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay with UPI
                  </Button>
                  <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full" size="sm">
                        <QrCode className="h-4 w-4 mr-2" />
                        Show QR Code
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader>
                        <DialogTitle>UPI QR Code</DialogTitle>
                      </DialogHeader>
                      <div className="text-center">
                        {bill.qrCodeUrl ? (
                          <img src={bill.qrCodeUrl} alt="UPI QR Code" className="w-48 h-48 mx-auto" />
                        ) : (
                          <div className="w-48 h-48 mx-auto bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                            <p className="text-gray-500 text-sm">QR Code Not Available</p>
                          </div>
                        )}
                        <p className="mt-4 text-xs sm:text-sm text-gray-600">
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
            <p className="text-gray-600 mb-2 text-sm sm:text-base">Thank you for choosing Swetha's Couture!</p>
            <p className="text-xs sm:text-sm text-gray-500">
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
