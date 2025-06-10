
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
import { 
  Plus, 
  Search, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  MessageCircle,
  Edit,
  Trash2,
  Filter,
  AlertCircle
} from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  clientAddress?: string;
  appointmentDate: any;
  appointmentTime: string;
  serviceType: 'consultation' | 'measurement' | 'design-review' | 'trial' | 'fitting' | 'delivery';
  status: 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  createdAt: any;
  updatedAt: any;
}

const Appointments = () => {
  const { userData } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    clientAddress: '',
    appointmentDate: new Date(),
    appointmentTime: '',
    serviceType: 'consultation' as 'consultation' | 'measurement' | 'design-review' | 'trial' | 'fitting' | 'delivery',
    status: 'confirmed' as 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show',
    notes: ''
  });

  const serviceTypes = [
    { value: 'consultation', label: 'Bridal Consultation' },
    { value: 'measurement', label: 'Measurement Session' },
    { value: 'design-review', label: 'Design Review' },
    { value: 'trial', label: 'Trial Fitting' },
    { value: 'fitting', label: 'Final Fitting' },
    { value: 'delivery', label: 'Delivery' }
  ];

  const statusTypes = [
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'no-show', label: 'No Show' }
  ];

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00'
  ];

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    filterAppointments();
  }, [appointments, searchTerm, statusFilter, dateFilter]);

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

  const filterAppointments = () => {
    let filtered = appointments;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(apt => 
        apt.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.clientPhone.includes(searchTerm) ||
        apt.serviceType.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(apt => apt.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      filtered = filtered.filter(apt => {
        const appointmentDate = apt.appointmentDate?.toDate();
        if (!appointmentDate) return false;

        switch (dateFilter) {
          case 'today':
            return appointmentDate.toDateString() === today.toDateString();
          case 'tomorrow':
            return appointmentDate.toDateString() === tomorrow.toDateString();
          case 'this-week':
            const weekFromNow = new Date(today);
            weekFromNow.setDate(weekFromNow.getDate() + 7);
            return appointmentDate >= today && appointmentDate <= weekFromNow;
          case 'upcoming':
            return appointmentDate > today;
          case 'missed':
            return appointmentDate < today && (apt.status === 'confirmed' || apt.status === 'in-progress');
          case 'completed':
            return apt.status === 'completed';
          default:
            return true;
        }
      });
    }

    setFilteredAppointments(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Format phone number
      let formattedPhone = formData.clientPhone;
      if (!formattedPhone.startsWith('+91')) {
        formattedPhone = '+91' + formattedPhone.replace(/\D/g, '');
      }

      const appointmentData = {
        ...formData,
        clientPhone: formattedPhone,
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
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      clientAddress: '',
      appointmentDate: new Date(),
      appointmentTime: '',
      serviceType: 'consultation',
      status: 'confirmed',
      notes: ''
    });
    setSelectedDate(undefined);
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setFormData({
      clientName: appointment.clientName,
      clientPhone: appointment.clientPhone,
      clientEmail: appointment.clientEmail || '',
      clientAddress: appointment.clientAddress || '',
      appointmentDate: appointment.appointmentDate?.toDate() || new Date(),
      appointmentTime: appointment.appointmentTime,
      serviceType: appointment.serviceType,
      status: appointment.status,
      notes: appointment.notes || ''
    });
    setSelectedDate(appointment.appointmentDate?.toDate());
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
      case 'confirmed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'in-progress': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      case 'no-show': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getServiceColor = (type: Appointment['serviceType']) => {
    switch (type) {
      case 'consultation': return 'bg-purple-100 text-purple-700';
      case 'measurement': return 'bg-indigo-100 text-indigo-700';
      case 'design-review': return 'bg-cyan-100 text-cyan-700';
      case 'trial': return 'bg-orange-100 text-orange-700';
      case 'fitting': return 'bg-emerald-100 text-emerald-700';
      case 'delivery': return 'bg-pink-100 text-pink-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const generateWhatsAppMessage = (appointment: Appointment) => {
    const date = appointment.appointmentDate?.toDate().toLocaleDateString();
    const time = appointment.appointmentTime;
    return `Hi ${appointment.clientName}, your appointment at Swetha's Couture is scheduled for ${date} at ${time}. Let us know if you'd like to reschedule.`;
  };

  const isUpcomingSoon = (appointment: Appointment) => {
    const appointmentDate = appointment.appointmentDate?.toDate();
    if (!appointmentDate) return false;
    
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    
    return appointmentDate <= oneHourFromNow && appointmentDate > now;
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
          <h1 className="text-3xl font-bold text-gray-900">Appointments Management</h1>
          <p className="text-gray-600">Manage client appointments and scheduling</p>
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
              Add Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAppointment ? 'Edit Appointment' : 'Schedule New Appointment'}
              </DialogTitle>
              <DialogDescription>
                Fill in the appointment details below.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input
                    id="clientName"
                    value={formData.clientName}
                    onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                    placeholder="Enter client name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="clientPhone">Phone Number</Label>
                  <Input
                    id="clientPhone"
                    value={formData.clientPhone}
                    onChange={(e) => setFormData({...formData, clientPhone: e.target.value})}
                    placeholder="+91 98765 43210"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientEmail">Email (Optional)</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData({...formData, clientEmail: e.target.value})}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="serviceType">Service Type</Label>
                  <Select
                    value={formData.serviceType}
                    onValueChange={(value) => setFormData({...formData, serviceType: value as any})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceTypes.map(service => (
                        <SelectItem key={service.value} value={service.value}>
                          {service.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="clientAddress">Address (Optional)</Label>
                <Input
                  id="clientAddress"
                  value={formData.clientAddress}
                  onChange={(e) => setFormData({...formData, clientAddress: e.target.value})}
                  placeholder="Client address"
                />
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
                  <Select
                    value={formData.appointmentTime}
                    onValueChange={(value) => setFormData({...formData, appointmentTime: value})}
                  >
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
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({...formData, status: value as any})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusTypes.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes / Comments</Label>
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
                  {editingAppointment ? 'Update Appointment' : 'Schedule Appointment'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by client name, phone, or service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statusTypes.map(status => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Dates</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="tomorrow">Tomorrow</SelectItem>
            <SelectItem value="this-week">This Week</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="missed">Missed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
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

      {/* Appointments Table */}
      {filteredAppointments.length > 0 ? (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Appointment Details</CardTitle>
            <CardDescription>Manage and view all client appointments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Client Info</th>
                    <th className="text-left p-3 font-medium">Date & Time</th>
                    <th className="text-left p-3 font-medium">Service</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Notes</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map((appointment) => (
                    <tr key={appointment.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="space-y-1">
                          <div className="font-medium flex items-center space-x-2">
                            <User className="h-4 w-4 text-purple-600" />
                            <span>{appointment.clientName}</span>
                            {isUpcomingSoon(appointment) && (
                              <AlertCircle className="h-4 w-4 text-orange-500" />
                            )}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center space-x-2">
                            <Phone className="h-3 w-3" />
                            <span>{appointment.clientPhone}</span>
                          </div>
                          {appointment.clientEmail && (
                            <div className="text-sm text-gray-600 flex items-center space-x-2">
                              <Mail className="h-3 w-3" />
                              <span>{appointment.clientEmail}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <div className="font-medium">
                            {appointment.appointmentDate?.toDate().toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{appointment.appointmentTime}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge className={getServiceColor(appointment.serviceType)} variant="outline">
                          {serviceTypes.find(s => s.value === appointment.serviceType)?.label}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Select
                          value={appointment.status}
                          onValueChange={(value) => updateStatus(appointment.id, value as any)}
                        >
                          <SelectTrigger className="w-32">
                            <Badge className={getStatusColor(appointment.status)} variant="outline">
                              {statusTypes.find(s => s.value === appointment.status)?.label}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {statusTypes.map(status => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3">
                        <div className="text-sm text-gray-600 max-w-xs truncate">
                          {appointment.notes || 'No notes'}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600 hover:bg-blue-50"
                            onClick={() => window.open(`tel:${appointment.clientPhone}`, '_self')}
                          >
                            <Phone className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:bg-green-50"
                            onClick={() => {
                              const message = encodeURIComponent(generateWhatsAppMessage(appointment));
                              const phone = appointment.clientPhone.replace(/\D/g, '');
                              window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
                            }}
                          >
                            <MessageCircle className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(appointment)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(appointment.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' || dateFilter !== 'all' 
                ? 'Try adjusting your search filters.'
                : 'Start by scheduling your first appointment.'
              }
            </p>
            {(!searchTerm && statusFilter === 'all' && dateFilter === 'all') && (
              <Button 
                className="bg-gradient-to-r from-purple-600 to-blue-600"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Schedule First Appointment
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Appointments;
