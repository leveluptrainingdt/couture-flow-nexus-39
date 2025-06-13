
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  Download, 
  MessageSquare, 
  Filter,
  Grid3X3,
  List,
  Calendar,
  TrendingUp,
  DollarSign,
  FileText,
  Users
} from 'lucide-react';
import { collection, getDocs, query, orderBy, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Bill, formatCurrency, getBillStatusColor, calculateBillStatus, downloadPDF } from '@/utils/billingUtils';
import { useRealTimeData } from '@/hooks/useRealTimeData';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import BillWhatsAppModal from '@/components/BillWhatsAppModal';

const Billing = () => {
  const navigate = useNavigate();
  const { data: bills, loading } = useRealTimeData('bills', 'createdAt');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [filterDateRange, setFilterDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  const filteredBills = bills.filter((bill: Bill) => {
    const matchesSearch = 
      bill.billId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.customerPhone.includes(searchTerm);
    
    const matchesStatus = 
      filterStatus === 'all' ||
      calculateBillStatus(bill.totalAmount, bill.paidAmount) === filterStatus;
    
    let matchesDate = true;
    if (filterDateRange !== 'all') {
      const billDate = new Date(bill.date?.toDate?.() || bill.date);
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (filterDateRange) {
        case 'today':
          matchesDate = billDate >= startOfDay;
          break;
        case 'week':
          const weekAgo = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = billDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(startOfDay.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = billDate >= monthAgo;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleDeleteBill = async (billId: string, event: React.MouseEvent) => {
    event.stopPropagation();
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

  const handleWhatsAppShare = (bill: Bill, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedBill(bill);
    setShowWhatsAppModal(true);
  };

  const handleDownloadPDF = async (bill: Bill, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await downloadPDF(bill);
      toast({
        title: "Success",
        description: "PDF downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download PDF",
        variant: "destructive",
      });
    }
  };

  const stats = {
    totalBills: bills.length,
    totalRevenue: bills.reduce((sum: number, bill: Bill) => sum + bill.totalAmount, 0),
    pendingAmount: bills.reduce((sum: number, bill: Bill) => sum + bill.balance, 0),
    paidBills: bills.filter((bill: Bill) => calculateBillStatus(bill.totalAmount, bill.paidAmount) === 'paid').length,
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Billing</h1>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading bills...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing Dashboard</h1>
          <p className="text-gray-600">Manage bills, track payments, and generate invoices</p>
        </div>
        <Button 
          onClick={() => navigate('/billing/new')}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          size="lg"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create New Bill
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-all duration-200 hover:scale-102">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">Total Bills</CardTitle>
            <FileText className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{stats.totalBills}</div>
            <p className="text-xs text-purple-600 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all duration-200 hover:scale-102">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Total Revenue</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <p className="text-xs text-green-600 mt-1">Gross revenue</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 hover:shadow-lg transition-all duration-200 hover:scale-102">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-800">Pending Amount</CardTitle>
            <DollarSign className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-900">
              {formatCurrency(stats.pendingAmount)}
            </div>
            <p className="text-xs text-yellow-600 mt-1">Outstanding balance</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-all duration-200 hover:scale-102">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Paid Bills</CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{stats.paidBills}</div>
            <p className="text-xs text-blue-600 mt-1">Completed payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by bill ID, customer name, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterDateRange} onValueChange={(value: any) => setFilterDateRange(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex border rounded-lg bg-gray-50">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="rounded-r-none"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-l-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bills Content */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Bills ({filteredBills.length})</span>
            {filteredBills.length > 0 && (
              <Badge variant="outline" className="text-gray-600">
                {filteredBills.length} of {bills.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredBills.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No bills found</h3>
              <p className="text-gray-500 mb-6">
                {bills.length === 0 
                  ? "Create your first bill to get started." 
                  : "Try adjusting your search or filter criteria."
                }
              </p>
              <Button 
                onClick={() => navigate('/billing/new')}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Bill
              </Button>
            </div>
          ) : viewMode === 'table' ? (
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
                  {filteredBills.map((bill: Bill) => {
                    const status = calculateBillStatus(bill.totalAmount, bill.paidAmount);
                    return (
                      <TableRow 
                        key={bill.id} 
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/billing/${bill.id}`)}
                      >
                        <TableCell className="font-medium text-purple-600">{bill.billId}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{bill.customerName}</div>
                            <div className="text-sm text-gray-500">{bill.customerPhone}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(bill.date?.toDate?.() || bill.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(bill.totalAmount)}</TableCell>
                        <TableCell className="text-green-600">{formatCurrency(bill.paidAmount)}</TableCell>
                        <TableCell className={bill.balance > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                          {formatCurrency(bill.balance)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getBillStatusColor(status)}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/billing/${bill.id}`);
                              }}
                              className="hover:bg-blue-50 hover:border-blue-300"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/billing/${bill.id}/edit`);
                              }}
                              className="hover:bg-purple-50 hover:border-purple-300"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => handleDownloadPDF(bill, e)}
                              className="hover:bg-green-50 hover:border-green-300"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => handleWhatsAppShare(bill, e)}
                              className="hover:bg-green-50 hover:border-green-300 text-green-600"
                            >
                              <MessageSquare className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => handleDeleteBill(bill.id, e)}
                              className="hover:bg-red-50 hover:border-red-300 text-red-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBills.map((bill: Bill) => {
                const status = calculateBillStatus(bill.totalAmount, bill.paidAmount);
                return (
                  <Card 
                    key={bill.id} 
                    className="hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer border-gray-200"
                    onClick={() => navigate(`/billing/${bill.id}`)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg text-purple-600">{bill.billId}</CardTitle>
                          <p className="text-sm text-gray-500">
                            {new Date(bill.date?.toDate?.() || bill.date).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={getBillStatusColor(status)}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <p className="font-medium">{bill.customerName}</p>
                          <p className="text-sm text-gray-500">{bill.customerPhone}</p>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Total:</span>
                          <span className="font-medium">{formatCurrency(bill.totalAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Balance:</span>
                          <span className={bill.balance > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                            {formatCurrency(bill.balance)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleWhatsAppShare(bill, e)}
                            className="flex-1 text-green-600 hover:bg-green-50"
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Share
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleDownloadPDF(bill, e)}
                            className="flex-1 hover:bg-blue-50"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            PDF
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* WhatsApp Modal */}
      {showWhatsAppModal && selectedBill && (
        <BillWhatsAppModal
          isOpen={showWhatsAppModal}
          onClose={() => {
            setShowWhatsAppModal(false);
            setSelectedBill(null);
          }}
          customerName={selectedBill.customerName}
          customerPhone={selectedBill.customerPhone}
          defaultMessage={`Hello ${selectedBill.customerName}! 🪡✨\n\nYour bill ${selectedBill.billId} for ${formatCurrency(selectedBill.totalAmount)} is ready from Swetha's Couture.\n\nThank you for choosing us! 💜`}
        />
      )}
    </div>
  );
};

export default Billing;
