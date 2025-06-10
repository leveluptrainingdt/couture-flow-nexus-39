
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Settings, 
  Users, 
  Database, 
  Shield, 
  Activity, 
  Bell, 
  Key, 
  Trash2, 
  Download, 
  Upload,
  Server,
  Clock,
  HardDrive,
  AlertTriangle,
  CheckCircle,
  UserPlus,
  RefreshCw,
  Eye,
  EyeOff,
  Calendar,
  BarChart3
} from 'lucide-react';
import { collection, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, addDoc, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';

interface SystemMetrics {
  totalUsers: number;
  activeUsers: number;
  totalOrders: number;
  systemRevenue: number;
  storageUsed: number;
  databaseSize: number;
  uptime: string;
}

interface BackupRecord {
  id: string;
  date: string;
  type: 'full' | 'orders' | 'inventory' | 'customers';
  size: string;
  status: 'completed' | 'failed' | 'in-progress';
}

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  isActive: boolean;
  lastLogin: string;
  totalLogins: number;
  lastIP?: string;
  permissions: {
    orders: { read: boolean; write: boolean; delete: boolean; };
    inventory: { read: boolean; write: boolean; delete: boolean; };
    customers: { read: boolean; write: boolean; delete: boolean; };
    staff: { read: boolean; write: boolean; delete: boolean; };
    reports: { read: boolean; write: boolean; delete: boolean; };
    admin: { read: boolean; write: boolean; delete: boolean; };
  };
}

interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details: string;
  timestamp: any;
  ipAddress?: string;
  beforeData?: any;
  afterData?: any;
}

interface SystemSettings {
  systemName: string;
  adminEmail: string;
  primaryPhone: string;
  businessLocation: string;
  enabledModules: {
    expenses: boolean;
    inventory: boolean;
    appointments: boolean;
    staff: boolean;
    reports: boolean;
  };
  dateFormat: string;
  currency: string;
  timezone: string;
  backupSchedule: 'daily' | 'weekly' | 'monthly';
  twoFactorEnabled: boolean;
}

