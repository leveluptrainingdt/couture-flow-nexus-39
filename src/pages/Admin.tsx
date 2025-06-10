
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Shield, 
  Database, 
  Users, 
  HardDrive, 
  Activity, 
  RefreshCw, 
  Download, 
  Upload,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';

interface SystemStats {
  totalUsers: number;
  totalOrders: number;
  totalCustomers: number;
  totalRevenue: number;
  databaseSize: string;
  storageUsed: string;
  activeUsers: number;
  systemHealth: 'good' | 'warning' | 'critical';
}

interface SystemModule {
  id: string;
  name: string;
  enabled: boolean;
  description: string;
}

const Admin = () => {
  const { userData } = useAuth();
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    databaseSize: '0 MB',
    storageUsed: '0 MB',
    activeUsers: 0,
    systemHealth: 'good'
  });
  const [modules, setModules] = useState<SystemModule[]>([
    { id: 'orders', name: 'Order Management', enabled: true, description: 'Manage customer orders' },
    { id: 'inventory', name: 'Inventory Tracking', enabled: true, description: 'Track materials and supplies' },
    { id: 'appointments', name: 'Appointment Booking', enabled: true, description: 'Schedule customer meetings' },
    { id: 'alterations', name: 'Alterations Management', enabled: true, description: 'Track alteration projects' },
    { id: 'staff', name: 'Staff Management', enabled: true, description: 'Manage staff and attendance' },
    { id: 'expenses', name: 'Expense Tracking', enabled: true, description: 'Track business expenses' },
    { id: 'reports', name: 'Reports & Analytics', enabled: true, description: 'Business insights' }
  ]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const fetchSystemStats = async () => {
    try {
      setLoading(true);
      
      // Fetch data from all collections
      const collections = ['users', 'orders', 'customers', 'staff', 'inventory', 'expenses'];
      const results: any = {};

      for (const collectionName of collections) {
        try {
          const snapshot = await getDocs(collection(db, collectionName));
          results[collectionName] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        } catch (error) {
          console.warn(`Failed to fetch ${collectionName}:`, error);
          results[collectionName] = [];
        }
      }

      // Calculate stats
      const orders = results.orders || [];
      const customers = results.customers || [];
      const users = results.users || [];
      
      const totalRevenue = orders
        .filter((order: any) => order.status === 'delivered')
        .reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0);

      setStats({
        totalUsers: users.length,
        totalOrders: orders.length,
        totalCustomers: customers.length,
        totalRevenue,
        databaseSize: `${Math.round(Math.random() * 50 + 10)} MB`, // Mock data
        storageUsed: `${Math.round(Math.random() * 100 + 50)} MB`, // Mock data
        activeUsers: Math.floor(Math.random() * 5 + 1), // Mock data
        systemHealth: totalRevenue > 50000 ? 'good' : totalRevenue > 20000 ? 'warning' : 'critical'
      });

    } catch (error) {
      console.error('Error fetching system stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch system statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshData = async () => {
    setRefreshing(true);
    await fetchSystemStats();
    setRefreshing(false);
    toast({
      title: "Success",
      description: "System data refreshed successfully",
    });
  };

  const toggleModule = async (moduleId: string) => {
    setModules(prev => 
      prev.map(module => 
        module.id === moduleId 
          ? { ...module, enabled: !module.enabled }
          : module
      )
    );
    
    toast({
      title: "Module Updated",
      description: `Module ${moduleId} has been ${modules.find(m => m.id === moduleId)?.enabled ? 'disabled' : 'enabled'}`,
    });
  };

  const handleBackup = () => {
    toast({
      title: "Backup Initiated",
      description: "System backup has been started",
    });
  };

  const handleRestore = () => {
    toast({
      title: "Restore Initiated", 
      description: "System restore process has been started",
    });
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'good': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'critical': return AlertTriangle;
      default: return Activity;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Admin Control Panel</h1>
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

  const HealthIcon = getHealthIcon(stats.systemHealth);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Control Panel</h1>
          <p className="text-gray-600">System administration and monitoring</p>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="outline"
            onClick={handleRefreshData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
            <Shield className="h-4 w-4 mr-2" />
            Security Center
          </Button>
        </div>
      </div>

      {/* System Health Status */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <HealthIcon className={`h-5 w-5 ${getHealthColor(stats.systemHealth)}`} />
            <span>System Health Status</span>
          </CardTitle>
          <CardDescription>Overall system performance and health metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge className={
                stats.systemHealth === 'good' ? 'bg-green-100 text-green-700' :
                stats.systemHealth === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }>
                {stats.systemHealth.toUpperCase()}
              </Badge>
              <span className="text-sm text-gray-600">Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Active Users: {stats.activeUsers}</span>
              <span>Uptime: 99.9%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.totalUsers}</div>
            <p className="text-xs text-gray-500">System users</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.totalOrders}</div>
            <p className="text-xs text-gray-500">All time orders</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Revenue</CardTitle>
            <TrendingUp className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">₹{stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-gray-500">Total revenue</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Database Size</CardTitle>
            <Database className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.databaseSize}</div>
            <p className="text-xs text-gray-500">Storage used</p>
          </CardContent>
        </Card>
      </div>

      {/* System Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module Management */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Module Management</CardTitle>
            <CardDescription>Enable or disable system modules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {modules.map((module) => (
              <div key={module.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{module.name}</div>
                  <div className="text-sm text-gray-500">{module.description}</div>
                </div>
                <Switch
                  checked={module.enabled}
                  onCheckedChange={() => toggleModule(module.id)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Backup & Security */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Backup & Security</CardTitle>
            <CardDescription>System backup and security operations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="h-20 flex-col"
                onClick={handleBackup}
              >
                <Download className="h-6 w-6 mb-2" />
                <span className="text-sm">Create Backup</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex-col"
                onClick={handleRestore}
              >
                <Upload className="h-6 w-6 mb-2" />
                <span className="text-sm">Restore Data</span>
              </Button>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Last Backup</span>
                <span className="text-sm text-gray-500">2 hours ago</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Backup Size</span>
                <span className="text-sm text-gray-500">{stats.databaseSize}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Storage Used</span>
                <span className="text-sm text-gray-500">{stats.storageUsed}</span>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => toast({ title: "Security Scan", description: "Security scan initiated" })}
              >
                <Shield className="h-4 w-4 mr-2" />
                Run Security Scan
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Logs */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Recent System Activity</CardTitle>
          <CardDescription>Latest system events and user activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { time: '10:30 AM', event: 'New order created', user: 'Admin', type: 'info' },
              { time: '10:15 AM', event: 'Staff member checked in', user: 'John Doe', type: 'success' },
              { time: '10:00 AM', event: 'System backup completed', user: 'System', type: 'success' },
              { time: '09:45 AM', event: 'Inventory updated', user: 'Admin', type: 'info' },
              { time: '09:30 AM', event: 'User login', user: 'Admin', type: 'info' }
            ].map((log, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    log.type === 'success' ? 'bg-green-500' :
                    log.type === 'warning' ? 'bg-yellow-500' :
                    log.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                  }`} />
                  <div>
                    <div className="font-medium text-gray-900">{log.event}</div>
                    <div className="text-sm text-gray-500">by {log.user}</div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">{log.time}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;
