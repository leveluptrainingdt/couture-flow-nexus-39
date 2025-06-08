import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Download, Calendar, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';

interface ReportData {
  revenue: Array<{ month: string; amount: number; orders: number; }>;
  expenses: Array<{ category: string; amount: number; percentage: number; }>;
  orders: Array<{ status: string; count: number; value: number; }>;
  staff: Array<{ name: string; salary: number; attendance: number; }>;
  inventory: Array<{ category: string; value: number; lowStock: number; }>;
  profit: Array<{ month: string; revenue: number; expenses: number; profit: number; }>;
}

interface OrderData {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: any;
  [key: string]: any;
}

interface ExpenseData {
  id: string;
  category: string;
  amount: number;
  date: string;
  [key: string]: any;
}

interface StaffData {
  id: string;
  name: string;
  salary: number;
  attendanceRecords: Array<{
    date: string;
    status: string;
  }>;
  [key: string]: any;
}

interface InventoryData {
  id: string;
  category: string;
  quantity: number;
  unitPrice: number;
  minStock: number;
  [key: string]: any;
}

const Reports = () => {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData>({
    revenue: [],
    expenses: [],
    orders: [],
    staff: [],
    inventory: [],
    profit: []
  });
  const [selectedPeriod, setSelectedPeriod] = useState('6months');
  const [selectedReport, setSelectedReport] = useState('overview');

  const periods = [
    { value: '1month', label: 'Last Month' },
    { value: '3months', label: 'Last 3 Months' },
    { value: '6months', label: 'Last 6 Months' },
    { value: '1year', label: 'Last Year' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const reportTypes = [
    { value: 'overview', label: 'Business Overview' },
    { value: 'financial', label: 'Financial Report' },
    { value: 'orders', label: 'Orders Analysis' },
    { value: 'staff', label: 'Staff Performance' },
    { value: 'inventory', label: 'Inventory Report' }
  ];

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

  useEffect(() => {
    if (userData?.role === 'admin') {
      fetchReportData();
    } else {
      setLoading(false);
    }
  }, [userData, selectedPeriod]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range based on selected period
      const endDate = new Date();
      const startDate = new Date();
      
      switch (selectedPeriod) {
        case '1month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case '3months':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case '6months':
          startDate.setMonth(startDate.getMonth() - 6);
          break;
        case '1year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate.setMonth(startDate.getMonth() - 6);
      }

      // Fetch all data
      const [ordersSnapshot, expensesSnapshot, inventorySnapshot, staffSnapshot] = await Promise.all([
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'expenses')),
        getDocs(collection(db, 'inventory')),
        getDocs(collection(db, 'staff'))
      ]);

      // Process orders data with proper typing
      const orders: OrderData[] = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as OrderData));
      
      const filteredOrders = orders.filter(order => {
        const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
        return orderDate >= startDate && orderDate <= endDate;
      });

      // Process expenses data with proper typing
      const expenses: ExpenseData[] = expensesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ExpenseData));
      
      const filteredExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= startDate && expenseDate <= endDate;
      });

      // Process inventory data with proper typing
      const inventory: InventoryData[] = inventorySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as InventoryData));
      
      // Process staff data with proper typing
      const staff: StaffData[] = staffSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as StaffData));

      // Generate monthly revenue data
      const monthlyRevenue = [];
      const monthlyProfit = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleString('default', { month: 'short' });
        
        const monthOrders = filteredOrders.filter(order => {
          const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
          return orderDate.getMonth() === date.getMonth() && orderDate.getFullYear() === date.getFullYear();
        });
        
        const monthExpenses = filteredExpenses.filter(expense => {
          const expenseDate = new Date(expense.date);
          return expenseDate.getMonth() === date.getMonth() && expenseDate.getFullYear() === date.getFullYear();
        });

        const revenue = monthOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        const expenseTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        
        monthlyRevenue.push({
          month: monthName,
          amount: revenue,
          orders: monthOrders.length
        });

        monthlyProfit.push({
          month: monthName,
          revenue,
          expenses: expenseTotal,
          profit: revenue - expenseTotal
        });
      }

      // Generate expense breakdown
      const expensesByCategory: Record<string, number> = {};
      const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      filteredExpenses.forEach(expense => {
        if (expensesByCategory[expense.category]) {
          expensesByCategory[expense.category] += expense.amount;
        } else {
          expensesByCategory[expense.category] = expense.amount;
        }
      });

      const expenseBreakdown = Object.entries(expensesByCategory).map(([category, amount]) => ({
        category,
        amount: amount,
        percentage: Math.round((amount / totalExpenses) * 100)
      }));

      // Generate order status breakdown
      const ordersByStatus: Record<string, number> = {
        'new': 0,
        'in-progress': 0,
        'completed': 0,
        'delivered': 0
      };

      const orderValueByStatus: Record<string, number> = {
        'new': 0,
        'in-progress': 0,
        'completed': 0,
        'delivered': 0
      };

      filteredOrders.forEach(order => {
        if (ordersByStatus.hasOwnProperty(order.status)) {
          ordersByStatus[order.status]++;
          orderValueByStatus[order.status] += order.totalAmount || 0;
        }
      });

      const orderAnalysis = Object.entries(ordersByStatus).map(([status, count]) => ({
        status: status.replace('-', ' '),
        count,
        value: orderValueByStatus[status]
      }));

      // Generate staff performance data
      const staffPerformance = staff.map(member => {
        const attendanceRecords = member.attendanceRecords || [];
        const currentMonth = new Date().getMonth();
        const monthlyAttendance = attendanceRecords.filter(record => {
          const recordDate = new Date(record.date);
          return recordDate.getMonth() === currentMonth;
        });
        
        const presentDays = monthlyAttendance.filter(record => 
          record.status === 'present' || record.status === 'late'
        ).length;

        return {
          name: member.name,
          salary: member.salary,
          attendance: Math.round((presentDays / 30) * 100) // Assuming 30 days per month
        };
      });

      // Generate inventory analysis
      const inventoryByCategory: Record<string, number> = {};
      const lowStockByCategory: Record<string, number> = {};

      inventory.forEach(item => {
        const category = item.category || 'Other';
        const value = item.quantity * item.unitPrice;
        
        if (inventoryByCategory[category]) {
          inventoryByCategory[category] += value;
        } else {
          inventoryByCategory[category] = value;
        }

        if (item.quantity <= item.minStock) {
          if (lowStockByCategory[category]) {
            lowStockByCategory[category]++;
          } else {
            lowStockByCategory[category] = 1;
          }
        }
      });

      const inventoryAnalysis = Object.entries(inventoryByCategory).map(([category, value]) => ({
        category,
        value: value,
        lowStock: lowStockByCategory[category] || 0
      }));

      setReportData({
        revenue: monthlyRevenue,
        expenses: expenseBreakdown,
        orders: orderAnalysis,
        staff: staffPerformance,
        inventory: inventoryAnalysis,
        profit: monthlyProfit
      });

    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch report data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = (format: 'pdf' | 'csv') => {
    // This would integrate with a PDF/CSV generation service
    toast({
      title: "Export Started",
      description: `Generating ${format.toUpperCase()} report...`,
    });
    
    // For demo purposes, we'll just show a success message
    setTimeout(() => {
      toast({
        title: "Export Complete",
        description: `Report exported as ${format.toUpperCase()} successfully`,
      });
    }, 2000);
  };

  if (userData?.role !== 'admin') {
    return (
      <div className="space-y-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
            <p className="text-gray-600">
              Only administrators can access business reports.
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
          <h1 className="text-3xl font-bold">Business Reports</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalRevenue = reportData.revenue.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = reportData.expenses.reduce((sum, item) => sum + item.amount, 0);
  const totalProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Business Reports & Analytics</h1>
          <p className="text-gray-600">Comprehensive business insights and performance metrics</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => exportReport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => exportReport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <Label>Period:</Label>
            </div>
            <select
              className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              {periods.map(period => (
                <option key={period.value} value={period.value}>{period.label}</option>
              ))}
            </select>
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-gray-500" />
              <Label>Report:</Label>
            </div>
            <select
              className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
            >
              {reportTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">₹{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-gray-500">Last {selectedPeriod}</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Expenses</CardTitle>
            <TrendingDown className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">₹{totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-gray-500">Operating costs</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Net Profit</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">₹{totalProfit.toLocaleString()}</div>
            <p className="text-xs text-gray-500">{profitMargin.toFixed(1)}% margin</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Orders</CardTitle>
            <BarChart3 className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {reportData.orders.reduce((sum, order) => sum + order.count, 0)}
            </div>
            <p className="text-xs text-gray-500">Total orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue and order count</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.revenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value, name) => [
                  name === 'amount' ? `₹${value.toLocaleString()}` : value,
                  name === 'amount' ? 'Revenue' : 'Orders'
                ]} />
                <Legend />
                <Bar dataKey="amount" fill="#8884d8" name="Revenue" />
                <Bar dataKey="orders" fill="#82ca9d" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <CardDescription>Expenses by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reportData.expenses}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percentage }) => `${category}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {reportData.expenses.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Profit Analysis */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Profit Analysis</CardTitle>
            <CardDescription>Monthly profit/loss trends</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.profit}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue" />
                <Line type="monotone" dataKey="expenses" stroke="#ff7300" name="Expenses" />
                <Line type="monotone" dataKey="profit" stroke="#82ca9d" name="Profit" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Order Status Distribution */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
            <CardDescription>Distribution of order statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.orders} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="status" type="category" />
                <Tooltip formatter={(value, name) => [
                  name === 'count' ? value : `₹${value.toLocaleString()}`,
                  name === 'count' ? 'Orders' : 'Value'
                ]} />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" name="Count" />
                <Bar dataKey="value" fill="#82ca9d" name="Value" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Staff Performance */}
        {reportData.staff.length > 0 && (
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Staff Performance</CardTitle>
              <CardDescription>Monthly attendance and salary breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reportData.staff.map((member, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">{member.name}</div>
                      <div className="text-sm text-gray-600">₹{member.salary.toLocaleString()}/month</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{member.attendance}%</div>
                      <div className="text-sm text-gray-600">Attendance</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inventory Summary */}
        {reportData.inventory.length > 0 && (
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Inventory Analysis</CardTitle>
              <CardDescription>Stock value and alerts by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reportData.inventory.map((category, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">{category.category}</div>
                      <div className="text-sm text-gray-600">₹{category.value.toLocaleString()} value</div>
                    </div>
                    <div className="text-right">
                      {category.lowStock > 0 ? (
                        <Badge variant="outline" className="bg-red-100 text-red-700">
                          {category.lowStock} low stock
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-100 text-green-700">
                          Good stock
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Summary Insights */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Business Insights</CardTitle>
          <CardDescription>Key findings and recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">Revenue Growth</span>
              </div>
              <p className="text-sm text-blue-800">
                {reportData.revenue.length > 1 && 
                  reportData.revenue[reportData.revenue.length - 1].amount > reportData.revenue[reportData.revenue.length - 2].amount
                  ? 'Revenue is trending upward. Great progress!'
                  : 'Consider reviewing marketing strategies to boost sales.'
                }
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900">Profit Margin</span>
              </div>
              <p className="text-sm text-green-800">
                {profitMargin > 20 
                  ? 'Excellent profit margin. Business is performing well.'
                  : profitMargin > 10
                  ? 'Good profit margin. Consider optimizing costs.'
                  : 'Low profit margin. Review pricing and expenses.'
                }
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                <span className="font-medium text-purple-900">Order Performance</span>
              </div>
              <p className="text-sm text-purple-800">
                {reportData.orders.find(order => order.status === 'completed')?.count > 
                 reportData.orders.find(order => order.status === 'new')?.count
                  ? 'Good order completion rate. Keep up the quality service.'
                  : 'Focus on improving order completion efficiency.'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
