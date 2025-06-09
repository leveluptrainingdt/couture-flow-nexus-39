
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  Package, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Plus,
  UserPlus
} from 'lucide-react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useNavigate } from 'react-router-dom';

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  orderItems: Array<{
    itemName: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  status: 'received' | 'in-progress' | 'ready' | 'delivered';
  deliveryDate: string;
  notes?: string;
  createdAt: any;
  measurements?: {
    chest?: string;
    waist?: string;
    length?: string;
    shoulder?: string;
  };
}

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  minStock?: number;
  price: number;
  category?: string;
}

interface Customer {
  id: string;
  name: string;
  totalOrders: number;
  totalSpent: number;
}

interface Alert {
  id: string;
  type: 'overdue' | 'low-stock' | 'payment';
  title: string;
  description: string;
  count?: number;
  amount?: number;
  severity: 'high' | 'medium' | 'low';
}

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  activeOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalCustomers: number;
  lowStockItems: number;
  todayAppointments: number;
}

const Dashboard = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalOrders: 0,
    activeOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalCustomers: 0,
    lowStockItems: 0,
    todayAppointments: 0
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch orders
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      const orders: Order[] = ordersSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Order));
      
      // Fetch recent orders
      const recentOrdersQuery = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const recentOrdersSnapshot = await getDocs(recentOrdersQuery);
      const recentOrdersData: Order[] = recentOrdersSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Order));

      // Fetch inventory
      const inventorySnapshot = await getDocs(collection(db, 'inventory'));
      const inventory: InventoryItem[] = inventorySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as InventoryItem));

      // Fetch customers
      const customersSnapshot = await getDocs(collection(db, 'customers'));
      const customers: Customer[] = customersSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Customer));

      // Calculate stats
      const totalOrders = orders.length;
      const activeOrders = orders.filter(order => 
        ['received', 'in-progress'].includes(order.status)
      ).length;
      const pendingOrders = orders.filter(order => order.status === 'received').length;
      const completedOrders = orders.filter(order => 
        ['ready', 'delivered'].includes(order.status)
      ).length;
      const totalRevenue = orders
        .filter(order => order.status === 'delivered')
        .reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      const lowStockItems = inventory.filter(item => 
        item.quantity < (item.minStock || 10)
      ).length;
      const totalCustomers = customers.length;

      // Generate alerts
      const generatedAlerts: Alert[] = [];
      
      // Overdue orders alert
      const overdueOrders = orders.filter(order => {
        if (order.status === 'delivered') return false;
        const dueDate = new Date(order.deliveryDate);
        const today = new Date();
        return dueDate < today;
      });
      
      if (overdueOrders.length > 0) {
        generatedAlerts.push({
          id: 'overdue-orders',
          type: 'overdue',
          title: 'Overdue Orders',
          description: `${overdueOrders.length} orders are past their delivery date`,
          count: overdueOrders.length,
          severity: 'high'
        });
      }

      // Low stock alert
      if (lowStockItems > 0) {
        const lowStockNames = inventory
          .filter(item => item.quantity < (item.minStock || 10))
          .slice(0, 3)
          .map(item => item.name)
          .join(', ');
        
        generatedAlerts.push({
          id: 'low-stock',
          type: 'low-stock',
          title: 'Low Stock Items',
          description: `${lowStockItems} items running low: ${lowStockNames}${lowStockItems > 3 ? '...' : ''}`,
          count: lowStockItems,
          severity: 'medium'
        });
      }

      // Payment status alert (mock data)
      const pendingPayments = orders
        .filter(order => order.status === 'delivered')
        .reduce((sum, order) => sum + (order.totalAmount || 0), 0) * 0.1; // Assume 10% pending
      
      if (pendingPayments > 0) {
        generatedAlerts.push({
          id: 'pending-payments',
          type: 'payment',
          title: 'Payment Updates',
          description: `₹${pendingPayments.toLocaleString()} in recent payments received`,
          amount: pendingPayments,
          severity: 'low'
        });
      }

      setStats({
        totalRevenue,
        totalOrders,
        activeOrders,
        pendingOrders,
        completedOrders,
        totalCustomers,
        lowStockItems,
        todayAppointments: 0 // Will be implemented with appointments
      });

      setRecentOrders(recentOrdersData);
      setAlerts(generatedAlerts);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'new-order':
        navigate('/orders');
        break;
      case 'add-inventory':
        navigate('/inventory');
        break;
      case 'book-appointment':
        navigate('/appointments');
        break;
      case 'staff-checkin':
        navigate('/staff');
        break;
      default:
        break;
    }
  };

  const statCards = [
    {
      title: 'Total Revenue',
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      description: 'From delivered orders',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      icon: ShoppingCart,
      description: 'All time orders',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Active Orders',
      value: stats.activeOrders,
      icon: Clock,
      description: 'In progress orders',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Pending Orders',
      value: stats.pendingOrders,
      icon: XCircle,
      description: 'Waiting to start',
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Completed Orders',
      value: stats.completedOrders,
      icon: CheckCircle,
      description: 'Ready & delivered',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Total Customers',
      value: stats.totalCustomers,
      icon: Users,
      description: 'Registered customers',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {userData?.name}!
        </h1>
        <p className="text-white/90">
          Here's what's happening with your business today.
        </p>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-all duration-300 border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {stat.value}
              </div>
              <p className="text-xs text-gray-500">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts Panel */}
      {alerts.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span>System Alerts</span>
            </CardTitle>
            <CardDescription>Important notifications and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5 text-purple-600" />
              <span>Recent Orders</span>
            </CardTitle>
            <CardDescription>Latest order activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">
                        {order.customerName}
                      </div>
                      <div className="text-sm text-gray-500">
                        Order #{order.id.slice(-6)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">
                        ₹{order.totalAmount?.toLocaleString()}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        order.status === 'ready' ? 'bg-blue-100 text-blue-700' :
                        order.status === 'in-progress' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {order.status?.replace('-', ' ')}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No recent orders found
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Quick Actions */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span>Quick Actions</span>
            </CardTitle>
            <CardDescription>Frequently used tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                className="p-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all duration-300 h-auto flex-col"
                onClick={() => handleQuickAction('new-order')}
              >
                <Plus className="h-6 w-6 mb-2" />
                <div className="text-sm font-medium">New Order</div>
              </Button>
              <Button 
                className="p-4 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:shadow-lg transition-all duration-300 h-auto flex-col"
                onClick={() => handleQuickAction('book-appointment')}
              >
                <Calendar className="h-6 w-6 mb-2" />
                <div className="text-sm font-medium">Book Appointment</div>
              </Button>
              <Button 
                className="p-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:shadow-lg transition-all duration-300 h-auto flex-col"
                onClick={() => handleQuickAction('add-inventory')}
              >
                <Package className="h-6 w-6 mb-2" />
                <div className="text-sm font-medium">Add Inventory</div>
              </Button>
              <Button 
                className="p-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all duration-300 h-auto flex-col"
                onClick={() => handleQuickAction('staff-checkin')}
              >
                <UserPlus className="h-6 w-6 mb-2" />
                <div className="text-sm font-medium">Staff Check-in</div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
