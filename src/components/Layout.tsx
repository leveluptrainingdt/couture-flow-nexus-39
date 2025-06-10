
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Calendar, 
  Users, 
  DollarSign, 
  BarChart3, 
  Settings,
  LogOut,
  Crown,
  Menu,
  X,
  User,
  Shield
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { userData, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, access: ['admin', 'staff'] },
    { name: 'Orders', href: '/orders', icon: ShoppingCart, access: ['admin', 'staff'] },
    { name: 'Customers', href: '/customers', icon: User, access: ['admin', 'staff'] },
    { name: 'Inventory', href: '/inventory', icon: Package, access: ['admin', 'staff'] },
    { name: 'Appointments', href: '/appointments', icon: Calendar, access: ['admin', 'staff'] },
    { name: 'Alterations', href: '/alterations', icon: Settings, access: ['admin', 'staff'] },
    { name: 'Staff', href: '/staff', icon: Users, access: ['admin'] },
    { name: 'Expenses', href: '/expenses', icon: DollarSign, access: ['admin'] },
    { name: 'Reports', href: '/reports', icon: BarChart3, access: ['admin'] },
    { name: 'Admin Panel', href: '/admin', icon: Crown, access: ['admin'] },
    { name: 'Control Panel', href: '/admin/control-panel', icon: Shield, access: ['admin'] },
    { name: 'Settings', href: '/admin/settings', icon: Settings, access: ['admin'] },
  ];

  const filteredNavigation = navigation.filter(item => 
    item.access.includes(userData?.role || 'staff')
  );

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-purple-900 to-blue-900 transform transition-transform duration-300 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <Crown className="h-8 w-8 text-gold-400" />
            <span className="text-xl font-bold text-white">Swetha's</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden text-white hover:bg-white/10"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="mt-8 px-4 pb-20">
          <ul className="space-y-2">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-white/20 text-white shadow-lg'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-white/10 rounded-lg p-4 mb-4">
            <div className="text-white/90 text-sm font-medium truncate">{userData?.name}</div>
            <div className="text-white/60 text-xs capitalize">{userData?.role}</div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-white/70 hover:bg-white/10 hover:text-white"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Mobile header */}
        <div className="lg:hidden bg-white shadow-sm border-b px-4 py-3 relative z-30">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
            <div className="flex items-center space-x-2">
              <Crown className="h-6 w-6 text-purple-600" />
              <span className="font-bold text-gray-800 text-sm sm:text-base">Swetha's Couture</span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 sm:p-6 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
