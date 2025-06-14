
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  ShoppingCart, 
  Package, 
  Calendar,
  Settings,
  Scissors,
  DollarSign,
  TrendingUp,
  UserPlus,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useRealTimeStats } from '@/hooks/useRealTimeData';

const Admin = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const { stats, loading, error } = useRealTimeStats();

  if (!userData) {
    return <LoadingSpinner type="page" />;
  }

  if (loading) {
    return <LoadingSpinner type="page" />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load admin panel</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const adminCards = [
    {
      title: 'Orders Management',
      description: 'Manage customer orders and track progress',
      icon: ShoppingCart,
      route: '/orders',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      count: stats?.totalOrders || 0
    },
    {
      title: 'Inventory Control',
      description: 'Track materials, fabrics, and supplies',
      icon: Package,
      route: '/inventory',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      count: stats?.lowStockItems || 0,
      countLabel: 'Low Stock'
    },
    {
      title: 'Staff Management',
      description: 'Manage staff and assignments',
      icon: Users,
      route: '/staff',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Appointments',
      description: 'Schedule and manage appointments',
      icon: Calendar,
      route: '/appointments',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      count: stats?.todaysAppointments || 0,
      countLabel: 'Today'
    },
    {
      title: 'Alterations',
      description: 'Handle alteration requests',
      icon: Scissors,
      route: '/alterations',
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Settings',
      description: 'Configure system settings',
      icon: Settings,
      route: '/settings',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Admin Control Panel</h1>
        <p className="text-white/90">
          Manage all aspects of your tailoring business
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">₹{(stats?.totalRevenue || 0).toLocaleString()}</div>
            <p className="text-xs text-gray-500">From delivered orders</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Orders</CardTitle>
            <ShoppingCart className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.activeOrders || 0}</div>
            <p className="text-xs text-gray-500">In progress</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Customers</CardTitle>
            <Users className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.totalCustomers || 0}</div>
            <p className="text-xs text-gray-500">Registered</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Low Stock</CardTitle>
            <Package className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.lowStockItems || 0}</div>
            <p className="text-xs text-gray-500">Items need reordering</p>
          </CardContent>
        </Card>
      </div>

      {/* Admin Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminCards.map((card, index) => (
          <Card 
            key={index} 
            className="hover:shadow-lg transition-all duration-300 border-0 shadow-md cursor-pointer"
            onClick={() => navigate(card.route)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
                {card.count !== undefined && (
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">{card.count}</div>
                    {card.countLabel && (
                      <div className="text-xs text-gray-500">{card.countLabel}</div>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-lg mb-2">{card.title}</CardTitle>
              <CardDescription className="text-gray-600">
                {card.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span>Quick Actions</span>
          </CardTitle>
          <CardDescription>Frequently used admin tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              className="p-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all duration-300 h-auto flex-col"
              onClick={() => navigate('/orders')}
            >
              <Plus className="h-6 w-6 mb-2" />
              <div className="text-sm font-medium">New Order</div>
            </Button>
            <Button 
              className="p-4 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:shadow-lg transition-all duration-300 h-auto flex-col"
              onClick={() => navigate('/inventory')}
            >
              <Package className="h-6 w-6 mb-2" />
              <div className="text-sm font-medium">Add Inventory</div>
            </Button>
            <Button 
              className="p-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:shadow-lg transition-all duration-300 h-auto flex-col"
              onClick={() => navigate('/appointments')}
            >
              <Calendar className="h-6 w-6 mb-2" />
              <div className="text-sm font-medium">Book Appointment</div>
            </Button>
            <Button 
              className="p-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all duration-300 h-auto flex-col"
              onClick={() => navigate('/staff')}
            >
              <UserPlus className="h-6 w-6 mb-2" />
              <div className="text-sm font-medium">Manage Staff</div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;
