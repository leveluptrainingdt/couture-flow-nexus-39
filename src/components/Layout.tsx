import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  Users, 
  ShoppingBag, 
  Package, 
  Calendar, 
  Scissors, 
  UserPlus, 
  DollarSign, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Shield,
  ChevronDown,
  User,
  Receipt
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { userData } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isAdmin = userData?.role === 'admin';
  const isStaff = userData?.role === 'staff';

  const adminMenuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Orders', href: '/orders', icon: ShoppingBag },
    { name: 'Billing', href: '/billing', icon: Receipt },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Inventory', href: '/inventory', icon: Package },
    { name: 'Appointments', href: '/appointments', icon: Calendar },
    { name: 'Alterations', href: '/alterations', icon: Scissors },
    { name: 'Staff', href: '/staff', icon: UserPlus },
    { name: 'Expenses', href: '/expenses', icon: DollarSign },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Admin Panel', href: '/admin', icon: Shield },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  const staffMenuItems = [
    { name: 'Dashboard', href: '/staff/dashboard', icon: LayoutDashboard },
    { name: 'Orders', href: '/orders', icon: ShoppingBag },
    { name: 'Billing', href: '/billing', icon: Receipt },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Inventory', href: '/inventory', icon: Package },
    { name: 'Appointments', href: '/appointments', icon: Calendar },
    { name: 'Alterations', href: '/alterations', icon: Scissors },
  ];

  const menuItems = isAdmin ? adminMenuItems : staffMenuItems;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SC</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Swetha's Couture</h1>
                <p className="text-xs text-gray-500">{isAdmin ? 'Admin Panel' : 'Staff Panel'}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="lg:hidden"
              onClick={closeSidebar}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={closeSidebar}
                  className={`
                    flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150
                    ${isActive 
                      ? 'bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 border-l-4 border-purple-500' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-purple-600' : 'text-gray-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile Section */}
          <div className="border-t border-gray-200 p-4">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900">{userData?.name || 'User'}</p>
                  <p className="text-xs text-gray-500">{userData?.email}</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* User Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{userData?.name}</p>
                    <p className="text-xs text-gray-500">{userData?.email}</p>
                    <Badge 
                      variant="outline" 
                      className={`mt-1 text-xs ${isAdmin ? 'text-purple-600 border-purple-200' : 'text-blue-600 border-blue-200'}`}
                    >
                      {isAdmin ? 'Administrator' : 'Staff Member'}
                    </Badge>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        {/* Top Navigation Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-6 lg:px-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {menuItems.find(item => item.href === location.pathname)?.name || 'Dashboard'}
              </h2>
              <p className="text-sm text-gray-500">
                Welcome back, {userData?.name}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Badge 
              variant="outline" 
              className={`${isAdmin ? 'text-purple-600 border-purple-200' : 'text-blue-600 border-blue-200'}`}
            >
              {isAdmin ? 'Admin' : 'Staff'}
            </Badge>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
