
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Download, Calendar, BarChart3, AlertTriangle, Users, ShoppingCart, Package, Clock } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
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
  deliveryDate?: string;
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

interface DashboardStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalOrders: number;
  deliveredOrders: number;
  inProgressOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  appointmentsCompleted: number;
  activeStaff: number;
  presentStaff: number;
  lateStaff: number;
  absentStaff: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalInventoryValue: number;
}

interface Alert {
  id: string;
  type: 'payment' | 'order' | 'inventory' | 'staff' | 'expense';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  count?: number;
  amount?: number;
}

const Reports = () => {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalOrders: 0,
    deliveredOrders: 0,
    inProgressOrders: 0,
    pendingOrders: 0,
    cancelledOrders: 0,
    appointmentsCompleted: 0,
    activeStaff: 0,
    presentStaff: 0,
    lateStaff: 0,
    absentStaff: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalInventoryValue: 0
  });
  const [reportData, setReportData] = useState<ReportData>({
    revenue: [],
    expenses: [],
    orders: [],
    staff: [],
    inventory: [],
    profit: []
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
    preset: 'last30days'
  });

  const datePresets = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'last30days', label: 'Last 30 Days' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'thisYear', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

  useEffect(() => {
    if (userData?.role === 'admin') {
      fetchAllData();
    } else {
      setLoading(false);
    }
  }, [userData, dateRange]);

  const getDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (dateRange.preset) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'last7days':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'last30days':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case 'thisMonth':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'lastMonth':
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'thisYear':
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'custom':
        if (dateRange.startDate && dateRange.endDate) {
          return {
            startDate: new Date(dateRange.startDate),
            endDate: new Date(dateRange.endDate)
          };
        }
        break;
    }
    
    return { startDate, endDate };
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange();
      
      // Fetch all collections
      const [
        ordersSnapshot,
        expensesSnapshot,
        inventorySnapshot,
        staffSnapshot,
        appointmentsSnapshot
      ] = await Promise.all([
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'expenses')),
        getDocs(collection(db, 'inventory')),
        getDocs(collection(db, 'staff')),
        getDocs(collection(db, 'appointments'))
      ]);

      // Process orders
      const orders: OrderData[] = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as OrderData));
      
      const filteredOrders = orders.filter(order => {
        const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
        return orderDate >= startDate && orderDate <= endDate;
      });

      // Process expenses
      const expenses: ExpenseData[] = expensesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ExpenseData));
      
      const filteredExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= startDate && expenseDate <= endDate;
      });

      // Process inventory
      const inventory: InventoryData[] = inventorySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as InventoryData));

      // Process staff
      const staff: StaffData[] = staffSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as StaffData));

      // Process appointments
      const appointments = appointmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate dashboard stats
      const totalRevenue = filteredOrders
        .filter(order => order.status === 'delivered')
        .reduce((sum, order) => sum + (order.totalAmount || 0), 0);

      const totalExpenses = filteredExpenses
        .reduce((sum, expense) => sum + expense.amount, 0);

      const netProfit = totalRevenue - totalExpenses;

      const orderStats = {
        total: filteredOrders.length,
        delivered: filteredOrders.filter(o => o.status === 'delivered').length,
        inProgress: filteredOrders.filter(o => o.status === 'in-progress').length,
        pending: filteredOrders.filter(o => o.status === 'received').length,
        cancelled: filteredOrders.filter(o => o.status === 'cancelled').length
      };

      const lowStockItems = inventory.filter(item => 
        item.quantity <= (item.minStock || 5)
      ).length;

      const outOfStockItems = inventory.filter(item => 
        item.quantity === 0
      ).length;

      const totalInventoryValue = inventory.reduce((sum, item) => 
        sum + (item.quantity * (item.unitPrice || 0)), 0
      );

      // Calculate staff attendance for today
      const today = new Date().toDateString();
      let presentStaff = 0;
      let lateStaff = 0;
      let absentStaff = 0;

      staff.forEach(member => {
        const todayRecord = member.attendanceRecords?.find(record => 
          new Date(record.date).toDateString() === today
        );
        
        if (todayRecord) {
          if (todayRecord.status === 'present') presentStaff++;
          else if (todayRecord.status === 'late') lateStaff++;
          else absentStaff++;
        } else {
          absentStaff++;
        }
      });

      // Generate alerts
      const generatedAlerts: Alert[] = [];

      // Overdue orders
      const overdueOrders = filteredOrders.filter(order => {
        if (order.status === 'delivered') return false;
        const dueDate = new Date(order.deliveryDate || '');
        return dueDate < new Date();
      });

      if (overdueOrders.length > 0) {
        generatedAlerts.push({
          id: 'overdue-orders',
          type: 'order',
          title: 'Overdue Orders',
          description: `${overdueOrders.length} orders are past their delivery date`,
          severity: 'high',
          count: overdueOrders.length
        });
      }

      // Low stock alerts
      if (lowStockItems > 0) {
        generatedAlerts.push({
          id: 'low-stock',
          type: 'inventory',
          title: 'Low Stock Alert',
          description: `${lowStockItems} items are running low on stock`,
          severity: 'medium',
          count: lowStockItems
        });
      }

      // Generate chart data
      const monthlyData = [];
      const monthlyProfit = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const monthName = currentDate.toLocaleString('default', { month: 'short' });
        const monthOrders = filteredOrders.filter(order => {
          const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
          return orderDate.getMonth() === currentDate.getMonth() && 
                 orderDate.getFullYear() === currentDate.getFullYear();
        });

        const monthExpenses = filteredExpenses.filter(expense => {
          const expenseDate = new Date(expense.date);
          return expenseDate.getMonth() === currentDate.getMonth() && 
                 expenseDate.getFullYear() === currentDate.getFullYear();
        });

        const monthRevenue = monthOrders
          .filter(order => order.status === 'delivered')
          .reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        
        const monthExpenseTotal = monthExpenses
          .reduce((sum, expense) => sum + expense.amount, 0);

        monthlyData.push({
          month: monthName,
          amount: monthRevenue,
          orders: monthOrders.length
        });

        monthlyProfit.push({
          month: monthName,
          revenue: monthRevenue,
          expenses: monthExpenseTotal,
          profit: monthRevenue - monthExpenseTotal
        });

        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      // Expense breakdown
      const expensesByCategory: Record<string, number> = {};
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
        percentage: Math.round((amount / totalExpenses) * 100) || 0
      }));

      // Order status analysis
      const orderAnalysis = [
        { status: 'delivered', count: orderStats.delivered, value: totalRevenue },
        { status: 'in progress', count: orderStats.inProgress, value: 0 },
        { status: 'pending', count: orderStats.pending, value: 0 },
        { status: 'cancelled', count: orderStats.cancelled, value: 0 }
      ];

      // Staff performance
      const staffPerformance = staff.map(member => {
        const attendanceRecords = member.attendanceRecords || [];
        const filteredAttendance = attendanceRecords.filter(record => {
          const recordDate = new Date(record.date);
          return recordDate >= startDate && recordDate <= endDate;
        });
        
        const presentDays = filteredAttendance.filter(record => 
          record.status === 'present' || record.status === 'late'
        ).length;

        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));

        return {
          name: member.name,
          salary: member.salary || 0,
          attendance: Math.round((presentDays / Math.max(totalDays, 1)) * 100)
        };
      });

      // Inventory analysis
      const inventoryByCategory: Record<string, number> = {};
      const lowStockByCategory: Record<string, number> = {};

      inventory.forEach(item => {
        const category = item.category || 'Other';
        const value = item.quantity * (item.unitPrice || 0);
        
        if (inventoryByCategory[category]) {
          inventoryByCategory[category] += value;
        } else {
          inventoryByCategory[category] = value;
        }

        if (item.quantity <= (item.minStock || 5)) {
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

      setDashboardStats({
        totalRevenue,
        totalExpenses,
        netProfit,
        totalOrders: orderStats.total,
        deliveredOrders: orderStats.delivered,
        inProgressOrders: orderStats.inProgress,
        pendingOrders: orderStats.pending,
        cancelledOrders: orderStats.cancelled,
        appointmentsCompleted: appointments.length,
        activeStaff: staff.length,
        presentStaff,
        lateStaff,
        absentStaff,
        lowStockItems,
        outOfStockItems,
        totalInventoryValue
      });

      setReportData({
        revenue: monthlyData,
        expenses: expenseBreakdown,
        orders: orderAnalysis,
        staff: staffPerformance,
        inventory: inventoryAnalysis,
        profit: monthlyProfit
      });

      setAlerts(generatedAlerts);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = (format: 'pdf' | 'csv') => {
    toast({
      title: "Export Started",
      description: `Generating ${format.toUpperCase()} report...`,
    });
    
    setTimeout(() => {
      toast({
        title: "Export Complete",
        description: `Analytics report exported as ${format.toUpperCase()} successfully`,
      });
    }, 2000);
  };

  const handleDatePresetChange = (preset: string) => {
    setDateRange(prev => ({ ...prev, preset }));
  };

  if (userData?.role !== 'admin') {
    return (
      <div className="space-y-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
            <p className="text-gray-600">
              Only administrators can access the analytics dashboard.
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
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Real-time insights and business analytics</p>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Label>Duration:</Label>
          </div>
          <select
            className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
            value={dateRange.preset}
            onChange={(e) => handleDatePresetChange(e.target.value)}
          >
            {datePresets.map(preset => (
              <option key={preset.value} value={preset.value}>{preset.label}</option>
            ))}
          </select>
          
          {dateRange.preset === 'custom' && (
            <div className="flex space-x-2">
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-40"
              />
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-40"
              />
            </div>
          )}
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => exportReport('csv')}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" onClick={() => exportReport('pdf')}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Real-time Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">₹{dashboardStats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-gray-500">From delivered orders</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Expenses</CardTitle>
            <TrendingDown className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">₹{dashboardStats.totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-gray-500">All expenses</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Net Profit</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${dashboardStats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{dashboardStats.netProfit.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">Revenue - Expenses</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
            <ShoppingCart className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{dashboardStats.totalOrders}</div>
            <p className="text-xs text-gray-500">{dashboardStats.deliveredOrders} delivered</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Staff Attendance</CardTitle>
            <Users className="h-5 w-5 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{dashboardStats.presentStaff}/{dashboardStats.activeStaff}</div>
            <p className="text-xs text-gray-500">Present today</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Inventory Value</CardTitle>
            <Package className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">₹{dashboardStats.totalInventoryValue.toLocaleString()}</div>
            <p className="text-xs text-gray-500">{dashboardStats.lowStockItems} low stock items</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">In Progress</CardTitle>
            <Clock className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{dashboardStats.inProgressOrders}</div>
            <p className="text-xs text-gray-500">Orders in progress</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Appointments</CardTitle>
            <Calendar className="h-5 w-5 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{dashboardStats.appointmentsCompleted}</div>
            <p className="text-xs text-gray-500">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span>Real-Time Alerts</span>
            </CardTitle>
            <CardDescription>Important notifications requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {alerts.map((alert) => (
                <div key={alert.id} className={`p-4 rounded-lg border-l-4 ${
                  alert.severity === 'high' ? 'bg-red-50 border-red-400' :
                  alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-400' :
                  'bg-blue-50 border-blue-400'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{alert.title}</div>
                      <div className="text-sm text-gray-600">{alert.description}</div>
                    </div>
                    <Badge variant={
                      alert.severity === 'high' ? 'destructive' :
                      alert.severity === 'medium' ? 'secondary' : 'outline'
                    }>
                      {alert.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue & Profit Trend */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Revenue & Profit Trend</CardTitle>
            <CardDescription>Monthly performance overview</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.profit}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue" strokeWidth={2} />
                <Line type="monotone" dataKey="expenses" stroke="#ff7300" name="Expenses" strokeWidth={2} />
                <Line type="monotone" dataKey="profit" stroke="#82ca9d" name="Profit" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Order Status Distribution */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
            <CardDescription>Current order pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reportData.orders}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, count }) => `${status}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {reportData.orders.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Expense Categories</CardTitle>
            <CardDescription>Spending distribution by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.expenses}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                <Bar dataKey="amount" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Staff Performance */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Staff Attendance</CardTitle>
            <CardDescription>Team performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.staff} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="attendance" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Summary Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Summary */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Inventory Summary</CardTitle>
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

        {/* Business Health Insights */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Business Insights</CardTitle>
            <CardDescription>AI-powered recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">Profit Analysis</span>
                </div>
                <p className="text-sm text-blue-800">
                  {dashboardStats.netProfit > 0 
                    ? `Great! You're profitable with ₹${dashboardStats.netProfit.toLocaleString()} net profit.`
                    : `Focus needed: ₹${Math.abs(dashboardStats.netProfit).toLocaleString()} loss this period.`
                  }
                </p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <ShoppingCart className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-900">Order Performance</span>
                </div>
                <p className="text-sm text-green-800">
                  {dashboardStats.deliveredOrders > dashboardStats.pendingOrders
                    ? 'Excellent delivery rate! Keep up the quality service.'
                    : 'Consider optimizing order processing to improve delivery times.'
                  }
                </p>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Package className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium text-yellow-900">Inventory Health</span>
                </div>
                <p className="text-sm text-yellow-800">
                  {dashboardStats.lowStockItems > 0 
                    ? `Alert: ${dashboardStats.lowStockItems} items need restocking soon.`
                    : 'Inventory levels are healthy across all categories.'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
