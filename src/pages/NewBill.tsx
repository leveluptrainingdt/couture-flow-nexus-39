
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
import BillFormAdvanced from '@/components/BillFormAdvanced';

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
          title: "✅ Success",
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
          title: "✅ Success",
          description: `Bill ${newBillData.billId} created successfully`,
        });
      }
      
      navigate('/billing');
    } catch (error) {
      console.error('Error saving bill:', error);
      toast({
        title: "❌ Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} bill`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      navigate('/billing');
    }
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
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading bill details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Navigation */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/billing')} size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Billing
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {isEditing ? '✏️ Edit Bill' : '📄 Create New Bill'}
            </h1>
            <p className="text-sm text-gray-500">
              {isEditing ? 'Update bill details and recalculate totals' : 'Generate a professional bill for your customer'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        <BillFormAdvanced
          billId={billId}
          bill={bill}
          onSave={handleBillSave}
          onCancel={handleCancel}
          onSuccess={() => {
            toast({
              title: "🎉 Bill Saved",
              description: "Your bill has been saved successfully!",
            });
            navigate('/billing');
          }}
        />
      </div>
    </div>
  );
};

export default NewBill;
