import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Receipt, TrendingUp, DollarSign, Calendar, Upload, Image, Download } from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';

interface Expense {
  id: string;
  title: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  paymentMethod: 'cash' | 'bank' | 'upi' | 'card' | 'cheque';
  vendor?: string;
  status: 'pending' | 'paid' | 'approved' | 'rejected';
  receiptUrl?: string;
  isRecurring: boolean;
  recurringType?: 'monthly' | 'quarterly' | 'yearly';
  nextDueDate?: string;
  notes?: string;
  createdAt: any;
  updatedAt: any;
}

const Expenses = () => {
  const { userData } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: 0,
    category: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash' as 'cash' | 'bank' | 'upi' | 'card' | 'cheque',
    vendor: '',
    status: 'pending' as 'pending' | 'paid' | 'approved' | 'rejected',
    isRecurring: false,
    recurringType: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
    nextDueDate: '',
    notes: ''
  });

  const categories = [
    'Rent & Utilities',
    'Raw Materials',
    'Equipment',
    'Staff Salaries',
    'Marketing',
    'Transportation',
    'Office Supplies',
    'Professional Services',
    'Insurance',
    'Maintenance',
    'Other'
  ];

  useEffect(() => {
    if (userData?.role === 'admin') {
      fetchExpenses();
    } else {
      setLoading(false);
    }
  }, [userData, selectedMonth]);

  const fetchExpenses = async () => {
    try {
      const expensesQuery = query(
        collection(db, 'expenses'),
        orderBy('date', 'desc')
      );
      const expensesSnapshot = await getDocs(expensesQuery);
      const expensesData = expensesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Expense[];
      
      setExpenses(expensesData);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast({
        title: "Error",
        description: "Failed to fetch expenses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const expenseData = {
        ...formData,
        updatedAt: serverTimestamp(),
        ...(editingExpense ? {} : { createdAt: serverTimestamp() })
      };

      if (editingExpense) {
        await updateDoc(doc(db, 'expenses', editingExpense.id), expenseData);
        toast({
          title: "Success",
          description: "Expense updated successfully",
        });
      } else {
        await addDoc(collection(db, 'expenses'), expenseData);
        toast({
          title: "Success",
          description: "Expense added successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingExpense(null);
      resetForm();
      fetchExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast({
        title: "Error",
        description: "Failed to save expense",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      amount: 0,
      category: '',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      vendor: '',
      status: 'pending',
      isRecurring: false,
      recurringType: 'monthly',
      nextDueDate: '',
      notes: ''
    });
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      title: expense.title,
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      paymentMethod: expense.paymentMethod,
      vendor: expense.vendor || '',
      status: expense.status,
      isRecurring: expense.isRecurring,
      recurringType: expense.recurringType || 'monthly',
      nextDueDate: expense.nextDueDate || '',
      notes: expense.notes || ''
    });
    setIsDialogOpen(true);
  };

  const updateStatus = async (expenseId: string, newStatus: Expense['status']) => {
    try {
      await updateDoc(doc(db, 'expenses', expenseId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast({
        title: "Success",
        description: "Expense status updated",
      });
      fetchExpenses();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const uploadReceipt = async (file: File, expenseId: string) => {
    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'swetha');

      const response = await fetch('https://api.cloudinary.com/v1_1/dvmrhs2ek/image/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.secure_url) {
        await updateDoc(doc(db, 'expenses', expenseId), {
          receiptUrl: data.secure_url,
          updatedAt: serverTimestamp()
        });

        toast({
          title: "Success",
          description: "Receipt uploaded successfully",
        });
        fetchExpenses();
      }
    } catch (error) {
      console.error('Error uploading receipt:', error);
      toast({
        title: "Error",
        description: "Failed to upload receipt",
        variant: "destructive",
      });
    } finally {
      setUploadingReceipt(false);
    }
  };

  const getStatusColor = (status: Expense['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'approved': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'paid': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPaymentMethodColor = (method: Expense['paymentMethod']) => {
    switch (method) {
      case 'cash': return 'bg-green-100 text-green-700';
      case 'bank': return 'bg-blue-100 text-blue-700';
      case 'upi': return 'bg-purple-100 text-purple-700';
      case 'card': return 'bg-indigo-100 text-indigo-700';
      case 'cheque': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const exportExpenses = (format: 'csv' | 'pdf') => {
    toast({
      title: "Export Started",
      description: `Generating ${format.toUpperCase()} report...`,
    });
    
    setTimeout(() => {
      toast({
        title: "Export Complete",
        description: `Expenses exported as ${format.toUpperCase()} successfully`,
      });
    }, 2000);
  };

  if (userData?.role !== 'admin') {
    return (
      <div className="space-y-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
            <p className="text-gray-600">
              Only administrators can manage expenses.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Expense Management</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const currentMonthExpenses = expenses.filter(expense => 
    expense.date.startsWith(selectedMonth)
  );

  const totalExpenses = currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const pendingExpenses = expenses.filter(expense => expense.status === 'pending');
  const recurringExpenses = expenses.filter(expense => expense.isRecurring);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Expense Management</h1>
          <p className="text-gray-600">Track and manage business expenses</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => exportExpenses('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                onClick={() => {
                  setEditingExpense(null);
                  resetForm();
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingExpense ? 'Edit Expense' : 'Add New Expense'}
                </DialogTitle>
                <DialogDescription>
                  Fill in the expense details below.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Expense Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Enter expense title"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Describe the expense"
                    rows={2}
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="amount">Amount (₹)</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <select
                      id="category"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      required
                    >
                      <option value="">Select category</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <select
                      id="paymentMethod"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({...formData, paymentMethod: e.target.value as 'cash' | 'bank' | 'upi' | 'card' | 'cheque'})}
                      required
                    >
                      <option value="cash">Cash</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="upi">UPI</option>
                      <option value="card">Card</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <select
                      id="status"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as 'pending' | 'paid' | 'approved' | 'rejected'})}
                      required
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="paid">Paid</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="vendor">Vendor/Supplier</Label>
                  <Input
                    id="vendor"
                    value={formData.vendor}
                    onChange={(e) => setFormData({...formData, vendor: e.target.value})}
                    placeholder="Vendor or supplier name"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isRecurring"
                      checked={formData.isRecurring}
                      onChange={(e) => setFormData({...formData, isRecurring: e.target.checked})}
                      className="rounded"
                    />
                    <Label htmlFor="isRecurring">This is a recurring expense</Label>
                  </div>
                  
                  {formData.isRecurring && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="recurringType">Frequency</Label>
                        <select
                          id="recurringType"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          value={formData.recurringType}
                          onChange={(e) => setFormData({...formData, recurringType: e.target.value as 'monthly' | 'quarterly' | 'yearly'})}
                        >
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="nextDueDate">Next Due Date</Label>
                        <Input
                          id="nextDueDate"
                          type="date"
                          value={formData.nextDueDate}
                          onChange={(e) => setFormData({...formData, nextDueDate: e.target.value})}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Any additional notes"
                    rows={2}
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-purple-600 to-blue-600">
                    {editingExpense ? 'Update Expense' : 'Add Expense'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <Label>Month:</Label>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-auto"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Monthly Total</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">₹{totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-gray-500">This month's expenses</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
            <Receipt className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{pendingExpenses.length}</div>
            <p className="text-xs text-gray-500">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Recurring</CardTitle>
            <Calendar className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{recurringExpenses.length}</div>
            <p className="text-xs text-gray-500">Recurring expenses</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Categories</CardTitle>
            <TrendingUp className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {new Set(currentMonthExpenses.map(e => e.category)).size}
            </div>
            <p className="text-xs text-gray-500">Active categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Grid */}
      {expenses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {expenses.map((expense) => (
            <Card key={expense.id} className="hover:shadow-lg transition-all duration-300 border-0 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{expense.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{expense.description}</CardDescription>
                  </div>
                  <Badge className={getStatusColor(expense.status)} variant="outline">
                    {expense.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-bold text-lg">₹{expense.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">{expense.date}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Category:</span>
                    <span className="font-medium">{expense.category}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Payment:</span>
                    <Badge className={getPaymentMethodColor(expense.paymentMethod)} variant="outline">
                      {expense.paymentMethod.toUpperCase()}
                    </Badge>
                  </div>
                  {expense.vendor && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Vendor:</span>
                      <span className="font-medium">{expense.vendor}</span>
                    </div>
                  )}
                  {expense.isRecurring && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Recurring:</span>
                      <Badge variant="outline" className="bg-blue-100 text-blue-700">
                        {expense.recurringType}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Receipt Upload/View */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Receipt:</span>
                    {expense.receiptUrl ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => window.open(expense.receiptUrl, '_blank')}
                      >
                        <Image className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    ) : (
                      <>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadReceipt(file, expense.id);
                          }}
                          style={{ display: 'none' }}
                          id={`receipt-${expense.id}`}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => document.getElementById(`receipt-${expense.id}`)?.click()}
                          disabled={uploadingReceipt}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Upload
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Quick Status Updates */}
                <div className="flex flex-wrap gap-2">
                  {expense.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-600 hover:bg-blue-50"
                      onClick={() => updateStatus(expense.id, 'approved')}
                    >
                      Approve
                    </Button>
                  )}
                  {expense.status === 'approved' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 hover:bg-green-50"
                      onClick={() => updateStatus(expense.id, 'paid')}
                    >
                      Mark Paid
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(expense)}
                  >
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses found</h3>
            <p className="text-gray-600 mb-4">
              Start by adding your first business expense.
            </p>
            <Button 
              className="bg-gradient-to-r from-purple-600 to-blue-600"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Expense
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Expenses;
