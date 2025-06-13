
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
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
  calculateBillStatus
} from '@/utils/billingUtils';
import { toast } from '@/hooks/use-toast';
import BillForm from '@/components/BillForm';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

const NewBill = () => {
  const { billId } = useParams();
  const navigate = useNavigate();
  const isEditing = !!billId;
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditing && billId) {
      fetchBill();
    }
  }, [isEditing, billId]);

  const fetchBill = async () => {
    if (!billId) return;
    
    setLoading(true);
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

  const handleBillSave = async (billData: Bill) => {
    setLoading(true);
    
    try {
      if (isEditing && billId) {
        // Update existing bill
        await updateDoc(doc(db, 'bills', billId), {
          ...billData,
          updatedAt: serverTimestamp(),
        });
        
        toast({
          title: "Success",
          description: `Bill ${billData.billId} updated successfully`,
        });
      } else {
        // Create new bill
        const newBillData = {
          ...billData,
          billId: generateBillId(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        
        await addDoc(collection(db, 'bills'), newBillData);
        
        toast({
          title: "Success",
          description: `Bill ${newBillData.billId} created successfully`,
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

  const handleCancel = () => {
    navigate('/billing');
  };

  if (loading && isEditing) {
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

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 animate-fade-in">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/billing')} size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Billing
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {isEditing ? 'Edit Bill' : 'Create New Bill'}
          </h1>
          <p className="text-sm sm:text-base text-gray-500">
            {isEditing ? 'Update bill details and recalculate totals' : 'Generate a new bill for your customer'}
          </p>
        </div>
      </div>

      {/* Bill Form */}
      <Card className="w-full">
        <CardContent className="p-0">
          <BillForm
            billId={billId}
            bill={bill}
            onSave={handleBillSave}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default NewBill;
