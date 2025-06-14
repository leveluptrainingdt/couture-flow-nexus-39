
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Calendar as CalendarIcon, Clock, CheckCircle, Search, Edit, Trash2, Phone, MessageCircle, User } from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import LoadingSpinner from '@/components/LoadingSpinner';
import ContactActions from '@/components/ContactActions';

interface Appointment {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  appointmentDate: any;
  appointmentTime: string;
  duration: number;
  purpose: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  reminderSent?: boolean;
  createdAt: any;
}

const Appointments = () => {
  const { userData } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date>();

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    appointmentDate: '',
    appointmentTime: '',
    duration: '60',
    purpose: '',
    notes: ''
  });

  const appointmentPurposes = [
    'Consultation',
    'Measurement',
    'Fitting',
    'Delivery',
    'Alteration',
    'Design Discussion',
    'Follow-up'
  ];

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'
  ];

  useEffect(() => {
    if (!userData) {
      setLoading(false);
      return;
    }
    fetchAppointments();
  }, [userData]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        orderBy('appointmentDate', 'asc')
      );
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      const appointmentsData = appointmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Appointment[];
      
      setAppointments(appointmentsData || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch appointments",
        variant: "destructive",
      });
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const appointmentDateTime = new Date(`${formData.appointmentDate}T${formData.appointmentTime}`);
      
      const appointmentData = {
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerEmail: formData.customerEmail || undefined,
        appointmentDate: appointmentDateTime,
        appointmentTime: formData.appointmentTime,
        duration: parseInt(formData.duration),
        purpose: formData.purpose,
        notes: formData.notes || undefined,
        status: 'scheduled' as const,
        reminderSent: false,
        ...(editingAppointment ? {} : { createdAt: serverTimestamp() })
      };

      if (editingAppointment) {
        await updateDoc(doc(db, 'appointments', editingAppointment.id), appointmentData);
        toast({
          title: "Success",
          description: "Appointment updated successfully",
        });
      } else {
        await addDoc(collection(db, 'appointments'), appointmentData);
        toast({
          title: "Success",
          description: "Appointment scheduled successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingAppointment(null);
      resetForm();
      fetchAppointments();
    } catch (error) {
      console.error('Error saving appointment:', error);
      toast({
        title: "Error",
        description: "Failed to save appointment",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      appointmentDate: '',
      appointmentTime: '',
      duration: '60',
      purpose: '',
      notes: ''
    });
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    const appointmentDate = appointment.appointmentDate?.toDate?.() || new Date(appointment.appointmentDate);
    setFormData({
      customerName: appointment.customerName || '',
      customerPhone: appointment.customerPhone || '',
      customerEmail: appointment.customerEmail || '',
      appointmentDate: format(appointmentDate, 'yyyy-MM-dd'),
      appointmentTime: appointment.appointmentTime || '',
      duration: appointment.duration?.toString() || '60',
      purpose: appointment.purpose || '',
      notes: appointment.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (appointmentId: string) => {
    if (window.confirm('Are you sure you want to delete this appointment?')) {
      try {
        await deleteDoc(doc(db, 'appointments', appointmentId));
        toast({
          title: "Success",
          description: "Appointment deleted successfully",
        });
        fetchAppointments();
      } catch (error) {
        console.error('Error deleting appointment:', error);
        toast({
          title: "Error",
          description: "Failed to delete appointment",
          variant: "destructive",
        });
      }
    }
  };

  const updateStatus = async (appointmentId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'appointments', appointmentId), {
        status: newStatus
      });
      
      toast({
        title: "Success",
        description: `Appointment marked as ${newStatus}`,
      });
      fetchAppointments();
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast({
        title: "Error",
        description: "Failed to update appointment status",
        variant: "destructive",
      });
    }
  };

  if (!userData) {
    return <LoadingSpinner type="page" />;
  }

  if (loading) {
    return <LoadingSpinner type="page" />;
  }

  const filteredAppointments = appointments.filter(appointment => {
    if (!appointment) return false;
    
    const matchesSearch = (
      (appointment.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (appointment.purpose || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Safe calculations
  const todayAppointments = appointments.filter(apt => {
    if (!apt?.appointmentDate) return false;
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const aptDate = apt.appointmentDate?.toDate?.() || new Date(apt.appointmentDate);
      return format(aptDate, 'yyyy-MM-dd') === today;
    } catch {
      return false;
    }
  }).length;

  const upcomingAppointments = appointments.filter(apt => {
    if (!apt?.appointmentDate) return false;
    try {
      const aptDate = apt.appointmentDate?.toDate?.() || new Date(apt.appointmentDate);
      return aptDate > new Date() && apt.status !== 'cancelled';
    } catch {
      return false;
    }
  }).length;

  const totalAppointments = appointments.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-600">Schedule and manage customer appointments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-blue-600 to-purple-600"
              onClick={() => {
                setEditingAppointment(null);
                resetForm();
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Book Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAppointment ? 'Edit Appointment' : 'Book New Appointment'}
              </DialogTitle>
              <DialogDescription>
                Fill in the appointment details below.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                    placeholder="Enter customer name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Phone Number</Label>
                  <Input
                    id="customerPhone"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                    placeholder="Enter phone number"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="customerEmail">Email (Optional)</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                  placeholder="Enter email address"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="appointmentDate">Date</Label>
                  <Input
                    id="appointmentDate"
                    type="date"
                    value={formData.appointmentDate}
                    onChange={(e) => setFormData({...formData, appointmentDate: e.target.value})}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="appointmentTime">Time</Label>
                  <Select value={formData.appointmentTime} onValueChange={(value) => setFormData({...formData, appointmentTime: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Select value={formData.duration} onValueChange={(value) => setFormData({...formData, duration: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="purpose">Purpose</Label>
                <Select value={formData.purpose} onValueChange={(value) => setFormData({...formData, purpose: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    {appointmentPurposes.map(purpose => (
                      <SelectItem key={purpose} value={purpose}>{purpose}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Any additional notes or requirements"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600">
                  {editingAppointment ? 'Update Appointment' : 'Book Appointment'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Today's Appointments</CardTitle>
            <CalendarIcon className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{todayAppointments}</div>
            <p className="text-xs text-gray-500">Scheduled for today</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Upcoming</CardTitle>
            <Clock className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{upcomingAppointments}</div>
            <p className="text-xs text-gray-500">Future appointments</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Appointments</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalAppointments}</div>
            <p className="text-xs text-gray-500">All appointments</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search appointments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Appointments List */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Appointments</CardTitle>
          <CardDescription>Manage all customer appointments</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAppointments.length > 0 ? (
            <div className="space-y-4">
              {filteredAppointments.map((appointment) => {
                const appointmentDate = appointment?.appointmentDate?.toDate?.() || new Date(appointment?.appointmentDate);
                
                return (
                  <div key={appointment?.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h3 className="font-semibold">{appointment?.customerName || 'Unknown Customer'}</h3>
                          <p className="text-sm text-gray-600">
                            {format(appointmentDate, 'PPP')} at {appointment?.appointmentTime || 'No time'} • {appointment?.purpose || 'No purpose'}
                          </p>
                          <p className="text-xs text-gray-500">Duration: {appointment?.duration || 0} minutes</p>
                        </div>
                        <Badge 
                          variant={
                            appointment?.status === 'completed' ? 'default' : 
                            appointment?.status === 'confirmed' ? 'secondary' : 
                            appointment?.status === 'cancelled' ? 'destructive' : 'outline'
                          }
                        >
                          {appointment?.status || 'Unknown'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ContactActions 
                        phone={appointment?.customerPhone}
                        message={`Hi ${appointment?.customerName}, this is regarding your appointment on ${format(appointmentDate, 'PPP')} at ${appointment?.appointmentTime}.`}
                      />
                      <Select 
                        value={appointment?.status} 
                        onValueChange={(value) => updateStatus(appointment?.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(appointment)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleDelete(appointment?.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No appointments</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm ? 'No appointments match your search.' : 'Book your first appointment to get started.'}
              </p>
              {!searchTerm && (
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-purple-600"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Book First Appointment
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Appointments;
