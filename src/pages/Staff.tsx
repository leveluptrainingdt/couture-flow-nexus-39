
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Users, UserCheck, UserX, Upload, Camera, DollarSign, Calendar } from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'staff' | 'admin';
  position: string;
  department: string;
  joiningDate: string;
  salary: number;
  status: 'active' | 'inactive' | 'on-leave';
  address?: string;
  emergencyContact?: string;
  skills: string[];
  profileImage?: string;
  attendanceRecords: AttendanceRecord[];
  createdAt: any;
  updatedAt: any;
}

interface AttendanceRecord {
  date: string;
  checkIn: string;
  checkOut?: string;
  status: 'present' | 'absent' | 'late' | 'half-day';
  imageUrl?: string;
}

const Staff = () => {
  const { userData } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'staff' as const,
    position: '',
    department: '',
    joiningDate: '',
    salary: 0,
    status: 'active' as const,
    address: '',
    emergencyContact: '',
    skills: ''
  });

  const departments = [
    'Tailoring',
    'Design',
    'Embroidery',
    'Quality Control',
    'Customer Service',
    'Administration',
    'Management'
  ];

  const positions = [
    'Junior Tailor',
    'Senior Tailor',
    'Master Tailor',
    'Designer',
    'Pattern Maker',
    'Embroidery Specialist',
    'Quality Inspector',
    'Store Manager',
    'Customer Relations',
    'Administrator'
  ];

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
        orderBy('name', 'asc')
      );
      const staffSnapshot = await getDocs(staffQuery);
      const staffData = staffSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        skills: doc.data().skills || [],
        attendanceRecords: doc.data().attendanceRecords || []
      })) as StaffMember[];
      
      setStaff(staffData);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast({
        title: "Error",
        description: "Failed to fetch staff data",
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
        skills: formData.skills.split(',').map(skill => skill.trim()).filter(skill => skill),
        attendanceRecords: [],
        updatedAt: serverTimestamp(),
        ...(editingStaff ? {} : { createdAt: serverTimestamp() })
      };

      if (editingStaff) {
        await updateDoc(doc(db, 'staff', editingStaff.id), staffData);
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
      setEditingStaff(null);
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
      department: '',
      joiningDate: '',
      salary: 0,
      status: 'active',
      address: '',
      emergencyContact: '',
      skills: ''
    });
  };

  const handleEdit = (staffMember: StaffMember) => {
    setEditingStaff(staffMember);
    setFormData({
      name: staffMember.name,
      email: staffMember.email,
      phone: staffMember.phone,
      role: staffMember.role,
      position: staffMember.position,
      department: staffMember.department,
      joiningDate: staffMember.joiningDate,
      salary: staffMember.salary,
      status: staffMember.status,
      address: staffMember.address || '',
      emergencyContact: staffMember.emergencyContact || '',
      skills: staffMember.skills.join(', ')
    });
    setIsDialogOpen(true);
  };

  const markAttendance = async (staffId: string, status: AttendanceRecord['status'], imageFile?: File) => {
    try {
      let imageUrl = '';
      
      if (imageFile) {
        setUploadingImage(true);
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('upload_preset', 'swetha');

        const response = await fetch('https://api.cloudinary.com/v1_1/dvmrhs2ek/image/upload', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();
        if (data.secure_url) {
          imageUrl = data.secure_url;
        }
        setUploadingImage(false);
      }

      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false });

      const staffMember = staff.find(s => s.id === staffId);
      if (staffMember) {
        const existingRecord = staffMember.attendanceRecords.find(record => record.date === today);
        
        let updatedRecords;
        if (existingRecord) {
          updatedRecords = staffMember.attendanceRecords.map(record =>
            record.date === today
              ? { ...record, checkOut: currentTime, status, imageUrl }
              : record
          );
        } else {
          const newRecord: AttendanceRecord = {
            date: today,
            checkIn: currentTime,
            status,
            imageUrl
          };
          updatedRecords = [...staffMember.attendanceRecords, newRecord];
        }

        await updateDoc(doc(db, 'staff', staffId), {
          attendanceRecords: updatedRecords,
          updatedAt: serverTimestamp()
        });

        toast({
          title: "Success",
          description: "Attendance marked successfully",
        });
        
        fetchStaff();
        setIsAttendanceDialogOpen(false);
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast({
        title: "Error",
        description: "Failed to mark attendance",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const calculateMonthlySalary = (staffMember: StaffMember) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyRecords = staffMember.attendanceRecords.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
    });

    const presentDays = monthlyRecords.filter(record => 
      record.status === 'present' || record.status === 'late'
    ).length;
    
    const halfDays = monthlyRecords.filter(record => record.status === 'half-day').length;
    
    const totalDays = presentDays + (halfDays * 0.5);
    const dailyRate = staffMember.salary / 30; // Assuming 30 days per month
    
    return Math.round(totalDays * dailyRate);
  };

  const getStatusColor = (status: StaffMember['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-200';
      case 'inactive': return 'bg-red-100 text-red-700 border-red-200';
      case 'on-leave': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (userData?.role !== 'admin') {
    return (
      <div className="space-y-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
            <p className="text-gray-600">
              Only administrators can access staff management.
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

  const activeStaff = staff.filter(s => s.status === 'active');
  const totalSalaryBudget = staff.reduce((sum, s) => sum + s.salary, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600">Manage team members and attendance</p>
        </div>
        <div className="flex space-x-3">
          <Dialog open={isAttendanceDialogOpen} onOpenChange={setIsAttendanceDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserCheck className="h-4 w-4 mr-2" />
                Mark Attendance
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Mark Attendance</DialogTitle>
                <DialogDescription>
                  Select staff member and mark their attendance.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {staff.map(staffMember => (
                  <div key={staffMember.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{staffMember.name}</div>
                      <div className="text-sm text-gray-500">{staffMember.position}</div>
                    </div>
                    <div className="flex space-x-2">
                      <input
                        type="file"
                        accept="image/*"
                        capture="user"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) markAttendance(staffMember.id, 'present', file);
                        }}
                        style={{ display: 'none' }}
                        id={`attendance-${staffMember.id}`}
                      />
                      <Button
                        size="sm"
                        onClick={() => document.getElementById(`attendance-${staffMember.id}`)?.click()}
                        disabled={uploadingImage}
                      >
                        <Camera className="h-3 w-3 mr-1" />
                        Check In
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                onClick={() => {
                  setEditingStaff(null);
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
                  {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
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
                </div>
                
                <div className="grid grid-cols-2 gap-4">
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="position">Position</Label>
                    <select
                      id="position"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      value={formData.position}
                      onChange={(e) => setFormData({...formData, position: e.target.value})}
                      required
                    >
                      <option value="">Select position</option>
                      {positions.map(pos => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <select
                      id="department"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      value={formData.department}
                      onChange={(e) => setFormData({...formData, department: e.target.value})}
                      required
                    >
                      <option value="">Select department</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="joiningDate">Joining Date</Label>
                    <Input
                      id="joiningDate"
                      type="date"
                      value={formData.joiningDate}
                      onChange={(e) => setFormData({...formData, joiningDate: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="salary">Salary (₹)</Label>
                    <Input
                      id="salary"
                      type="number"
                      min="0"
                      value={formData.salary}
                      onChange={(e) => setFormData({...formData, salary: parseFloat(e.target.value) || 0})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <select
                      id="status"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as StaffMember['status']})}
                      required
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="on-leave">On Leave</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="skills">Skills (comma-separated)</Label>
                  <Input
                    id="skills"
                    value={formData.skills}
                    onChange={(e) => setFormData({...formData, skills: e.target.value})}
                    placeholder="e.g., Tailoring, Embroidery, Pattern Making"
                  />
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Full address"
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

                <div className="flex justify-end space-x-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-purple-600 to-blue-600">
                    {editingStaff ? 'Update Staff Member' : 'Add Staff Member'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Staff</CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{staff.length}</div>
            <p className="text-xs text-gray-500">All team members</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Staff</CardTitle>
            <UserCheck className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{activeStaff.length}</div>
            <p className="text-xs text-gray-500">Currently working</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Monthly Budget</CardTitle>
            <DollarSign className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">₹{totalSalaryBudget.toLocaleString()}</div>
            <p className="text-xs text-gray-500">Total salaries</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Present Today</CardTitle>
            <Calendar className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {staff.filter(s => {
                const today = new Date().toISOString().split('T')[0];
                return s.attendanceRecords.some(record => 
                  record.date === today && record.status === 'present'
                );
              }).length}
            </div>
            <p className="text-xs text-gray-500">Checked in today</p>
          </CardContent>
        </Card>
      </div>

      {/* Staff Grid */}
      {staff.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staff.map((staffMember) => (
            <Card key={staffMember.id} className="hover:shadow-lg transition-all duration-300 border-0 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{staffMember.name}</CardTitle>
                    <CardDescription>{staffMember.position} - {staffMember.department}</CardDescription>
                  </div>
                  <Badge className={getStatusColor(staffMember.status)} variant="outline">
                    {staffMember.status.replace('-', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium text-xs">{staffMember.email}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">{staffMember.phone}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Salary:</span>
                    <span className="font-medium">₹{staffMember.salary.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Joining:</span>
                    <span className="font-medium">{staffMember.joiningDate}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">This Month:</span>
                    <span className="font-medium">₹{calculateMonthlySalary(staffMember).toLocaleString()}</span>
                  </div>
                </div>

                {staffMember.skills.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Skills:</div>
                    <div className="flex flex-wrap gap-1">
                      {staffMember.skills.map((skill, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Attendance */}
                <div>
                  <div className="text-sm text-gray-600 mb-2">Recent Attendance:</div>
                  <div className="flex space-x-1">
                    {Array.from({ length: 7 }, (_, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() - (6 - i));
                      const dateStr = date.toISOString().split('T')[0];
                      const record = staffMember.attendanceRecords.find(r => r.date === dateStr);
                      
                      return (
                        <div
                          key={i}
                          className={`w-6 h-6 rounded text-xs flex items-center justify-center ${
                            record?.status === 'present' ? 'bg-green-500 text-white' :
                            record?.status === 'late' ? 'bg-yellow-500 text-white' :
                            record?.status === 'half-day' ? 'bg-orange-500 text-white' :
                            record?.status === 'absent' ? 'bg-red-500 text-white' :
                            'bg-gray-200 text-gray-500'
                          }`}
                          title={`${date.toLocaleDateString()} - ${record?.status || 'no record'}`}
                        >
                          {date.getDate()}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleEdit(staffMember)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markAttendance(staffMember.id, 'present')}
                  >
                    Mark Present
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
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
              Add First Staff Member
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Staff;
