
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Plus, Search, Eye, Edit, Trash2, Download, MessageSquare, Filter } from 'lucide-react';
import { collection, getDocs, query, orderBy, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Bill, formatCurrency, getBillStatusColor } from '@/utils/billingUtils';
import { useRealTimeData } from '@/hooks/useRealTimeData';
import BillForm from '@/components/BillForm';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { generateWhatsAppLink } from '@/utils/contactUtils';

const Billing = () => {
  const navigate = useNavigate();
  const { data: bills, loading } = useRealTimeData('bills', 'createdAt');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [showNewBillDialog, setShowNewBillDialog] = useState(false);

  const filteredBills = bills.filter((bill: Bill) => {
    const matchesSearch = 
      bill.billId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      filterStatus === 'all' ||
      (filterStatus === 'paid' && bill.balance <= 0) ||
      (filterStatus === 'unpaid' && bill.balance > 0);
    
    return matchesSearch && matchesStatus;
  });

  const handleDeleteBill = async (billId: string) => {
    if (window.confirm('Are you sure you want to delete this bill?')) {
      try {
        await deleteDoc(doc(db, 'bills', billId));
        toast({
          title: "Success",
          description: "Bill deleted successfully",
        });
      } catch (error) {
        console.error('Error deleting bill:', error);
        toast({
          title: "Error",
          description: "Failed to delete bill",
          variant: "destructive",
        });
      }
    }
  };

  const handleWhatsAppShare = (bill: Bill) => {
    const message = `Hello ${bill.customerName}, here is your digital bill ${bill.billId} for ${formatCurrency(bill.totalAmount)}. Please review and pay via UPI. Thank you for choosing Swetha's Couture!`;
    const whatsappUrl = generateWhatsAppLink(bill.customerPhone, message);
    window.open(whatsappUrl, '_blank');
  };

  const stats = {
    totalBills: bills.length,
    totalRevenue: bills.reduce((sum: number, bill: Bill) => sum + bill.totalAmount, 0),
    pendingAmount: bills.reduce((sum: number, bill: Bill) => sum + bill.balance, 0),
    paidBills: bills.filter((bill: Bill) => bill.balance <= 0).length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Billing</h1>
        </div>
        <div className="text-center py-8">Loading bills...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Billing</h1>
        <Dialog open={showNewBillDialog} onOpenChange={setShowNewBillDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              New Bill
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Bill</DialogTitle>
            </DialogHeader>
            <BillForm onSuccess={() => setShowNewBillDialog(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBills}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalRevenue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(stats.pendingAmount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Bills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.paidBills}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by bill ID or customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={filterStatus === 'paid' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('paid')}
                size="sm"
              >
                Paid
              </Button>
              <Button
                variant={filterStatus === 'unpaid' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('unpaid')}
                size="sm"
              >
                Unpaid
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bills Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bills ({filteredBills.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredBills.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No bills found. Create your first bill to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBills.map((bill: Bill) => (
                    <TableRow key={bill.id}>
                      <TableCell className="font-medium">{bill.billId}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{bill.customerName}</div>
                          <div className="text-sm text-gray-500">{bill.customerPhone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {bill.date?.toDate?.()?.toLocaleDateString() || 'N/A'}
                      </TableCell>
                      <TableCell>{formatCurrency(bill.totalAmount)}</TableCell>
                      <TableCell>{formatCurrency(bill.paidAmount)}</TableCell>
                      <TableCell className={getBillStatusColor(bill.balance)}>
                        {formatCurrency(bill.balance)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={bill.balance <= 0 ? 'default' : 'destructive'}>
                          {bill.balance <= 0 ? 'Paid' : 'Unpaid'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/billing/${bill.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleWhatsAppShare(bill)}
                            className="text-green-600"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteBill(bill.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Billing;
