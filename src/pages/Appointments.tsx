import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Calendar as CalendarIcon, Clock, User, Phone, Mail, MapPin } from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Appointment {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  appointmentDate: any;
  appointmentTime: string;
  appointmentType: 'consultation' | 'fitting' | 'delivery' | 'alteration';
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  notes?: string;
  assignedStaff?: string;
  createdAt: any;
  updatedAt: any;
}

const Appointments = () => {
  const { userData } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    appointmentDate: new Date(),
    appointmentTime: '',
    appointmentType: 'consultation' as 'consultation' | 'fitting' | 'delivery' | 'alteration',
    status: 'scheduled' as 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled',
    notes: '',
    assignedStaff: ''
  });

  const appointmentTypes = [
    { value: 'consultation', label: 'Initial Consultation' },
    { value: 'fitting', label: 'Fitting Session' },
    { value: 'delivery', label: 'Delivery' },
    { value: 'alteration', label: 'Alteration Review' }
  ];

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00'
  ];

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        orderBy('appointmentDate', 'desc')
      );
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      const appointmentsData = appointmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Appointment[];
      
      setAppointments(appointmentsData);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch appointments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const appointmentData = {
        ...formData,
        appointmentDate: selectedDate || formData.appointmentDate,
        updatedAt: serverTimestamp(),
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
          description: "Appointment booked successfully",
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
      appointmentDate: new Date(),
      appointmentTime: '',
      appointmentType: 'consultation',
      status: 'scheduled',
      notes: '',
      assignedStaff: ''
    });
    setSelectedDate(undefined);
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setFormData({
      customerName: appointment.customerName,
      customerPhone: appointment.customerPhone,
      customerEmail: appointment.customerEmail || '',
      appointmentDate: appointment.appointmentDate?.toDate() || new Date(),
      appointmentTime: appointment.appointmentTime,
      appointmentType: appointment.appointmentType,
      status: appointment.status,
      notes: appointment.notes || '',
      assignedStaff: appointment.assignedStaff || ''
    });
    setSelectedDate(appointment.appointmentDate?.toDate());
    setIsDialogOpen(true);
  };

  const updateStatus = async (appointmentId: string, newStatus: Appointment['status']) => {
    try {
      await updateDoc(doc(db, 'appointments', appointmentId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast({
        title: "Success",
        description: "Appointment status updated",
      });
      fetchAppointments();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'confirmed': return 'bg-green-100 text-green-700 border-green-200';
      case 'in-progress': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'completed': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getTypeColor = (type: Appointment['appointmentType']) => {
    switch (type) {
      case 'consultation': return 'bg-indigo-100 text-indigo-700';
      case 'fitting': return 'bg-emerald-100 text-emerald-700';
      case 'delivery': return 'bg-orange-100 text-orange-700';
      case 'alteration': return 'bg-pink-100 text-pink-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Appointments</h1>
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

  const todaysAppointments = appointments.filter(apt => {
    const today = new Date();
    const appointmentDate = apt.appointmentDate?.toDate();
    return appointmentDate?.toDateString() === today.toDateString();
  });

  const upcomingAppointments = appointments.filter(apt => {
    const today = new Date();
    const appointmentDate = apt.appointmentDate?.toDate();
    return appointmentDate && appointmentDate > today;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-600">Manage customer appointments and scheduling</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              onClick={() => {
                setEditingAppointment(null);
                resetForm();
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Book Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAppointment ? 'Edit Appointment' : 'Book New Appointment'}
              </DialogTitle>
              <DialogDescription>
                Fill in the appointment details below.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                    placeholder="Phone number"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                    placeholder="Email address"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Appointment Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="appointmentTime">Time</Label>
                  <select
                    id="appointmentTime"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={formData.appointmentTime}
                    onChange={(e) => setFormData({...formData, appointmentTime: e.target.value})}
                    required
                  >
                    <option value="">Select time</option>
                    {timeSlots.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="appointmentType">Type</Label>
                  <select
                    id="appointmentType"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={formData.appointmentType}
                    onChange={(e) => setFormData({...formData, appointmentType: e.target.value as 'consultation' | 'fitting' | 'delivery' | 'alteration'})}
                    required
                  >
                    {appointmentTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled'})}
                    required
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional notes about the appointment"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-purple-600 to-blue-600">
                  {editingAppointment ? 'Update Appointment' : 'Book Appointment'}
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
            <CardTitle className="text-sm font-medium text-gray-600">Today's Appointments</CardTitle>
            <CalendarIcon className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{todaysAppointments.length}</div>
            <p className="text-xs text-gray-500">Scheduled for today</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Upcoming</CardTitle>
            <Clock className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{upcomingAppointments.length}</div>
            <p className="text-xs text-gray-500">Future appointments</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total This Month</CardTitle>
            <User className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{appointments.length}</div>
            <p className="text-xs text-gray-500">All appointments</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
            <CalendarIcon className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {appointments.filter(apt => apt.status === 'completed').length}
            </div>
            <p className="text-xs text-gray-500">Successfully completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Appointments List */}
      {appointments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {appointments.map((appointment) => (
            <Card key={appointment.id} className="hover:shadow-lg transition-all duration-300 border-0 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <User className="h-5 w-5 text-purple-600" />
                      <span>{appointment.customerName}</span>
                    </CardTitle>
                    <CardDescription className="flex items-center space-x-1 mt-1">
                      <Phone className="h-3 w-3" />
                      <span>{appointment.customerPhone}</span>
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(appointment.status)} variant="outline">
                    {appointment.status.replace('-', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">
                      {appointment.appointmentDate?.toDate().toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium">{appointment.appointmentTime}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Type:</span>
                    <Badge className={getTypeColor(appointment.appointmentType)} variant="outline">
                      {appointment.appointmentType}
                    </Badge>
                  </div>
                  {appointment.customerEmail && (
                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                      <Mail className="h-3 w-3" />
                      <span>{appointment.customerEmail}</span>
                    </div>
                  )}
                  {appointment.notes && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Notes:</span> {appointment.notes}
                    </div>
                  )}
                </div>

                {/* Quick Status Updates */}
                <div className="flex flex-wrap gap-2">
                  {appointment.status === 'scheduled' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 hover:bg-green-50"
                      onClick={() => updateStatus(appointment.id, 'confirmed')}
                    >
                      Confirm
                    </Button>
                  )}
                  {appointment.status === 'confirmed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-600 hover:bg-blue-50"
                      onClick={() => updateStatus(appointment.id, 'in-progress')}
                    >
                      Start
                    </Button>
                  )}
                  {appointment.status === 'in-progress' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-purple-600 hover:bg-purple-50"
                      onClick={() => updateStatus(appointment.id, 'completed')}
                    >
                      Complete
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(appointment)}
                  >
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments scheduled</h3>
            <p className="text-gray-600 mb-4">
              Start by booking your first appointment.
            </p>
            <Button 
              className="bg-gradient-to-r from-purple-600 to-blue-600"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Book First Appointment
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Appointments;
