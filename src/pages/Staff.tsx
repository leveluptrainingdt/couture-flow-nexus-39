
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Users, Search, Edit, Trash2, Clock, CheckCircle, Upload } from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { uploadToCloudinary } from '@/utils/cloudinaryConfig';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'staff';
  position: string;
  salary: number;
  profileImage?: string;
  isActive: boolean;
  startDate: string;
  uid?: string;
  createdAt: any;
}

interface Attendance {
  id: string;
  staffId: string;
  staffName: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: 'present' | 'absent' | 'late' | 'on-leave';
  hoursWorked?: number;
  createdAt: any;
}

const Staff = () => {
  const { userData } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    salary: 0,
    startDate: '',
    password: ''
  });

  const positions = [
    'Tailor',
    'Designer',
    'Cutter',
    'Embroidery Specialist',
    'Quality Controller',
    'Assistant',
    'Manager',
    'Other'
  ];

  useEffect(() => {
    fetchStaff();
    fetchTodayAttendance();
  }, []);

  const fetchStaff = async () => {
    try {
      const staffQuery = query(
        collection(db, 'staff'),
        orderBy('createdAt', 'desc')
      );
      const staffSnapshot = await getDocs(staffQuery);
      const staffData = staffSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
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

  const fetchTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('date', '==', today),
        orderBy('createdAt', 'desc')
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);
      const attendanceData = attendanceSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Attendance[];
      
      setAttendance(attendanceData);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let staffData: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: 'staff',
        position: formData.position,
        salary: formData.salary || 0,
        startDate: formData.startDate,
        isActive: true,
        ...(editingStaff ? { updatedAt: serverTimestamp() } : { createdAt: serverTimestamp() })
      };

      if (editingStaff) {
        await updateDoc(doc(db, 'staff', editingStaff.id), staffData);
        toast({
          title: "Success",
          description: "Staff member updated successfully",
        });
      } else {
        // Create Firebase Auth user for staff
        if (formData.password) {
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            staffData.uid = userCredential.user.uid;

            // Create user document in users collection
            await addDoc(collection(db, 'users'), {
              uid: userCredential.user.uid,
              email: formData.email,
              role: 'staff',
              name: formData.name
            });
          } catch (authError: any) {
            console.error('Error creating auth user:', authError);
            toast({
              title: "Warning",
              description: "Staff added but login credentials creation failed",
              variant: "destructive",
            });
          }
        }

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
      console.error('Error saving staff:', error);
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
      position: '',
      salary: 0,
      startDate: '',
      password: ''
    });
  };

  const handleEdit = (staffMember: StaffMember) => {
    setEditingStaff(staffMember);
    setFormData({
      name: staffMember.name || '',
      email: staffMember.email || '',
      phone: staffMember.phone || '',
      position: staffMember.position || '',
      salary: staffMember.salary || 0,
      startDate: staffMember.startDate || '',
      password: ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (staffId: string) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      try {
        await deleteDoc(doc(db, 'staff', staffId));
        toast({
          title: "Success",
          description: "Staff member deleted successfully",
        });
        fetchStaff();
      } catch (error) {
        console.error('Error deleting staff:', error);
        toast({
          title: "Error",
          description: "Failed to delete staff member",
          variant: "destructive",
        });
      }
    }
  };

  const uploadProfileImage = async (file: File, staffId: string) => {
    setUploadingImage(true);
    try {
      const imageUrl = await uploadToCloudinary(file);
      
      await updateDoc(doc(db, 'staff', staffId), {
        profileImage: imageUrl,
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Success",
        description: "Profile image uploaded successfully",
      });
      fetchStaff();
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const filteredStaff = staff.filter(member =>
    (member.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (member.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (member.position || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAttendanceStatus = (staffId: string) => {
    const todayAttendance = attendance.find(att => att.staffId === staffId);
    if (!todayAttendance) return 'absent';
    if (todayAttendance.checkIn && !todayAttendance.checkOut) return 'present';
    if (todayAttendance.checkIn && todayAttendance.checkOut) return 'completed';
    return 'absent';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Staff Management</h1>
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

  // Safe calculations with null checks
  const totalStaff = staff.length;
  const activeStaff = staff.filter(member => member.isActive).length;
  const presentToday = attendance.filter(att => att.status === 'present' || att.checkIn).length;
  const totalSalary = staff.reduce((sum, member) => sum + (member.salary || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600">Manage staff members and attendance</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              onClick={() => {
                setEditingStaff(null);
                resetForm();
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
              </DialogTitle>
              <DialogDescription>
                Fill in the staff member details below.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Staff member name"
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
              {!editingStaff && (
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="Login password"
                    required
                  />
                </div>
              )}
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="Phone number"
                  required
                />
              </div>
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
                  {positions.map(position => (
                    <option key={position} value={position}>{position}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="salary">Monthly Salary (₹)</Label>
                  <Input
                    id="salary"
                    type="number"
                    min="0"
                    value={formData.salary}
                    onChange={(e) => setFormData({...formData, salary: parseFloat(e.target.value) || 0})}
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600">
                  {editingStaff ? 'Update Staff' : 'Add Staff'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Staff</CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalStaff}</div>
            <p className="text-xs text-gray-500">All staff members</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Staff</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{activeStaff}</div>
            <p className="text-xs text-gray-500">Currently employed</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Present Today</CardTitle>
            <Clock className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{presentToday}</div>
            <p className="text-xs text-gray-500">Checked in today</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Payroll</CardTitle>
            <Users className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">₹{totalSalary.toLocaleString()}</div>
            <p className="text-xs text-gray-500">Monthly salary budget</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search staff..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Staff Table */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Staff Members</CardTitle>
          <CardDescription>Manage staff information and attendance</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredStaff.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          {member.profileImage ? (
                            <img 
                              src={member.profileImage} 
                              alt={member.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <Users className="h-5 w-5 text-gray-500" />
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) uploadProfileImage(file, member.id);
                            }}
                            style={{ display: 'none' }}
                            id={`profile-${member.id}`}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="absolute -bottom-1 -right-1 h-6 w-6 p-0"
                            onClick={() => document.getElementById(`profile-${member.id}`)?.click()}
                            disabled={uploadingImage}
                          >
                            <Upload className="h-3 w-3" />
                          </Button>
                        </div>
                        <div>
                          <div className="font-medium">{member.name || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{member.email || 'N/A'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{member.phone || 'N/A'}</TableCell>
                    <TableCell>{member.position || 'N/A'}</TableCell>
                    <TableCell>₹{(member.salary || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={member.isActive ? "default" : "secondary"}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={
                          getAttendanceStatus(member.id) === 'present' ? 'bg-green-100 text-green-700' :
                          getAttendanceStatus(member.id) === 'completed' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }
                        variant="outline"
                      >
                        {getAttendanceStatus(member.id)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(member)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(member.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No staff members found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'No staff members match your search.' : 'Start by adding your first staff member.'}
              </p>
              {!searchTerm && (
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-purple-600"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Staff Member
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Staff;
