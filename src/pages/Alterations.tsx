
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
import { Plus, Scissors, Clock, CheckCircle, Search, Edit, Trash2, Phone, MessageCircle, Calendar } from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import LoadingSpinner from '@/components/LoadingSpinner';
import ContactActions from '@/components/ContactActions';

interface Alteration {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  garmentType: string;
  alterationType: string;
  description: string;
  urgency: 'normal' | 'urgent' | 'rush';
  status: 'received' | 'in-progress' | 'completed' | 'delivered';
  estimatedCost: number;
  actualCost?: number;
  dueDate: string;
  notes?: string;
  measurements?: any;
  beforeImages?: string[];
  afterImages?: string[];
  createdAt: any;
}

const Alterations = () => {
  const { userData } = useAuth();
  const [alterations, setAlterations] = useState<Alteration[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAlteration, setEditingAlteration] = useState<Alteration | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    garmentType: '',
    alterationType: '',
    description: '',
    urgency: 'normal',
    estimatedCost: '',
    dueDate: '',
    notes: ''
  });

  const garmentTypes = [
    'Dress', 'Shirt', 'Pants', 'Skirt', 'Jacket', 'Blouse', 
    'Suit', 'Traditional Wear', 'Wedding Dress', 'Other'
  ];

  const alterationTypes = [
    'Hemming', 'Taking In', 'Letting Out', 'Shortening Sleeves',
    'Lengthening', 'Zipper Replacement', 'Button Replacement',
    'Patching', 'Resizing', 'Style Change', 'Repair', 'Other'
  ];

  useEffect(() => {
    if (!userData) {
      setLoading(false);
      return;
    }
    fetchAlterations();
  }, [userData]);

  const fetchAlterations = async () => {
    try {
      setLoading(true);
      const alterationsQuery = query(
        collection(db, 'alterations'),
        orderBy('createdAt', 'desc')
      );
      const alterationsSnapshot = await getDocs(alterationsQuery);
      const alterationsData = alterationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Alteration[];
      
      setAlterations(alterationsData || []);
    } catch (error) {
      console.error('Error fetching alterations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch alterations",
        variant: "destructive",
      });
      setAlterations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const alterationData = {
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerEmail: formData.customerEmail || undefined,
        garmentType: formData.garmentType,
        alterationType: formData.alterationType,
        description: formData.description,
        urgency: formData.urgency as 'normal' | 'urgent' | 'rush',
        estimatedCost: parseFloat(formData.estimatedCost) || 0,
        dueDate: formData.dueDate,
        notes: formData.notes || undefined,
        status: 'received' as const,
        ...(editingAlteration ? {} : { createdAt: serverTimestamp() })
      };

      if (editingAlteration) {
        await updateDoc(doc(db, 'alterations', editingAlteration.id), alterationData);
        toast({
          title: "Success",
          description: "Alteration updated successfully",
        });
      } else {
        await addDoc(collection(db, 'alterations'), alterationData);
        toast({
          title: "Success",
          description: "Alteration request added successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingAlteration(null);
      resetForm();
      fetchAlterations();
    } catch (error) {
      console.error('Error saving alteration:', error);
      toast({
        title: "Error",
        description: "Failed to save alteration",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      garmentType: '',
      alterationType: '',
      description: '',
      urgency: 'normal',
      estimatedCost: '',
      dueDate: '',
      notes: ''
    });
  };

  const handleEdit = (alteration: Alteration) => {
    setEditingAlteration(alteration);
    setFormData({
      customerName: alteration.customerName || '',
      customerPhone: alteration.customerPhone || '',
      customerEmail: alteration.customerEmail || '',
      garmentType: alteration.garmentType || '',
      alterationType: alteration.alterationType || '',
      description: alteration.description || '',
      urgency: alteration.urgency || 'normal',
      estimatedCost: alteration.estimatedCost?.toString() || '',
      dueDate: alteration.dueDate || '',
      notes: alteration.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (alterationId: string) => {
    if (window.confirm('Are you sure you want to delete this alteration request?')) {
      try {
        await deleteDoc(doc(db, 'alterations', alterationId));
        toast({
          title: "Success",
          description: "Alteration deleted successfully",
        });
        fetchAlterations();
      } catch (error) {
        console.error('Error deleting alteration:', error);
        toast({
          title: "Error",
          description: "Failed to delete alteration",
          variant: "destructive",
        });
      }
    }
  };

  const updateStatus = async (alterationId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'alterations', alterationId), {
        status: newStatus
      });
      
      toast({
        title: "Success",
        description: `Alteration marked as ${newStatus}`,
      });
      fetchAlterations();
    } catch (error) {
      console.error('Error updating alteration status:', error);
      toast({
        title: "Error",
        description: "Failed to update alteration status",
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

  const filteredAlterations = alterations.filter(alteration => {
    if (!alteration) return false;
    
    const matchesSearch = (
      (alteration.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (alteration.garmentType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (alteration.alterationType || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const matchesStatus = statusFilter === 'all' || alteration.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Safe calculations
  const totalAlterations = alterations.length;
  const inProgressAlterations = alterations.filter(alt => alt?.status === 'in-progress').length;
  const completedAlterations = alterations.filter(alt => alt?.status === 'completed').length;
  const rushJobs = alterations.filter(alt => alt?.urgency === 'rush' && alt?.status !== 'delivered').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alterations</h1>
          <p className="text-gray-600">Manage alteration requests and repairs</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-blue-600 to-purple-600"
              onClick={() => {
                setEditingAlteration(null);
                resetForm();
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Alteration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAlteration ? 'Edit Alteration' : 'New Alteration Request'}
              </DialogTitle>
              <DialogDescription>
                Fill in the alteration details below.
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="garmentType">Garment Type</Label>
                  <Select value={formData.garmentType} onValueChange={(value) => setFormData({...formData, garmentType: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select garment type" />
                    </SelectTrigger>
                    <SelectContent>
                      {garmentTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="alterationType">Alteration Type</Label>
                  <Select value={formData.alterationType} onValueChange={(value) => setFormData({...formData, alterationType: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select alteration type" />
                    </SelectTrigger>
                    <SelectContent>
                      {alterationTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe the alteration needed"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="urgency">Urgency</Label>
                  <Select value={formData.urgency} onValueChange={(value) => setFormData({...formData, urgency: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select urgency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="rush">Rush</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="estimatedCost">Estimated Cost (₹)</Label>
                  <Input
                    id="estimatedCost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.estimatedCost}
                    onChange={(e) => setFormData({...formData, estimatedCost: e.target.value})}
                    placeholder="Enter cost"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Any additional notes or special instructions"
                  rows={2}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600">
                  {editingAlteration ? 'Update Alteration' : 'Add Alteration'}
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
            <CardTitle className="text-sm font-medium text-gray-600">Total Alterations</CardTitle>
            <Scissors className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalAlterations}</div>
            <p className="text-xs text-gray-500">All requests</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">In Progress</CardTitle>
            <Clock className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{inProgressAlterations}</div>
            <p className="text-xs text-gray-500">Currently working</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{completedAlterations}</div>
            <p className="text-xs text-gray-500">Ready for pickup</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Rush Jobs</CardTitle>
            <Calendar className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{rushJobs}</div>
            <p className="text-xs text-gray-500">Priority items</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search alterations..."
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
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alterations List */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Alteration Requests</CardTitle>
          <CardDescription>Manage all alteration requests and repairs</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAlterations.length > 0 ? (
            <div className="space-y-4">
              {filteredAlterations.map((alteration) => (
                <div key={alteration?.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="font-semibold">{alteration?.customerName || 'Unknown Customer'}</h3>
                        <p className="text-sm text-gray-600">
                          {alteration?.garmentType || 'N/A'} • {alteration?.alterationType || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Due: {alteration?.dueDate ? format(new Date(alteration.dueDate), 'PPP') : 'No date'} • ₹{(alteration?.estimatedCost || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex space-x-1">
                        <Badge 
                          variant={
                            alteration?.status === 'delivered' ? 'default' : 
                            alteration?.status === 'completed' ? 'secondary' : 
                            alteration?.status === 'in-progress' ? 'outline' : 'outline'
                          }
                        >
                          {alteration?.status || 'Unknown'}
                        </Badge>
                        {alteration?.urgency === 'rush' && (
                          <Badge variant="destructive">Rush</Badge>
                        )}
                        {alteration?.urgency === 'urgent' && (
                          <Badge variant="secondary">Urgent</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ContactActions 
                      phone={alteration?.customerPhone}
                      message={`Hi ${alteration?.customerName}, your ${alteration?.garmentType} alteration is ${alteration?.status}. Due date: ${alteration?.dueDate ? format(new Date(alteration.dueDate), 'PPP') : 'TBD'}.`}
                    />
                    <Select 
                      value={alteration?.status} 
                      onValueChange={(value) => updateStatus(alteration?.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="received">Received</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(alteration)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDelete(alteration?.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Scissors className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No alterations</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm ? 'No alterations match your search.' : 'Add your first alteration request to get started.'}
              </p>
              {!searchTerm && (
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-purple-600"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Alteration
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Alterations;
