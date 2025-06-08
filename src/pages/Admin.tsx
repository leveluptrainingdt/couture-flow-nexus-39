
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
import { Crown, Settings, Users, Database, Shield, Activity, Bell, Key, Trash2, Download, Upload } from 'lucide-react';
import { collection, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';

interface SystemSettings {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  currency: string;
  timezone: string;
  taxRate: number;
  lowStockThreshold: number;
  autoBackup: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

interface UserPermissions {
  userId: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  permissions: {
    orders: { read: boolean; write: boolean; delete: boolean; };
    inventory: { read: boolean; write: boolean; delete: boolean; };
    staff: { read: boolean; write: boolean; delete: boolean; };
    reports: { read: boolean; write: boolean; delete: boolean; };
    settings: { read: boolean; write: boolean; delete: boolean; };
  };
  isActive: boolean;
  lastLogin?: any;
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
}

const Admin = () => {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    storageUsed: 0,
    lastBackup: null
  });

  const [settings, setSettings] = useState<SystemSettings>({
    businessName: "Swetha's Couture",
    businessAddress: '',
    businessPhone: '',
    businessEmail: '',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    taxRate: 18,
    lowStockThreshold: 10,
    autoBackup: true,
    emailNotifications: true,
    smsNotifications: false
  });

  const [userPermissions, setUserPermissions] = useState<UserPermissions[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isBackupDialogOpen, setIsBackupDialogOpen] = useState(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserPermissions | null>(null);

  useEffect(() => {
    if (userData?.role === 'admin') {
      fetchAdminData();
    } else {
      setLoading(false);
    }
  }, [userData]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      // Fetch system statistics
      const [ordersSnapshot, usersSnapshot, inventorySnapshot, expensesSnapshot] = await Promise.all([
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'inventory')),
        getDocs(collection(db, 'expenses'))
      ]);

      const orders = ordersSnapshot.docs.map(doc => doc.data());
      const totalRevenue = orders
        .filter(order => order.status === 'completed')
        .reduce((sum, order) => sum + (order.totalAmount || 0), 0);

      setSystemStats({
        totalUsers: usersSnapshot.docs.length,
        totalOrders: ordersSnapshot.docs.length,
        totalRevenue,
        storageUsed: Math.random() * 1000, // Mock storage usage
        lastBackup: new Date().toISOString()
      });

      // Fetch user permissions (mock data for demo)
      const users = usersSnapshot.docs.map(doc => ({
        userId: doc.id,
        name: doc.data().name || 'Unknown',
        email: doc.data().email || '',
        role: doc.data().role || 'staff',
        permissions: {
          orders: { read: true, write: true, delete: false },
          inventory: { read: true, write: true, delete: false },
          staff: { read: false, write: false, delete: false },
          reports: { read: true, write: false, delete: false },
          settings: { read: false, write: false, delete: false }
        },
        isActive: true,
        lastLogin: new Date()
      }));

      setUserPermissions(users);

      // Mock activity logs
      setActivityLogs([
        {
          id: '1',
          userId: userData?.uid || '',
          userName: userData?.name || '',
          action: 'Login',
          module: 'Authentication',
          details: 'Admin logged into the system',
          timestamp: new Date(),
          ipAddress: '192.168.1.1'
        },
        {
          id: '2',
          userId: userData?.uid || '',
          userName: userData?.name || '',
          action: 'Create',
          module: 'Orders',
          details: 'Created new order #12345',
          timestamp: new Date(Date.now() - 3600000),
          ipAddress: '192.168.1.1'
        }
      ]);

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch admin data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async () => {
    try {
      // In a real app, this would update system settings in the database
      toast({
        title: "Success",
        description: "Settings updated successfully",
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

  const createBackup = async () => {
    try {
      // Mock backup creation
      toast({
        title: "Backup Started",
        description: "Creating system backup...",
      });
      
      // Simulate backup process
      setTimeout(() => {
        setSystemStats(prev => ({
          ...prev,
          lastBackup: new Date().toISOString()
        }));
        
        toast({
          title: "Backup Complete",
          description: "System backup created successfully",
        });
        setIsBackupDialogOpen(false);
      }, 3000);
    } catch (error) {
      console.error('Error creating backup:', error);
      toast({
        title: "Error",
        description: "Failed to create backup",
        variant: "destructive",
      });
    }
  };

  const updateUserPermissions = async (userId: string, newPermissions: UserPermissions['permissions']) => {
    try {
      // In a real app, this would update user permissions in the database
      setUserPermissions(prev => 
        prev.map(user => 
          user.userId === userId 
            ? { ...user, permissions: newPermissions }
            : user
        )
      );
      
      toast({
        title: "Success",
        description: "User permissions updated successfully",
      });
      setIsPermissionDialogOpen(false);
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        title: "Error",
        description: "Failed to update permissions",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        setUserPermissions(prev => prev.filter(user => user.userId !== userId));
        
        toast({
          title: "Success",
          description: "User deleted successfully",
        });
      } catch (error) {
        console.error('Error deleting user:', error);
        toast({
          title: "Error",
          description: "Failed to delete user",
          variant: "destructive",
        });
      }
    }
  };

  const exportData = (dataType: string) => {
    toast({
      title: "Export Started",
      description: `Exporting ${dataType} data...`,
    });
    
    // Mock export process
    setTimeout(() => {
      toast({
        title: "Export Complete",
        description: `${dataType} data exported successfully`,
      });
    }, 2000);
  };

  if (userData?.role !== 'admin') {
    return (
      <div className="space-y-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Crown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Admin Access Required</h3>
            <p className="text-gray-600">
              Only administrators can access the admin panel.
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
          <h1 className="text-3xl font-bold">Admin Panel</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
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
            <Crown className="h-8 w-8 text-gold-400" />
            <span>Admin Control Panel</span>
          </h1>
          <p className="text-gray-600">System management and configuration</p>
        </div>
        <div className="flex space-x-3">
          <Dialog open={isBackupDialogOpen} onOpenChange={setIsBackupDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Create Backup
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create System Backup</DialogTitle>
                <DialogDescription>
                  This will create a complete backup of all system data including orders, inventory, and user data.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> The backup process may take several minutes. 
                    Do not close this window during the process.
                  </p>
                </div>
                <div className="flex justify-end space-x-3">
                  <Button variant="outline" onClick={() => setIsBackupDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createBackup}>
                    Start Backup
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{systemStats.totalUsers}</div>
            <p className="text-xs text-gray-500">Active system users</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
            <Database className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{systemStats.totalOrders}</div>
            <p className="text-xs text-gray-500">All time orders</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">System Revenue</CardTitle>
            <Activity className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">₹{systemStats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-gray-500">Total revenue</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Storage Used</CardTitle>
            <Database className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{systemStats.storageUsed.toFixed(0)} MB</div>
            <p className="text-xs text-gray-500">Database size</p>
          </CardContent>
        </Card>
      </div>

      {/* Admin Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
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
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="font-medium">Database Connection</span>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Healthy</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="font-medium">File Storage</span>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Online</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="font-medium">Authentication Service</span>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Active</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="font-medium">Last Backup</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {systemStats.lastBackup ? new Date(systemStats.lastBackup).toLocaleDateString() : 'Never'}
                  </span>
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
                  onClick={() => exportData('All Data')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export All Data
                </Button>
                
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => exportData('User Data')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Export User Data
                </Button>
                
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
                  onClick={() => setActiveTab('settings')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  System Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage user accounts and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userPermissions.map((user) => (
                  <div key={user.userId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                        </div>
                        <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                          {user.role}
                        </Badge>
                        <Badge variant={user.isActive ? 'outline' : 'destructive'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {user.lastLogin && (
                        <div className="text-xs text-gray-500 mt-1">
                          Last login: {new Date(user.lastLogin).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <Dialog open={isPermissionDialogOpen && selectedUser?.userId === user.userId} onOpenChange={setIsPermissionDialogOpen}>
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
                        <DialogContent>
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
                                <Button variant="outline" onClick={() => setIsPermissionDialogOpen(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={() => updateUserPermissions(selectedUser.userId, selectedUser.permissions)}>
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
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => deleteUser(user.userId)}
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
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input
                      id="businessName"
                      value={settings.businessName}
                      onChange={(e) => setSettings({...settings, businessName: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="businessPhone">Business Phone</Label>
                    <Input
                      id="businessPhone"
                      value={settings.businessPhone}
                      onChange={(e) => setSettings({...settings, businessPhone: e.target.value})}
                      placeholder="+91 9876543210"
                    />
                  </div>

                  <div>
                    <Label htmlFor="businessEmail">Business Email</Label>
                    <Input
                      id="businessEmail"
                      type="email"
                      value={settings.businessEmail}
                      onChange={(e) => setSettings({...settings, businessEmail: e.target.value})}
                      placeholder="contact@swethascouture.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <select
                      id="currency"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                      value={settings.currency}
                      onChange={(e) => setSettings({...settings, currency: e.target.value})}
                    >
                      <option value="INR">Indian Rupee (₹)</option>
                      <option value="USD">US Dollar ($)</option>
                      <option value="EUR">Euro (€)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="businessAddress">Business Address</Label>
                    <Textarea
                      id="businessAddress"
                      value={settings.businessAddress}
                      onChange={(e) => setSettings({...settings, businessAddress: e.target.value})}
                      placeholder="Complete business address"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="taxRate">Tax Rate (%)</Label>
                    <Input
                      id="taxRate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={settings.taxRate}
                      onChange={(e) => setSettings({...settings, taxRate: parseFloat(e.target.value) || 0})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
                    <Input
                      id="lowStockThreshold"
                      type="number"
                      min="0"
                      value={settings.lowStockThreshold}
                      onChange={(e) => setSettings({...settings, lowStockThreshold: parseInt(e.target.value) || 0})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <select
                      id="timezone"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                      value={settings.timezone}
                      onChange={(e) => setSettings({...settings, timezone: e.target.value})}
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Notifications & Automation</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.autoBackup}
                      onChange={(e) => setSettings({...settings, autoBackup: e.target.checked})}
                    />
                    <span>Auto Backup Daily</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications}
                      onChange={(e) => setSettings({...settings, emailNotifications: e.target.checked})}
                    />
                    <span>Email Notifications</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.smsNotifications}
                      onChange={(e) => setSettings({...settings, smsNotifications: e.target.checked})}
                    />
                    <span>SMS Notifications</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={updateSettings}>
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
                  <h3 className="text-lg font-medium">Password Policies</h3>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked />
                      <span>Require 8+ characters</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked />
                      <span>Require uppercase letters</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked />
                      <span>Require numbers</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" />
                      <span>Require special characters</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Session Management</h3>
                  <div className="space-y-3">
                    <div>
                      <Label>Session Timeout (minutes)</Label>
                      <Input type="number" defaultValue="60" min="15" max="480" />
                    </div>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked />
                      <span>Force logout on window close</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" />
                      <span>Allow multiple sessions</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Two-Factor Authentication</div>
                      <div className="text-sm text-gray-600">Add an extra layer of security to admin accounts</div>
                    </div>
                    <Button variant="outline">
                      Enable 2FA
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button>
                  Save Security Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Activity Logs</CardTitle>
              <CardDescription>System activity and user action logs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <Badge variant={
                          log.action === 'Login' ? 'outline' :
                          log.action === 'Create' ? 'default' :
                          log.action === 'Update' ? 'secondary' :
                          log.action === 'Delete' ? 'destructive' : 'outline'
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

export default Admin;
