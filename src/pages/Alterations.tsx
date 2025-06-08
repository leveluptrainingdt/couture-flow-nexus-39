
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Scissors, Clock, CheckCircle, AlertTriangle, Upload, Image } from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';

interface Alteration {
  id: string;
  customerName: string;
  customerPhone: string;
  itemType: string;
  alterationType: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'not-started' | 'in-progress' | 'completed' | 'delivered';
  assignedStaff?: string;
  estimatedCompletion: string;
  actualCompletion?: string;
  beforeImages: string[];
  afterImages: string[];
  cost: number;
  notes?: string;
  createdAt: any;
  updatedAt: any;
}

const Alterations = () => {
  const { userData } = useAuth();
  const [alterations, setAlterations] = useState<Alteration[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAlteration, setEditingAlteration] = useState<Alteration | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    itemType: '',
    alterationType: '',
    description: '',
    priority: 'medium' as const,
    status: 'not-started' as const,
    assignedStaff: '',
    estimatedCompletion: '',
    cost: 0,
    notes: ''
  });

  const alterationTypes = [
    'Hemming',
    'Taking In',
    'Letting Out',
    'Sleeve Adjustment',
    'Shoulder Adjustment',
    'Length Adjustment',
    'Zipper Repair',
    'Button Replacement',
    'Patch Work',
    'Complete Restyling',
    'Other'
  ];

  const itemTypes = [
    'Dress',
    'Blouse',
    'Saree',
    'Lehenga',
    'Kurta',
    'Pants',
    'Skirt',
    'Jacket',
    'Other'
  ];

  useEffect(() => {
    fetchAlterations();
  }, []);

  const fetchAlterations = async () => {
    try {
      const alterationsQuery = query(
        collection(db, 'alterations'),
        orderBy('createdAt', 'desc')
      );
      const alterationsSnapshot = await getDocs(alterationsQuery);
      const alterationsData = alterationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        beforeImages: doc.data().beforeImages || [],
        afterImages: doc.data().afterImages || []
      })) as Alteration[];
      
      setAlterations(alterationsData);
    } catch (error) {
      console.error('Error fetching alterations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch alterations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const alterationData = {
        ...formData,
        beforeImages: [],
        afterImages: [],
        updatedAt: serverTimestamp(),
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
          description: "Alteration added successfully",
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
      itemType: '',
      alterationType: '',
      description: '',
      priority: 'medium',
      status: 'not-started',
      assignedStaff: '',
      estimatedCompletion: '',
      cost: 0,
      notes: ''
    });
  };

  const handleEdit = (alteration: Alteration) => {
    setEditingAlteration(alteration);
    setFormData({
      customerName: alteration.customerName,
      customerPhone: alteration.customerPhone,
      itemType: alteration.itemType,
      alterationType: alteration.alterationType,
      description: alteration.description,
      priority: alteration.priority,
      status: alteration.status,
      assignedStaff: alteration.assignedStaff || '',
      estimatedCompletion: alteration.estimatedCompletion,
      cost: alteration.cost,
      notes: alteration.notes || ''
    });
    setIsDialogOpen(true);
  };

  const updateStatus = async (alterationId: string, newStatus: Alteration['status']) => {
    try {
      const updateData: any = {
        status: newStatus,
        updatedAt: serverTimestamp()
      };

      if (newStatus === 'completed') {
        updateData.actualCompletion = new Date().toISOString().split('T')[0];
      }

      await updateDoc(doc(db, 'alterations', alterationId), updateData);
      toast({
        title: "Success",
        description: "Status updated successfully",
      });
      fetchAlterations();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const uploadImage = async (file: File, alterationId: string, imageType: 'before' | 'after') => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'swetha');

      const response = await fetch('https://api.cloudinary.com/v1_1/dvmrhs2ek/image/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.secure_url) {
        const alteration = alterations.find(alt => alt.id === alterationId);
        if (alteration) {
          const updatedImages = imageType === 'before' 
            ? [...alteration.beforeImages, data.secure_url]
            : [...alteration.afterImages, data.secure_url];

          await updateDoc(doc(db, 'alterations', alterationId), {
            [imageType === 'before' ? 'beforeImages' : 'afterImages']: updatedImages,
            updatedAt: serverTimestamp()
          });

          toast({
            title: "Success",
            description: `${imageType === 'before' ? 'Before' : 'After'} image uploaded successfully`,
          });
          fetchAlterations();
        }
      }
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

  const getStatusColor = (status: Alteration['status']) => {
    switch (status) {
      case 'not-started': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'in-progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'delivered': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityColor = (priority: Alteration['priority']) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'urgent': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Alterations</h1>
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

  const activeAlterations = alterations.filter(alt => alt.status === 'in-progress');
  const completedAlterations = alterations.filter(alt => alt.status === 'completed');
  const urgentAlterations = alterations.filter(alt => alt.priority === 'urgent');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alterations & Rework</h1>
          <p className="text-gray-600">Track alteration projects and deadlines</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              onClick={() => {
                setEditingAlteration(null);
                resetForm();
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Alteration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAlteration ? 'Edit Alteration' : 'Add New Alteration'}
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
                    placeholder="Customer name"
                    required
                  />
                </div>
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
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="itemType">Item Type</Label>
                  <select
                    id="itemType"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={formData.itemType}
                    onChange={(e) => setFormData({...formData, itemType: e.target.value})}
                    required
                  >
                    <option value="">Select item</option>
                    {itemTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="alterationType">Alteration Type</Label>
                  <select
                    id="alterationType"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={formData.alterationType}
                    onChange={(e) => setFormData({...formData, alterationType: e.target.value})}
                    required
                  >
                    <option value="">Select alteration</option>
                    {alterationTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Detailed description of the alteration needed"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <select
                    id="priority"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value as Alteration['priority']})}
                    required
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as Alteration['status']})}
                    required
                  >
                    <option value="not-started">Not Started</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="cost">Cost (₹)</Label>
                  <Input
                    id="cost"
                    type="number"
                    min="0"
                    value={formData.cost}
                    onChange={(e) => setFormData({...formData, cost: parseFloat(e.target.value) || 0})}
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="estimatedCompletion">Estimated Completion</Label>
                <Input
                  id="estimatedCompletion"
                  type="date"
                  value={formData.estimatedCompletion}
                  onChange={(e) => setFormData({...formData, estimatedCompletion: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
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
                <Button type="submit" className="bg-gradient-to-r from-purple-600 to-blue-600">
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
            <CardTitle className="text-sm font-medium text-gray-600">Total Projects</CardTitle>
            <Scissors className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{alterations.length}</div>
            <p className="text-xs text-gray-500">All alteration projects</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">In Progress</CardTitle>
            <Clock className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{activeAlterations.length}</div>
            <p className="text-xs text-gray-500">Currently working on</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{completedAlterations.length}</div>
            <p className="text-xs text-gray-500">Successfully completed</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Urgent</CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{urgentAlterations.length}</div>
            <p className="text-xs text-gray-500">Need immediate attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Alterations Grid */}
      {alterations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {alterations.map((alteration) => (
            <Card key={alteration.id} className="hover:shadow-lg transition-all duration-300 border-0 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{alteration.customerName}</CardTitle>
                    <CardDescription>{alteration.itemType} - {alteration.alterationType}</CardDescription>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <Badge className={getStatusColor(alteration.status)} variant="outline">
                      {alteration.status.replace('-', ' ')}
                    </Badge>
                    <Badge className={getPriorityColor(alteration.priority)} variant="outline">
                      {alteration.priority}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600 line-clamp-2">{alteration.description}</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Cost:</span>
                    <span className="font-medium">₹{alteration.cost}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Due Date:</span>
                    <span className="font-medium">{alteration.estimatedCompletion}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">{alteration.customerPhone}</span>
                  </div>
                </div>

                {/* Image Upload Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Images:</span>
                    <div className="flex space-x-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadImage(file, alteration.id, 'before');
                        }}
                        style={{ display: 'none' }}
                        id={`before-${alteration.id}`}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => document.getElementById(`before-${alteration.id}`)?.click()}
                        disabled={uploadingImage}
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        Before
                      </Button>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadImage(file, alteration.id, 'after');
                        }}
                        style={{ display: 'none' }}
                        id={`after-${alteration.id}`}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => document.getElementById(`after-${alteration.id}`)?.click()}
                        disabled={uploadingImage}
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        After
                      </Button>
                    </div>
                  </div>
                  
                  {(alteration.beforeImages.length > 0 || alteration.afterImages.length > 0) && (
                    <div className="grid grid-cols-4 gap-1">
                      {alteration.beforeImages.map((img, idx) => (
                        <div key={`before-${idx}`} className="relative">
                          <img src={img} alt="Before" className="w-full h-12 object-cover rounded border" />
                          <span className="absolute top-0 left-0 bg-blue-500 text-white text-xs px-1 rounded">B</span>
                        </div>
                      ))}
                      {alteration.afterImages.map((img, idx) => (
                        <div key={`after-${idx}`} className="relative">
                          <img src={img} alt="After" className="w-full h-12 object-cover rounded border" />
                          <span className="absolute top-0 left-0 bg-green-500 text-white text-xs px-1 rounded">A</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Status Updates */}
                <div className="flex flex-wrap gap-2">
                  {alteration.status === 'not-started' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-600 hover:bg-blue-50"
                      onClick={() => updateStatus(alteration.id, 'in-progress')}
                    >
                      Start Work
                    </Button>
                  )}
                  {alteration.status === 'in-progress' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 hover:bg-green-50"
                      onClick={() => updateStatus(alteration.id, 'completed')}
                    >
                      Mark Complete
                    </Button>
                  )}
                  {alteration.status === 'completed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-purple-600 hover:bg-purple-50"
                      onClick={() => updateStatus(alteration.id, 'delivered')}
                    >
                      Mark Delivered
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(alteration)}
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
            <Scissors className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No alterations found</h3>
            <p className="text-gray-600 mb-4">
              Start by adding your first alteration project.
            </p>
            <Button 
              className="bg-gradient-to-r from-purple-600 to-blue-600"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Alteration
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Alterations;