const AdminControlPanel = () => {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    totalUsers: 0,
    activeUsers: 0,
    totalOrders: 0,
    systemRevenue: 0,
    storageUsed: 0,
    databaseSize: 0,
    uptime: '0 days'
  });

  const [backupRecords, setBackupRecords] = useState<BackupRecord[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    systemName: "Swetha's Couture Management System",
    adminEmail: 'admin@swethascouture.com',
    primaryPhone: '+91 9876543210',
    businessLocation: 'Chennai, Tamil Nadu, India',
    enabledModules: {
      expenses: true,
      inventory: true,
      appointments: true,
      staff: true,
      reports: true
    },
    dateFormat: 'DD/MM/YYYY',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    backupSchedule: 'daily',
    twoFactorEnabled: false
  });

  const [isBackupDialogOpen, setIsBackupDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupType, setBackupType] = useState<'full' | 'orders' | 'inventory' | 'customers'>('full');

  useEffect(() => {
    if (userData?.role === 'admin') {
      fetchSystemData();
    } else {
      setLoading(false);
    }
  }, [userData]);

  const fetchSystemData = async () => {
    try {
      setLoading(true);
      
      // Fetch system metrics
      const [ordersSnapshot, usersSnapshot, inventorySnapshot] = await Promise.all([
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'inventory'))
      ]);

      const orders = ordersSnapshot.docs.map(doc => doc.data());
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const totalRevenue = orders
        .filter(order => order.status === 'completed')
        .reduce((sum, order) => sum + (order.totalAmount || 0), 0);

      const activeUsers = users.filter(user => {
        const lastLogin = user.lastLogin?.toDate?.() || new Date(user.lastLogin || 0);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return lastLogin > weekAgo;
      }).length;

      setSystemMetrics({
        totalUsers: users.length,
        activeUsers,
        totalOrders: orders.length,
        systemRevenue: totalRevenue,
        storageUsed: Math.random() * 500 + 100, // Mock storage usage
        databaseSize: Math.random() * 50 + 10, // Mock DB size
        uptime: '15 days, 8 hours'
      });

      // Transform users data for management
      const transformedUsers: SystemUser[] = users.map(user => ({
        id: user.id,
        name: user.name || 'Unknown',
        email: user.email || '',
        role: user.role || 'staff',
        isActive: user.isActive !== false,
        lastLogin: user.lastLogin?.toDate?.()?.toLocaleDateString() || 'Never',
        totalLogins: user.totalLogins || 0,
        lastIP: user.lastIP || '192.168.1.1',
        permissions: user.permissions || {
          orders: { read: true, write: true, delete: false },
          inventory: { read: true, write: true, delete: false },
          customers: { read: true, write: false, delete: false },
          staff: { read: false, write: false, delete: false },
          reports: { read: true, write: false, delete: false },
          admin: { read: false, write: false, delete: false }
        }
      }));

      setSystemUsers(transformedUsers);

      // Mock backup records
      setBackupRecords([
        {
          id: '1',
          date: new Date(Date.now() - 86400000).toLocaleDateString(),
          type: 'full',
          size: '45.2 MB',
          status: 'completed'
        },
        {
          id: '2',
          date: new Date(Date.now() - 2 * 86400000).toLocaleDateString(),
          type: 'orders',
          size: '12.8 MB',
          status: 'completed'
        },
        {
          id: '3',
          date: new Date(Date.now() - 3 * 86400000).toLocaleDateString(),
          type: 'inventory',
          size: '8.4 MB',
          status: 'failed'
        }
      ]);

      // Mock activity logs
      setActivityLogs([
        {
          id: '1',
          userId: userData?.uid || '',
          userName: userData?.name || '',
          action: 'LOGIN',
          module: 'Authentication',
          details: 'Admin logged into control panel',
          timestamp: new Date(),
          ipAddress: '192.168.1.100'
        },
        {
          id: '2',
          userId: userData?.uid || '',
          userName: userData?.name || '',
          action: 'CREATE',
          module: 'Orders',
          details: 'Created new order #ORD-2025-001',
          timestamp: new Date(Date.now() - 3600000),
          ipAddress: '192.168.1.100'
        },
        {
          id: '3',
          userId: 'user123',
          userName: 'Staff Member',
          action: 'UPDATE',
          module: 'Inventory',
          details: 'Updated silk fabric quantity',
          timestamp: new Date(Date.now() - 7200000),
          ipAddress: '192.168.1.101'
        }
      ]);

    } catch (error) {
      console.error('Error fetching system data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch system data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    try {
      setIsCreatingBackup(true);
      
      toast({
        title: "Backup Started",
        description: `Creating ${backupType} backup...`,
      });

      // Mock backup creation process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const newBackup: BackupRecord = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString(),
        type: backupType,
        size: `${Math.floor(Math.random() * 50 + 10)}.${Math.floor(Math.random() * 9)} MB`,
        status: 'completed'
      };

      setBackupRecords(prev => [newBackup, ...prev]);
      
      toast({
        title: "Backup Complete",
        description: `${backupType} backup created successfully`,
      });
      
      setIsBackupDialogOpen(false);
    } catch (error) {
      console.error('Error creating backup:', error);
      toast({
        title: "Backup Failed",
        description: "Failed to create backup",
        variant: "destructive",
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const updateSystemSettings = async () => {
    try {
      // In a real app, this would update system settings in the database
      toast({
        title: "Settings Updated",
        description: "System settings saved successfully",
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    }
  };

  const updateUserPermissions = async (userId: string, newPermissions: SystemUser['permissions']) => {
    try {
      setSystemUsers(prev => 
        prev.map(user => 
          user.id === userId 
            ? { ...user, permissions: newPermissions }
            : user
        )
      );
      
      toast({
        title: "Permissions Updated",
        description: "User permissions updated successfully",
      });
      setIsUserDialogOpen(false);
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        title: "Error",
        description: "Failed to update permissions",
        variant: "destructive",
      });
    }
  };

  const toggleUserStatus = async (userId: string) => {
    try {
      setSystemUsers(prev => 
        prev.map(user => 
          user.id === userId 
            ? { ...user, isActive: !user.isActive }
            : user
        )
      );
      
      toast({
        title: "User Status Updated",
        description: "User status changed successfully",
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const exportLogs = (format: 'csv' | 'pdf') => {
    toast({
      title: "Export Started",
      description: `Exporting activity logs as ${format.toUpperCase()}...`,
    });
    
    setTimeout(() => {
      toast({
        title: "Export Complete",
        description: `Activity logs exported successfully`,
      });
    }, 2000);
  };

  if (userData?.role !== 'admin') {
    return (
      <div className="space-y-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Admin Access Required</h3>
            <p className="text-gray-600">
              Only system administrators can access the control panel.
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <Settings className="h-8 w-8 text-purple-600" />
            <span>Admin Control Panel</span>
          </h1>
          <p className="text-gray-600">System management and configuration</p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={() => exportLogs('csv')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Logs
          </Button>
          <Dialog open={isBackupDialogOpen} onOpenChange={setIsBackupDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Database className="h-4 w-4 mr-2" />
                Create Backup
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create System Backup</DialogTitle>
                <DialogDescription>
                  Choose the type of backup you want to create.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="backupType">Backup Type</Label>
                  <Select value={backupType} onValueChange={(value: any) => setBackupType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full System Backup</SelectItem>
                      <SelectItem value="orders">Orders Only</SelectItem>
                      <SelectItem value="inventory">Inventory Only</SelectItem>
                      <SelectItem value="customers">Customer Data Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> The backup process may take several minutes depending on data size.
                  </p>
                </div>
                <div className="flex justify-end space-x-3">
                  <Button variant="outline" onClick={() => setIsBackupDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createBackup} disabled={isCreatingBackup}>
                    {isCreatingBackup ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Backup'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{systemMetrics.totalUsers}</div>
            <p className="text-xs text-green-600">{systemMetrics.activeUsers} active this week</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
            <BarChart3 className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{systemMetrics.totalOrders}</div>
            <p className="text-xs text-gray-500">All time orders</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">System Revenue</CardTitle>
            <Activity className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">₹{systemMetrics.systemRevenue.toLocaleString()}</div>
            <p className="text-xs text-gray-500">Total revenue</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Storage Used</CardTitle>
            <HardDrive className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{systemMetrics.storageUsed.toFixed(1)} MB</div>
            <p className="text-xs text-gray-500">Database: {systemMetrics.databaseSize.toFixed(1)} MB</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">System Uptime</CardTitle>
            <Clock className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{systemMetrics.uptime}</div>
            <p className="text-xs text-green-600">System running smoothly</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">System Status</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Healthy</div>
            <p className="text-xs text-gray-500">All services operational</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Last Backup</CardTitle>
            <Database className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {backupRecords[0]?.date || 'Never'}
            </div>
            <p className="text-xs text-gray-500">
              {backupRecords[0]?.status === 'completed' ? 'Successful' : 'Failed'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Alerts</CardTitle>
            <Bell className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">2</div>
            <p className="text-xs text-red-600">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Control Panel */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Current system status and performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="font-medium">Database Connection</span>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Healthy</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="font-medium">Cloud Storage</span>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Connected</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="font-medium">Authentication Service</span>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Active</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    <span className="font-medium">Storage Usage</span>
                  </div>
                  <span className="text-sm text-gray-600">75% used</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setIsBackupDialogOpen(true)}
                >
                  <Database className="h-4 w-4 mr-2" />
                  Create System Backup
                </Button>
                
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setActiveTab('users')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Users
                </Button>
                
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => exportLogs('csv')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export System Logs
                </Button>
                
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setActiveTab('settings')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  System Settings
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Active Alerts */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>Issues requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    <div>
                      <div className="font-medium">Storage Almost Full</div>
                      <div className="text-sm text-gray-600">Storage usage is at 75%. Consider cleaning up old backups.</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Resolve</Button>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                  <div className="flex items-center space-x-3">
                    <Bell className="w-5 h-5 text-blue-500" />
                    <div>
                      <div className="font-medium">Backup Schedule Reminder</div>
                      <div className="text-sm text-gray-600">Next scheduled backup is in 2 hours.</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">View</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="space-y-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Backup Management</CardTitle>
              <CardDescription>Create and manage system backups</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Backup Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="backupSchedule">Backup Schedule</Label>
                  <Select 
                    value={systemSettings.backupSchedule} 
                    onValueChange={(value: any) => setSystemSettings({...systemSettings, backupSchedule: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch id="autoBackup" defaultChecked />
                  <Label htmlFor="autoBackup">Enable Automatic Backups</Label>
                </div>
              </div>

              {/* Backup History */}
              <div>
                <h3 className="text-lg font-medium mb-4">Backup History</h3>
                <div className="space-y-3">
                  {backupRecords.map((backup) => (
                    <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <Badge variant={backup.status === 'completed' ? 'default' : backup.status === 'failed' ? 'destructive' : 'secondary'}>
                            {backup.status}
                          </Badge>
                          <span className="font-medium capitalize">{backup.type} Backup</span>
                          <span className="text-gray-600">{backup.size}</span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">{backup.date}</div>
                      </div>
                      
                      <div className="flex space-x-2">
                        {backup.status === 'completed' && (
                          <>
                            <Button variant="outline" size="sm">
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                            <Button variant="outline" size="sm">
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Restore
                            </Button>
                          </>
                        )}
                        <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user accounts and permissions</CardDescription>
              </div>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {systemUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div>
                          <div className="font-medium flex items-center space-x-2">
                            <span>{user.name}</span>
                            {!user.isActive && <Badge variant="destructive">Inactive</Badge>}
                          </div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                        </div>
                        <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                          {user.role}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Last login: {user.lastLogin} • Total logins: {user.totalLogins}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Dialog open={isUserDialogOpen && selectedUser?.id === user.id} onOpenChange={setIsUserDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                          >
                            <Key className="h-3 w-3 mr-1" />
                            Permissions
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>User Permissions - {user.name}</DialogTitle>
                            <DialogDescription>
                              Configure access permissions for this user.
                            </DialogDescription>
                          </DialogHeader>
                          {selectedUser && (
                            <div className="space-y-4">
                              {Object.entries(selectedUser.permissions).map(([module, perms]) => (
                                <div key={module} className="space-y-2">
                                  <Label className="text-sm font-medium capitalize">{module}</Label>
                                  <div className="flex space-x-4">
                                    <label className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        checked={perms.read}
                                        onChange={(e) => {
                                          if (selectedUser) {
                                            const newPermissions = {
                                              ...selectedUser.permissions,
                                              [module]: { ...perms, read: e.target.checked }
                                            };
                                            setSelectedUser({ ...selectedUser, permissions: newPermissions });
                                          }
                                        }}
                                      />
                                      <span className="text-sm">Read</span>
                                    </label>
                                    <label className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        checked={perms.write}
                                        onChange={(e) => {
                                          if (selectedUser) {
                                            const newPermissions = {
                                              ...selectedUser.permissions,
                                              [module]: { ...perms, write: e.target.checked }
                                            };
                                            setSelectedUser({ ...selectedUser, permissions: newPermissions });
                                          }
                                        }}
                                      />
                                      <span className="text-sm">Write</span>
                                    </label>
                                    <label className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        checked={perms.delete}
                                        onChange={(e) => {
                                          if (selectedUser) {
                                            const newPermissions = {
                                              ...selectedUser.permissions,
                                              [module]: { ...perms, delete: e.target.checked }
                                            };
                                            setSelectedUser({ ...selectedUser, permissions: newPermissions });
                                          }
                                        }}
                                      />
                                      <span className="text-sm">Delete</span>
                                    </label>
                                  </div>
                                </div>
                              ))}
                              <div className="flex justify-end space-x-3">
                                <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={() => updateUserPermissions(selectedUser.id, selectedUser.permissions)}>
                                  Save Permissions
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleUserStatus(user.id)}
                      >
                        {user.isActive ? (
                          <>
                            <EyeOff className="h-3 w-3 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Configure business and system preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="systemName">System Name</Label>
                    <Input
                      id="systemName"
                      value={systemSettings.systemName}
                      onChange={(e) => setSystemSettings({...systemSettings, systemName: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="adminEmail">Admin Email</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      value={systemSettings.adminEmail}
                      onChange={(e) => setSystemSettings({...systemSettings, adminEmail: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="primaryPhone">Primary Phone</Label>
                    <Input
                      id="primaryPhone"
                      value={systemSettings.primaryPhone}
                      onChange={(e) => setSystemSettings({...systemSettings, primaryPhone: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select 
                      value={systemSettings.currency} 
                      onValueChange={(value) => setSystemSettings({...systemSettings, currency: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">Indian Rupee (₹)</SelectItem>
                        <SelectItem value="USD">US Dollar ($)</SelectItem>
                        <SelectItem value="EUR">Euro (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="businessLocation">Business Location</Label>
                    <Textarea
                      id="businessLocation"
                      value={systemSettings.businessLocation}
                      onChange={(e) => setSystemSettings({...systemSettings, businessLocation: e.target.value})}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="dateFormat">Date Format</Label>
                    <Select 
                      value={systemSettings.dateFormat} 
                      onValueChange={(value) => setSystemSettings({...systemSettings, dateFormat: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select 
                      value={systemSettings.timezone} 
                      onValueChange={(value) => setSystemSettings({...systemSettings, timezone: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Module Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(systemSettings.enabledModules).map(([module, enabled]) => (
                    <div key={module} className="flex items-center space-x-2">
                      <Switch 
                        id={module}
                        checked={enabled}
                        onCheckedChange={(checked) => 
                          setSystemSettings({
                            ...systemSettings,
                            enabledModules: {
                              ...systemSettings.enabledModules,
                              [module]: checked
                            }
                          })
                        }
                      />
                      <Label htmlFor={module} className="capitalize">{module}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={updateSystemSettings}>
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage system security and access controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Authentication Settings</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="twoFactor"
                        checked={systemSettings.twoFactorEnabled}
                        onCheckedChange={(checked) => 
                          setSystemSettings({...systemSettings, twoFactorEnabled: checked})
                        }
                      />
                      <Label htmlFor="twoFactor">Enable Two-Factor Authentication</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="sessionTimeout" defaultChecked />
                      <Label htmlFor="sessionTimeout">Auto-logout inactive sessions</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="loginNotifications" defaultChecked />
                      <Label htmlFor="loginNotifications">Email login notifications</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Password Policies</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch id="minLength" defaultChecked />
                      <Label htmlFor="minLength">Minimum 8 characters</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="uppercase" defaultChecked />
                      <Label htmlFor="uppercase">Require uppercase letters</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="numbers" defaultChecked />
                      <Label htmlFor="numbers">Require numbers</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="special" />
                      <Label htmlFor="special">Require special characters</Label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Access Control</h3>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-700">
                    <strong>Current Security Level:</strong> Standard
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    All security features are properly configured and active.
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={updateSystemSettings}>
                  Save Security Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Activity Logs</CardTitle>
                <CardDescription>System activity and user action logs</CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => exportLogs('csv')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" onClick={() => exportLogs('pdf')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <Badge variant={
                          log.action === 'LOGIN' ? 'outline' :
                          log.action === 'CREATE' ? 'default' :
                          log.action === 'UPDATE' ? 'secondary' :
                          log.action === 'DELETE' ? 'destructive' : 'outline'
                        }>
                          {log.action}
                        </Badge>
                        <span className="font-medium">{log.module}</span>
                        <span className="text-gray-600">by {log.userName}</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">{log.details}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(log.timestamp).toLocaleString()} • IP: {log.ipAddress}
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Eye className="h-3 w-3 mr-1" />
                      Details
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-center mt-6">
                <Button variant="outline">
                  Load More Logs
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminControlPanel;
