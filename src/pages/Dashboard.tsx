import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ShoppingCart, 
  Package, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  Users,
  Calendar
} from 'lucide-react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
  status: 'new' | 'in-progress' | 'completed' | 'delivered';
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

interface DashboardStats {
  totalOrders: number;
  activeOrders: number;
  totalRevenue: number;
  lowStockItems: number;
  todayAppointments: number;
  activeStaff: number;
}

const Dashboard = () => {
  const { userData } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    activeOrders: 0,
    totalRevenue: 0,
    lowStockItems: 0,
    todayAppointments: 0,
    activeStaff: 0
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

        // Calculate stats
        const totalOrders = orders.length;
        const activeOrders = orders.filter(order => 
          ['new', 'in-progress'].includes(order.status)
        ).length;
        const totalRevenue = orders
          .filter(order => order.status === 'completed')
          .reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        const lowStockItems = inventory.filter(item => 
          item.quantity < (item.minStock || 10)
        ).length;

        setStats({
          totalOrders,
          activeOrders,
          totalRevenue,
          lowStockItems,
          todayAppointments: 0, // Will be implemented with appointments
          activeStaff: 0 // Will be implemented with staff management
        });

        setRecentOrders(recentOrdersData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
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
      title: 'Total Revenue',
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      description: 'Completed orders',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStockItems,
      icon: AlertTriangle,
      description: 'Need restocking',
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                        order.status === 'completed' ? 'bg-green-100 text-green-700' :
                        order.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
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

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span>Quick Actions</span>
            </CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <button className="p-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all duration-300">
                <Package className="h-6 w-6 mx-auto mb-2" />
                <div className="text-sm font-medium">New Order</div>
              </button>
              <button className="p-4 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:shadow-lg transition-all duration-300">
                <Calendar className="h-6 w-6 mx-auto mb-2" />
                <div className="text-sm font-medium">Book Appointment</div>
              </button>
              <button className="p-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:shadow-lg transition-all duration-300">
                <Package className="h-6 w-6 mx-auto mb-2" />
                <div className="text-sm font-medium">Add Inventory</div>
              </button>
              <button className="p-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all duration-300">
                <Users className="h-6 w-6 mx-auto mb-2" />
                <div className="text-sm font-medium">Staff Check-in</div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
