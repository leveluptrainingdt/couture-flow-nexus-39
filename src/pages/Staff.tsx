
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
import { Plus, Users, Clock, DollarSign, Phone, Mail, Calendar, User, CheckCircle, XCircle, Camera, Download } from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';

interface AttendanceRecord {
  date: string;
  timeIn?: string;
  timeOut?: string;
  status: 'present' | 'absent' | 'late' | 'half-day';
  totalHours?: number;
  notes?: string;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'staff' | 'admin';
  position: string;
  salary: number;
  hourlyRate: number;
  joinDate: string;
  status: 'active' | 'inactive' | 'on-leave';
  address?: string;
  emergencyContact?: string;
  notes?: string;
  profileImage?: string;
  attendanceRecords: AttendanceRecord[];
  isCurrentlyCheckedIn?: boolean;
  createdAt: any;
  updatedAt: any;
}

const Staff = () => {
  const { userData } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('directory');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'staff' as 'staff' | 'admin',
    position: '',
    salary: 0,
    hourlyRate: 0,
    joinDate: '',
    status: 'active' as 'active' | 'inactive' | 'on-leave',
    address: '',
    emergencyContact: '',
    notes: '',
    profileImage: ''
  });

  useEffect(() => {
    if (userData?.role === 'admin') {
      fetchStaff();
    } else {
      setLoading(false);
    }
  }, [userData]);

  const fetchStaff = async () => {
    try {
      const staffQuery = query(
        collection(db, 'staff'),
        orderBy('createdAt', 'desc')
      );
      const staffSnapshot = await getDocs(staffQuery);
      const staffData = staffSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        attendanceRecords: doc.data().attendanceRecords || []
      })) as StaffMember[];
      
      setStaff(staffData);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast({
        title: "Error",
        description: "Failed to fetch staff members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const staffData = {
        ...formData,
        attendanceRecords: [],
        isCurrentlyCheckedIn: false,
        updatedAt: serverTimestamp(),
        ...(editingMember ? {} : { createdAt: serverTimestamp() })
      };

      if (editingMember) {
        await updateDoc(doc(db, 'staff', editingMember.id), staffData);
        toast({
          title: "Success",
          description: "Staff member updated successfully",
        });
      } else {
        await addDoc(collection(db, 'staff'), staffData);
        toast({
          title: "Success",
          description: "Staff member added successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingMember(null);
      resetForm();
      fetchStaff();
    } catch (error) {
      console.error('Error saving staff member:', error);
      toast({
        title: "Error",
        description: "Failed to save staff member",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'staff',
      position: '',
      salary: 0,
      hourlyRate: 0,
      joinDate: '',
      status: 'active',
      address: '',
      emergencyContact: '',
      notes: '',
      profileImage: ''
    });
  };

  const handleEdit = (member: StaffMember) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.role,
      position: member.position,
      salary: member.salary,
      hourlyRate: member.hourlyRate || 0,
      joinDate: member.joinDate,
      status: member.status,
      address: member.address || '',
      emergencyContact: member.emergencyContact || '',
      notes: member.notes || '',
      profileImage: member.profileImage || ''
    });
    setIsDialogOpen(true);
  };

  const updateStatus = async (memberId: string, newStatus: StaffMember['status']) => {
    try {
      await updateDoc(doc(db, 'staff', memberId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast({
        title: "Success",
        description: "Staff status updated",
      });
      fetchStaff();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const clockInOut = async (memberId: string, action: 'in' | 'out') => {
    try {
      const member = staff.find(m => m.id === memberId);
      if (!member) return;

      const now = new Date();
      const currentTime = now.toLocaleTimeString('en-US', { hour12: false });
      const currentDate = now.toISOString().split('T')[0];

      let updatedRecords = [...member.attendanceRecords];
      const todayRecord = updatedRecords.find(record => record.date === currentDate);

      if (action === 'in') {
        if (todayRecord) {
          todayRecord.timeIn = currentTime;
          todayRecord.status = 'present';
        } else {
          updatedRecords.push({
            date: currentDate,
            timeIn: currentTime,
            status: 'present'
          });
        }
        
        await updateDoc(doc(db, 'staff', memberId), {
          attendanceRecords: updatedRecords,
          isCurrentlyCheckedIn: true,
          updatedAt: serverTimestamp()
        });
        
        toast({
          title: "Clocked In",
          description: `${member.name} clocked in at ${currentTime}`,
        });
      } else {
        if (todayRecord && todayRecord.timeIn) {
          todayRecord.timeOut = currentTime;
          
          // Calculate total hours
          const timeIn = new Date(`${currentDate}T${todayRecord.timeIn}`);
          const timeOut = new Date(`${currentDate}T${currentTime}`);
          const totalHours = (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60);
          todayRecord.totalHours = Math.round(totalHours * 100) / 100;
          
          await updateDoc(doc(db, 'staff', memberId), {
            attendanceRecords: updatedRecords,
            isCurrentlyCheckedIn: false,
            updatedAt: serverTimestamp()
          });
          
          toast({
            title: "Clocked Out",
            description: `${member.name} clocked out at ${currentTime}. Total hours: ${todayRecord.totalHours}`,
          });
        }
      }

      fetchStaff();
    } catch (error) {
      console.error('Error clocking in/out:', error);
      toast({
        title: "Error",
        description: "Failed to update attendance",
        variant: "destructive",
      });
    }
  };

  const markAttendance = async (memberId: string, status: AttendanceRecord['status'], notes?: string) => {
    try {
      const member = staff.find(m => m.id === memberId);
      if (!member) return;

      const newRecord: AttendanceRecord = {
        date: attendanceDate,
        status,
        notes: notes || ''
      };

      const existingRecordIndex = member.attendanceRecords.findIndex(
        record => record.date === attendanceDate
      );

      let updatedRecords = [...member.attendanceRecords];
      if (existingRecordIndex >= 0) {
        updatedRecords[existingRecordIndex] = newRecord;
      } else {
        updatedRecords.push(newRecord);
      }

      await updateDoc(doc(db, 'staff', memberId), {
        attendanceRecords: updatedRecords,
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Success",
        description: "Attendance marked successfully",
      });
      fetchStaff();
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast({
        title: "Error",
        description: "Failed to mark attendance",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: StaffMember['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-200';
      case 'inactive': return 'bg-red-100 text-red-700 border-red-200';
      case 'on-leave': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getRoleColor = (role: StaffMember['role']) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'staff': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getAttendanceStats = (member: StaffMember) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyRecords = member.attendanceRecords.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
    });

    const presentDays = monthlyRecords.filter(record => 
      record.status === 'present' || record.status === 'late'
    ).length;

    const totalHours = monthlyRecords.reduce((sum, record) => sum + (record.totalHours || 0), 0);
    const totalDays = monthlyRecords.length;
    const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    return { presentDays, totalDays, attendancePercentage, totalHours };
  };

  const calculateMonthlyPayroll = (member: StaffMember) => {
    const stats = getAttendanceStats(member);
    return Math.round(stats.totalHours * member.hourlyRate);
  };

  const exportPayroll = () => {
    const payrollData = staff.map(member => {
      const stats = getAttendanceStats(member);
      const monthlyPay = calculateMonthlyPayroll(member);
      return {
        Name: member.name,
        Position: member.position,
        'Hourly Rate': `₹${member.hourlyRate}`,
        'Hours Worked': stats.totalHours,
        'Monthly Pay': `₹${monthlyPay}`,
        Status: member.status
      };
    });

    const csvContent = [
      Object.keys(payrollData[0]).join(','),
      ...payrollData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (userData?.role !== 'admin') {
    return (
      <div className="space-y-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
            <p className="text-gray-600">
              Only administrators can manage staff members.
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
          <h1 className="text-3xl font-bold">Staff Management</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const activeStaff = staff.filter(member => member.status === 'active');
  const presentToday = activeStaff.filter(member => {
    const today = new Date().toISOString().split('T')[0];
    return member.attendanceRecords.some(record => 
      record.date === today && (record.status === 'present' || record.status === 'late')
    );
  });
  const currentlyCheckedIn = activeStaff.filter(member => member.isCurrentlyCheckedIn);
  const totalMonthlyPayroll = staff.reduce((sum, member) => sum + calculateMonthlyPayroll(member), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff & Attendance</h1>
          <p className="text-gray-600">Manage team members, attendance, and payroll</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={exportPayroll}
            className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Payroll
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                onClick={() => {
                  setEditingMember(null);
                  resetForm();
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Staff Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingMember ? 'Edit Staff Member' : 'Add New Staff Member'}
                </DialogTitle>
                <DialogDescription>
                  Fill in the staff member details below.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => setFormData({...formData, position: e.target.value})}
                      placeholder="Job position"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="Email address"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="Phone number"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hourlyRate">Hourly Rate (₹)</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      min="0"
                      value={formData.hourlyRate}
                      onChange={(e) => setFormData({...formData, hourlyRate: parseFloat(e.target.value) || 0})}
                      placeholder="Rate per hour"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="salary">Monthly Salary (₹)</Label>
                    <Input
                      id="salary"
                      type="number"
                      min="0"
                      value={formData.salary}
                      onChange={(e) => setFormData({...formData, salary: parseFloat(e.target.value) || 0})}
                      placeholder="Monthly salary"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <select
                      id="role"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value as 'staff' | 'admin'})}
                      required
                    >
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <select
                      id="status"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as 'active' | 'inactive' | 'on-leave'})}
                      required
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="on-leave">On Leave</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="joinDate">Join Date</Label>
                    <Input
                      id="joinDate"
                      type="date"
                      value={formData.joinDate}
                      onChange={(e) => setFormData({...formData, joinDate: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="profileImage">Profile Image URL</Label>
                  <Input
                    id="profileImage"
                    value={formData.profileImage}
                    onChange={(e) => setFormData({...formData, profileImage: e.target.value})}
                    placeholder="Profile image URL"
                  />
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Home address"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="emergencyContact">Emergency Contact</Label>
                  <Input
                    id="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})}
                    placeholder="Emergency contact number"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Additional notes"
                    rows={2}
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-purple-600 to-blue-600">
                    {editingMember ? 'Update Member' : 'Add Member'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Staff</CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{staff.length}</div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Present Today</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{presentToday.length}</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Clocked In</CardTitle>
            <Clock className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{currentlyCheckedIn.length}</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">On Leave</CardTitle>
            <XCircle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {staff.filter(member => member.status === 'on-leave').length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Monthly Payroll</CardTitle>
            <DollarSign className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-gray-900">₹{totalMonthlyPayroll.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Staff</CardTitle>
            <Users className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{activeStaff.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="directory">Staff Directory</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="quick-attendance">Quick Mark</TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="space-y-6">
          {/* Staff Grid */}
          {staff.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {staff.map((member) => {
                const attendanceStats = getAttendanceStats(member);
                const monthlyPay = calculateMonthlyPayroll(member);
                return (
                  <Card key={member.id} className="hover:shadow-lg transition-all duration-300 border-0 shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3 flex-1">
                          {member.profileImage ? (
                            <img 
                              src={member.profileImage} 
                              alt={member.name}
                              className="h-12 w-12 rounded-full object-cover cursor-pointer"
                              onClick={() => setSelectedImage(member.profileImage!)}
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                              <User className="h-6 w-6 text-purple-600" />
                            </div>
                          )}
                          <div className="flex-1">
                            <CardTitle className="text-lg">{member.name}</CardTitle>
                            <CardDescription>{member.position}</CardDescription>
                          </div>
                        </div>
                        <div className="flex flex-col space-y-1">
                          <Badge className={getStatusColor(member.status)} variant="outline">
                            {member.status.replace('-', ' ')}
                          </Badge>
                          <Badge className={getRoleColor(member.role)} variant="outline">
                            {member.role}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Hourly Rate:</span>
                          <span className="font-medium">₹{member.hourlyRate}/hr</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Monthly Pay:</span>
                          <span className="font-medium">₹{monthlyPay.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Hours Worked:</span>
                          <span className="font-medium">{attendanceStats.totalHours.toFixed(1)}h</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Status:</span>
                          <Badge className={member.isCurrentlyCheckedIn ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                            {member.isCurrentlyCheckedIn ? 'Checked In' : 'Checked Out'}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-gray-600">
                          <Phone className="h-3 w-3" />
                          <span>{member.phone}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-gray-600">
                          <Mail className="h-3 w-3" />
                          <span>{member.email}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {member.status === 'active' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className={member.isCurrentlyCheckedIn ? "text-red-600 hover:bg-red-50" : "text-green-600 hover:bg-green-50"}
                              onClick={() => clockInOut(member.id, member.isCurrentlyCheckedIn ? 'out' : 'in')}
                            >
                              {member.isCurrentlyCheckedIn ? 'Clock Out' : 'Clock In'}
                            </Button>
                          </>
                        )}
                        {member.status === 'inactive' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:bg-green-50"
                            onClick={() => updateStatus(member.id, 'active')}
                          >
                            Activate
                          </Button>
                        )}
                        {member.status === 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-yellow-600 hover:bg-yellow-50"
                            onClick={() => updateStatus(member.id, 'on-leave')}
                          >
                            Mark Leave
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(member)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedMember(member)}
                        >
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No staff members found</h3>
                <p className="text-gray-600 mb-4">
                  Start by adding your first team member.
                </p>
                <Button 
                  className="bg-gradient-to-r from-purple-600 to-blue-600"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Member
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="attendance" className="space-y-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Attendance Records</CardTitle>
              <CardDescription>View detailed attendance history for all staff members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeStaff.map((member) => {
                  const stats = getAttendanceStats(member);
                  const todayRecord = member.attendanceRecords.find(
                    record => record.date === new Date().toISOString().split('T')[0]
                  );
                  return (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {member.profileImage ? (
                          <img 
                            src={member.profileImage} 
                            alt={member.name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-purple-600" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-gray-600">{member.position}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <p className="text-sm font-medium">{stats.totalHours.toFixed(1)}h</p>
                          <p className="text-xs text-gray-600">This Month</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium">{stats.attendancePercentage}%</p>
                          <p className="text-xs text-gray-600">Attendance</p>
                        </div>
                        <div className="text-center">
                          {todayRecord ? (
                            <Badge className={
                              todayRecord.status === 'present' ? 'bg-green-100 text-green-700' :
                              todayRecord.status === 'late' ? 'bg-yellow-100 text-yellow-700' :
                              todayRecord.status === 'half-day' ? 'bg-blue-100 text-blue-700' :
                              'bg-red-100 text-red-700'
                            }>
                              {todayRecord.status}
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-700">Not Marked</Badge>
                          )}
                        </div>
                        <Badge className={member.isCurrentlyCheckedIn ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                          {member.isCurrentlyCheckedIn ? 'Checked In' : 'Checked Out'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Monthly Payroll Breakdown</CardTitle>
              <CardDescription>Calculate and review monthly payroll based on hours worked</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {staff.map((member) => {
                  const stats = getAttendanceStats(member);
                  const monthlyPay = calculateMonthlyPayroll(member);
                  return (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {member.profileImage ? (
                          <img 
                            src={member.profileImage} 
                            alt={member.name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-purple-600" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-gray-600">{member.position}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <p className="text-sm font-medium">₹{member.hourlyRate}/hr</p>
                          <p className="text-xs text-gray-600">Hourly Rate</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium">{stats.totalHours.toFixed(1)}h</p>
                          <p className="text-xs text-gray-600">Hours Worked</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-green-600">₹{monthlyPay.toLocaleString()}</p>
                          <p className="text-xs text-gray-600">Monthly Pay</p>
                        </div>
                        <Badge className={getStatusColor(member.status)} variant="outline">
                          {member.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total Monthly Payroll:</span>
                    <span className="text-2xl font-bold text-purple-600">₹{totalMonthlyPayroll.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quick-attendance" className="space-y-6">
          {/* Quick Attendance Tracking */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Quick Attendance</CardTitle>
              <CardDescription>Mark attendance for selected date</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-4">
                <Label>Date:</Label>
                <Input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="w-auto"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeStaff.map((member) => {
                  const todayRecord = member.attendanceRecords.find(
                    record => record.date === attendanceDate
                  );
                  return (
                    <div key={member.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{member.name}</span>
                        {todayRecord && (
                          <Badge className={
                            todayRecord.status === 'present' ? 'bg-green-100 text-green-700' :
                            todayRecord.status === 'late' ? 'bg-yellow-100 text-yellow-700' :
                            todayRecord.status === 'half-day' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
                          }>
                            {todayRecord.status}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:bg-green-50"
                          onClick={() => markAttendance(member.id, 'present')}
                        >
                          Present
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-yellow-600 hover:bg-yellow-50"
                          onClick={() => markAttendance(member.id, 'late')}
                        >
                          Late
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 hover:bg-blue-50"
                          onClick={() => markAttendance(member.id, 'half-day')}
                        >
                          Half Day
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => markAttendance(member.id, 'absent')}
                        >
                          Absent
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Member Details Dialog */}
      {selectedMember && (
        <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedMember.name} - Details</DialogTitle>
              <DialogDescription>
                Complete staff member information and attendance history
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Information</TabsTrigger>
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
              </TabsList>
              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Position</Label>
                    <p className="text-sm font-medium">{selectedMember.position}</p>
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Badge className={getRoleColor(selectedMember.role)}>{selectedMember.role}</Badge>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="text-sm">{selectedMember.email}</p>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <p className="text-sm">{selectedMember.phone}</p>
                  </div>
                  <div>
                    <Label>Hourly Rate</Label>
                    <p className="text-sm font-medium">₹{selectedMember.hourlyRate}/hr</p>
                  </div>
                  <div>
                    <Label>Monthly Salary</Label>
                    <p className="text-sm font-medium">₹{selectedMember.salary.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label>Join Date</Label>
                    <p className="text-sm">{selectedMember.joinDate}</p>
                  </div>
                  <div>
                    <Label>Monthly Pay (Hours Based)</Label>
                    <p className="text-sm font-medium text-green-600">₹{calculateMonthlyPayroll(selectedMember).toLocaleString()}</p>
                  </div>
                </div>
                {selectedMember.address && (
                  <div>
                    <Label>Address</Label>
                    <p className="text-sm">{selectedMember.address}</p>
                  </div>
                )}
                {selectedMember.emergencyContact && (
                  <div>
                    <Label>Emergency Contact</Label>
                    <p className="text-sm">{selectedMember.emergencyContact}</p>
                  </div>
                )}
                {selectedMember.notes && (
                  <div>
                    <Label>Notes</Label>
                    <p className="text-sm">{selectedMember.notes}</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="attendance" className="space-y-4">
                <div className="max-h-60 overflow-y-auto">
                  {selectedMember.attendanceRecords.length > 0 ? (
                    <div className="space-y-2">
                      {selectedMember.attendanceRecords
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((record, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm">{record.date}</span>
                          <div className="flex items-center space-x-2">
                            {record.timeIn && <span className="text-xs text-gray-600">In: {record.timeIn}</span>}
                            {record.timeOut && <span className="text-xs text-gray-600">Out: {record.timeOut}</span>}
                            {record.totalHours && <span className="text-xs font-medium">{record.totalHours}h</span>}
                            <Badge className={
                              record.status === 'present' ? 'bg-green-100 text-green-700' :
                              record.status === 'late' ? 'bg-yellow-100 text-yellow-700' :
                              record.status === 'half-day' ? 'bg-blue-100 text-blue-700' :
                              'bg-red-100 text-red-700'
                            }>
                              {record.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center">No attendance records found</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Image Viewer Dialog */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Profile Image</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">
              <img 
                src={selectedImage} 
                alt="Profile" 
                className="max-w-full max-h-96 object-contain rounded-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Staff;
