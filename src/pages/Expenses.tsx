
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, DollarSign, TrendingUp, TrendingDown, Upload, Receipt, Calendar, Filter } from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';

interface Expense {
  id: string;
  title: string;
  description?: string;
  amount: number;
  category: string;
  subcategory?: string;
  date: string;
  paymentMethod: 'cash' | 'bank' | 'upi' | 'card' | 'cheque';
  vendor?: string;
  billNumber?: string;
  receiptImage?: string;
  status: 'pending' | 'paid' | 'approved' | 'rejected';
  createdBy: string;
  approvedBy?: string;
  tags: string[];
  isRecurring: boolean;
  recurringPeriod?: 'monthly' | 'quarterly' | 'yearly';
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
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: 0,
    category: '',
    subcategory: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash' as const,
    vendor: '',
    billNumber: '',
    status: 'pending' as const,
    tags: '',
    isRecurring: false,
    recurringPeriod: 'monthly' as const
  });

  const categories = [
    {
      name: 'Raw Materials',
      subcategories: ['Fabrics', 'Threads', 'Buttons', 'Zippers', 'Laces', 'Accessories']
    },
    {
      name: 'Staff Expenses',
      subcategories: ['Salaries', 'Overtime', 'Bonuses', 'Benefits', 'Training']
    },
    {
      name: 'Utilities',
      subcategories: ['Electricity', 'Water', 'Internet', 'Phone', 'Gas']
    },
    {
      name: 'Equipment',
      subcategories: ['Sewing Machines', 'Tools', 'Furniture', 'Computers', 'Maintenance']
    },
    {
      name: 'Rent & Property',
      subcategories: ['Shop Rent', 'Storage Rent', 'Property Tax', 'Insurance']
    },
    {
      name: 'Marketing',
      subcategories: ['Advertising', 'Social Media', 'Photography', 'Website', 'Events']
    },
    {
      name: 'Transportation',
      subcategories: ['Delivery', 'Travel', 'Fuel', 'Vehicle Maintenance']
    },
    {
      name: 'Professional Services',
      subcategories: ['Accounting', 'Legal', 'Consultancy', 'Software Subscriptions']
    },
    {
      name: 'Miscellaneous',
      subcategories: ['Office Supplies', 'Food & Beverages', 'Gifts', 'Charity', 'Other']
    }
  ];

  const paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank', label: 'Bank Transfer' },
    { value: 'upi', label: 'UPI' },
    { value: 'card', label: 'Card' },
    { value: 'cheque', label: 'Cheque' }
  ];

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const expensesQuery = query(
        collection(db, 'expenses'),
        orderBy('date', 'desc')
      );
      const expensesSnapshot = await getDocs(expensesQuery);
      const expensesData = expensesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        tags: doc.data().tags || []
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
        createdBy: userData?.name || '',
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
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
      subcategory: '',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      vendor: '',
      billNumber: '',
      status: 'pending',
      tags: '',
      isRecurring: false,
      recurringPeriod: 'monthly'
    });
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      title: expense.title,
      description: expense.description || '',
      amount: expense.amount,
      category: expense.category,
      subcategory: expense.subcategory || '',
      date: expense.date,
      paymentMethod: expense.paymentMethod,
      vendor: expense.vendor || '',
      billNumber: expense.billNumber || '',
      status: expense.status,
      tags: expense.tags.join(', '),
      isRecurring: expense.isRecurring,
      recurringPeriod: expense.recurringPeriod || 'monthly'
    });
    setIsDialogOpen(true);
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
          receiptImage: data.secure_url,
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

  const updateStatus = async (expenseId: string, newStatus: Expense['status']) => {
    try {
      const updateData: any = {
        status: newStatus,
        updatedAt: serverTimestamp()
      };

      if (newStatus === 'approved' && userData?.role === 'admin') {
        updateData.approvedBy = userData.name;
      }

      await updateDoc(doc(db, 'expenses', expenseId), updateData);
      toast({
        title: "Success",
        description: "Status updated successfully",
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

  const getStatusColor = (status: Expense['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'paid': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.date);
    const monthMatch = expenseDate.getMonth() === selectedMonth;
    const yearMatch = expenseDate.getFullYear() === selectedYear;
    const categoryMatch = selectedCategory === 'all' || expense.category === selectedCategory;
    
    return monthMatch && yearMatch && categoryMatch;
  });

  const monthlyTotal = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const approvedExpenses = filteredExpenses.filter(exp => exp.status === 'approved' || exp.status === 'paid');
  const pendingExpenses = filteredExpenses.filter(exp => exp.status === 'pending');

  // Category-wise breakdown
  const categoryBreakdown = categories.map(cat => {
    const categoryExpenses = filteredExpenses.filter(exp => exp.category === cat.name);
    const total = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    return { name: cat.name, total, count: categoryExpenses.length };
  }).filter(cat => cat.total > 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Expenses</h1>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Expense Tracker</h1>
          <p className="text-gray-600">Track and manage business expenses</p>
        </div>
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
                  placeholder="e.g., Fabric Purchase, Electricity Bill"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={formData.category}
                    onChange={(e) => {
                      setFormData({...formData, category: e.target.value, subcategory: ''});
                    }}
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat.name} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="subcategory">Subcategory</Label>
                  <select
                    id="subcategory"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={formData.subcategory}
                    onChange={(e) => setFormData({...formData, subcategory: e.target.value})}
                    disabled={!formData.category}
                  >
                    <option value="">Select subcategory</option>
                    {formData.category && categories.find(cat => cat.name === formData.category)?.subcategories.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
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
                    onChange={(e) => setFormData({...formData, paymentMethod: e.target.value as Expense['paymentMethod']})}
                    required
                  >
                    {paymentMethods.map(method => (
                      <option key={method.value} value={method.value}>{method.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as Expense['status']})}
                    required
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="paid">Paid</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vendor">Vendor/Supplier</Label>
                  <Input
                    id="vendor"
                    value={formData.vendor}
                    onChange={(e) => setFormData({...formData, vendor: e.target.value})}
                    placeholder="Vendor or supplier name"
                  />
                </div>
                <div>
                  <Label htmlFor="billNumber">Bill/Invoice Number</Label>
                  <Input
                    id="billNumber"
                    value={formData.billNumber}
                    onChange={(e) => setFormData({...formData, billNumber: e.target.value})}
                    placeholder="Bill or invoice number"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Additional details about the expense"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({...formData, tags: e.target.value})}
                  placeholder="e.g., urgent, recurring, tax-deductible"
                />
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({...formData, isRecurring: e.target.checked})}
                  />
                  <Label htmlFor="isRecurring">Recurring Expense</Label>
                </div>
                {formData.isRecurring && (
                  <select
                    className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={formData.recurringPeriod}
                    onChange={(e) => setFormData({...formData, recurringPeriod: e.target.value as 'monthly' | 'quarterly' | 'yearly'})}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                )}
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

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Label>Filter by:</Label>
            </div>
            <select
              className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>
                  {new Date(0, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                return (
                  <option key={year} value={year}>{year}</option>
                );
              })}
            </select>
            <select
              className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat.name} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Monthly Total</CardTitle>
            <DollarSign className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">₹{monthlyTotal.toLocaleString()}</div>
            <p className="text-xs text-gray-500">{filteredExpenses.length} expenses</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Approved</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              ₹{approvedExpenses.reduce((sum, exp) => sum + exp.amount, 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">{approvedExpenses.length} expenses</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
            <TrendingDown className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              ₹{pendingExpenses.reduce((sum, exp) => sum + exp.amount, 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">{pendingExpenses.length} expenses</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Categories</CardTitle>
            <Receipt className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{categoryBreakdown.length}</div>
            <p className="text-xs text-gray-500">Active categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
            <CardDescription>
              Expenses by category for {new Date(0, selectedMonth).toLocaleString('default', { month: 'long' })} {selectedYear}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryBreakdown.map(cat => (
                <div key={cat.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{cat.name}</div>
                    <div className="text-sm text-gray-500">{cat.count} expenses</div>
                  </div>
                  <div className="font-bold text-gray-900">₹{cat.total.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expenses List */}
      {filteredExpenses.length > 0 ? (
        <div className="space-y-4">
          {filteredExpenses.map((expense) => (
            <Card key={expense.id} className="hover:shadow-lg transition-all duration-300 border-0 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{expense.title}</h3>
                      <Badge className={getStatusColor(expense.status)} variant="outline">
                        {expense.status}
                      </Badge>
                      {expense.isRecurring && (
                        <Badge variant="outline" className="bg-blue-100 text-blue-700">
                          Recurring
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Amount:</span>
                        <div className="font-semibold text-lg">₹{expense.amount.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Category:</span>
                        <div className="font-medium">{expense.category}</div>
                        {expense.subcategory && (
                          <div className="text-xs text-gray-500">{expense.subcategory}</div>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-600">Date:</span>
                        <div className="font-medium">{new Date(expense.date).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Payment:</span>
                        <div className="font-medium capitalize">{expense.paymentMethod}</div>
                      </div>
                    </div>

                    {expense.description && (
                      <p className="text-gray-600 mt-2">{expense.description}</p>
                    )}

                    {(expense.vendor || expense.billNumber) && (
                      <div className="flex space-x-4 mt-2 text-sm text-gray-600">
                        {expense.vendor && <span>Vendor: {expense.vendor}</span>}
                        {expense.billNumber && <span>Bill: {expense.billNumber}</span>}
                      </div>
                    )}

                    {expense.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {expense.tags.map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col space-y-2 ml-4">
                    {expense.receiptImage ? (
                      <img 
                        src={expense.receiptImage} 
                        alt="Receipt" 
                        className="w-20 h-20 object-cover rounded border cursor-pointer"
                        onClick={() => window.open(expense.receiptImage, '_blank')}
                      />
                    ) : (
                      <div>
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
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById(`receipt-${expense.id}`)?.click()}
                          disabled={uploadingReceipt}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Receipt
                        </Button>
                      </div>
                    )}

                    <div className="flex flex-col space-y-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(expense)}
                      >
                        Edit
                      </Button>
                      
                      {userData?.role === 'admin' && expense.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 hover:bg-green-50"
                            onClick={() => updateStatus(expense.id, 'approved')}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => updateStatus(expense.id, 'rejected')}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      
                      {expense.status === 'approved' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600 hover:bg-blue-50"
                          onClick={() => updateStatus(expense.id, 'paid')}
                        >
                          Mark Paid
                        </Button>
                      )}
                    </div>
                  </div>
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
              {selectedCategory !== 'all' || selectedMonth !== new Date().getMonth() 
                ? 'Try adjusting your filters.' 
                : 'Start by adding your first expense.'
              }
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
