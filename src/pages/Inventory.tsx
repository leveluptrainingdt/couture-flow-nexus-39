
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Package, AlertTriangle, TrendingUp, TrendingDown, Search, Edit, Trash2, Phone, MessageCircle, Minus } from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import ContactActions from '@/components/ContactActions';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  type: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalValue: number;
  reorderLevel: number;
  supplier: {
    name: string;
    phone: string;
    email?: string;
  };
  location: string;
  notes?: string;
  lastUpdated: any;
  createdAt: any;
}

interface InventoryType {
  id: string;
  name: string;
  createdAt: any;
}

interface InventoryCategory {
  id: string;
  name: string;
  createdAt: any;
}

const Inventory = () => {
  const { userData } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [types, setTypes] = useState<InventoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTypeManagerOpen, setIsTypeManagerOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    type: '',
    quantity: '',
    unit: 'pieces',
    costPerUnit: '',
    reorderLevel: '',
    supplierName: '',
    supplierPhone: '',
    supplierEmail: '',
    location: '',
    notes: ''
  });

  const [newType, setNewType] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const units = ['pieces', 'meters', 'yards', 'kg', 'grams', 'rolls', 'sets'];

  useEffect(() => {
    if (!userData?.businessId) {
      setLoading(false);
      return;
    }
    fetchData();
  }, [userData?.businessId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchItems(),
        fetchCategories(),
        fetchTypes()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch inventory data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const itemsQuery = query(
        collection(db, 'inventory'),
        orderBy('createdAt', 'desc')
      );
      const itemsSnapshot = await getDocs(itemsQuery);
      const itemsData = itemsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryItem[];
      
      setItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      setItems([]);
    }
  };

  const fetchCategories = async () => {
    try {
      const categoriesQuery = query(
        collection(db, 'inventoryCategories'),
        orderBy('name', 'asc')
      );
      const categoriesSnapshot = await getDocs(categoriesQuery);
      const categoriesData = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryCategory[];
      
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const fetchTypes = async () => {
    try {
      const typesQuery = query(
        collection(db, 'inventoryTypes'),
        orderBy('name', 'asc')
      );
      const typesSnapshot = await getDocs(typesQuery);
      const typesData = typesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryType[];
      
      setTypes(typesData || []);
    } catch (error) {
      console.error('Error fetching types:', error);
      setTypes([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const quantity = parseFloat(formData.quantity) || 0;
      const costPerUnit = parseFloat(formData.costPerUnit) || 0;
      const totalValue = quantity * costPerUnit;
      
      const itemData = {
        name: formData.name,
        category: formData.category,
        type: formData.type,
        quantity,
        unit: formData.unit,
        costPerUnit,
        totalValue,
        reorderLevel: parseFloat(formData.reorderLevel) || 0,
        supplier: {
          name: formData.supplierName,
          phone: formData.supplierPhone,
          ...(formData.supplierEmail && { email: formData.supplierEmail })
        },
        location: formData.location,
        notes: formData.notes,
        lastUpdated: serverTimestamp(),
        ...(editingItem ? {} : { createdAt: serverTimestamp() })
      };

      if (editingItem) {
        await updateDoc(doc(db, 'inventory', editingItem.id), itemData);
        toast({
          title: "Success",
          description: "Item updated successfully",
        });
      } else {
        await addDoc(collection(db, 'inventory'), itemData);
        toast({
          title: "Success",
          description: "Item added successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingItem(null);
      resetForm();
      fetchItems();
    } catch (error) {
      console.error('Error saving item:', error);
      toast({
        title: "Error",
        description: "Failed to save item",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      type: '',
      quantity: '',
      unit: 'pieces',
      costPerUnit: '',
      reorderLevel: '',
      supplierName: '',
      supplierPhone: '',
      supplierEmail: '',
      location: '',
      notes: ''
    });
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      category: item.category || '',
      type: item.type || '',
      quantity: item.quantity?.toString() || '',
      unit: item.unit || 'pieces',
      costPerUnit: item.costPerUnit?.toString() || '',
      reorderLevel: item.reorderLevel?.toString() || '',
      supplierName: item.supplier?.name || '',
      supplierPhone: item.supplier?.phone || '',
      supplierEmail: item.supplier?.email || '',
      location: item.location || '',
      notes: item.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteDoc(doc(db, 'inventory', itemId));
        toast({
          title: "Success",
          description: "Item deleted successfully",
        });
        fetchItems();
      } catch (error) {
        console.error('Error deleting item:', error);
        toast({
          title: "Error",
          description: "Failed to delete item",
          variant: "destructive",
        });
      }
    }
  };

  const handleStockAdjustment = async (itemId: string, adjustment: number) => {
    try {
      const item = items.find(i => i.id === itemId);
      if (!item) return;

      const newQuantity = Math.max(0, item.quantity + adjustment);
      const newTotalValue = newQuantity * item.costPerUnit;

      await updateDoc(doc(db, 'inventory', itemId), {
        quantity: newQuantity,
        totalValue: newTotalValue,
        lastUpdated: serverTimestamp()
      });

      toast({
        title: "Stock Updated",
        description: `Quantity ${adjustment > 0 ? 'increased' : 'decreased'} by ${Math.abs(adjustment)}`,
      });

      fetchItems();
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast({
        title: "Error",
        description: "Failed to adjust stock",
        variant: "destructive",
      });
    }
  };

  const handleAddType = async () => {
    if (!newType.trim()) return;

    try {
      await addDoc(collection(db, 'inventoryTypes'), {
        name: newType.trim(),
        createdAt: serverTimestamp()
      });

      toast({
        title: "Success",
        description: "Type added successfully",
      });

      setNewType('');
      fetchTypes();
    } catch (error) {
      console.error('Error adding type:', error);
      toast({
        title: "Error",
        description: "Failed to add type",
        variant: "destructive",
      });
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;

    try {
      await addDoc(collection(db, 'inventoryCategories'), {
        name: newCategory.trim(),
        createdAt: serverTimestamp()
      });

      toast({
        title: "Success",
        description: "Category added successfully",
      });

      setNewCategory('');
      fetchCategories();
    } catch (error) {
      console.error('Error adding category:', error);
      toast({
        title: "Error",
        description: "Failed to add category",
        variant: "destructive",
      });
    }
  };

  const handleDeleteType = async (typeId: string) => {
    if (window.confirm('Are you sure you want to delete this type?')) {
      try {
        await deleteDoc(doc(db, 'inventoryTypes', typeId));
        toast({
          title: "Success",
          description: "Type deleted successfully",
        });
        fetchTypes();
      } catch (error) {
        console.error('Error deleting type:', error);
        toast({
          title: "Error",
          description: "Failed to delete type",
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await deleteDoc(doc(db, 'inventoryCategories', categoryId));
        toast({
          title: "Success",
          description: "Category deleted successfully",
        });
        fetchCategories();
      } catch (error) {
        console.error('Error deleting category:', error);
        toast({
          title: "Error",
          description: "Failed to delete category",
          variant: "destructive",
        });
      }
    }
  };

  const toggleItemExpansion = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const filteredItems = items.filter(item =>
    (item?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item?.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item?.type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item?.supplier?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Safe calculations with proper null checks
  const lowStockItems = items.filter(item => 
    (item?.quantity || 0) <= (item?.reorderLevel || 0)
  );
  const totalValue = items.reduce((sum, item) => 
    sum + ((item?.totalValue || 0)), 0
  );
  const totalItems = items.reduce((sum, item) => 
    sum + (item?.quantity || 0), 0
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600">Track materials, fabrics, and supplies</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setIsCategoryManagerOpen(true)}
          >
            Manage Categories
          </Button>
          <Button 
            variant="outline"
            onClick={() => setIsTypeManagerOpen(true)}
          >
            Manage Types
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                onClick={() => {
                  setEditingOrder(null);
                  resetForm();
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
                </DialogTitle>
                <DialogDescription>
                  Fill in the item details below.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Item Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Item name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Type</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {types.map(type => (
                          <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      placeholder="Storage location"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.quantity}
                      onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                      placeholder=""
                      onFocus={(e) => {
                        if (e.target.value === '0') e.target.value = '';
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '') e.target.value = '0';
                      }}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="unit">Unit</Label>
                    <Select value={formData.unit} onValueChange={(value) => setFormData({...formData, unit: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map(unit => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="reorderLevel">Reorder Level</Label>
                    <Input
                      id="reorderLevel"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.reorderLevel}
                      onChange={(e) => setFormData({...formData, reorderLevel: e.target.value})}
                      placeholder=""
                      onFocus={(e) => {
                        if (e.target.value === '0') e.target.value = '';
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '') e.target.value = '0';
                      }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="costPerUnit">Cost per Unit (₹)</Label>
                  <Input
                    id="costPerUnit"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.costPerUnit}
                    onChange={(e) => setFormData({...formData, costPerUnit: e.target.value})}
                    placeholder=""
                    onFocus={(e) => {
                      if (e.target.value === '0') e.target.value = '';
                    }}
                    onBlur={(e) => {
                      if (e.target.value === '') e.target.value = '0';
                    }}
                    required
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Supplier Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="supplierName">Supplier Name</Label>
                      <Input
                        id="supplierName"
                        value={formData.supplierName}
                        onChange={(e) => setFormData({...formData, supplierName: e.target.value})}
                        placeholder="Supplier name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="supplierPhone">Supplier Phone</Label>
                      <Input
                        id="supplierPhone"
                        value={formData.supplierPhone}
                        onChange={(e) => setFormData({...formData, supplierPhone: e.target.value})}
                        placeholder="Phone number"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="supplierEmail">Supplier Email (Optional)</Label>
                    <Input
                      id="supplierEmail"
                      type="email"
                      value={formData.supplierEmail}
                      onChange={(e) => setFormData({...formData, supplierEmail: e.target.value})}
                      placeholder="Email address"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Any additional notes"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600">
                    {editingItem ? 'Update Item' : 'Add Item'}
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
            <CardTitle className="text-sm font-medium text-gray-600">Total Items</CardTitle>
            <Package className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalItems}</div>
            <p className="text-xs text-gray-500">Across all categories</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Value</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">₹{totalValue.toLocaleString()}</div>
            <p className="text-xs text-gray-500">Current inventory value</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Low Stock</CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{lowStockItems.length}</div>
            <p className="text-xs text-gray-500">Items need reordering</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Categories</CardTitle>
            <TrendingDown className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{categories.length}</div>
            <p className="text-xs text-gray-500">Product categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-red-800 font-medium">
                {lowStockItems.length} item(s) are running low on stock
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items Display - Responsive */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
          <CardDescription>Manage your fabric and material inventory</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredItems.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Total Value</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.name || 'N/A'}</div>
                            <div className="text-sm text-gray-500">{item.location || 'N/A'}</div>
                          </div>
                        </TableCell>
                        <TableCell>{item.category || 'N/A'}</TableCell>
                        <TableCell>{item.type || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStockAdjustment(item.id, -1)}
                              disabled={item.quantity <= 0}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="font-medium">{item.quantity || 0} {item.unit || 'units'}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStockAdjustment(item.id, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          {(item.quantity || 0) <= (item.reorderLevel || 0) && (
                            <Badge variant="destructive" className="text-xs mt-1">Low Stock</Badge>
                          )}
                        </TableCell>
                        <TableCell>₹{(item.costPerUnit || 0).toFixed(2)}</TableCell>
                        <TableCell>₹{(item.totalValue || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div>
                              <div className="font-medium">{item.supplier?.name || 'N/A'}</div>
                              <div className="text-sm text-gray-500">{item.supplier?.phone || 'N/A'}</div>
                            </div>
                            {item.supplier?.phone && (
                              <ContactActions 
                                phone={item.supplier.phone}
                                message={`Hi, I need to reorder ${item.name}. Current stock: ${item.quantity} ${item.unit}`}
                              />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(item.quantity || 0) <= (item.reorderLevel || 0) ? (
                            <Badge variant="destructive">Reorder</Badge>
                          ) : (item.quantity || 0) <= ((item.reorderLevel || 0) * 2) ? (
                            <Badge variant="outline" className="text-orange-600 border-orange-200">Low</Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600 border-green-200">Good</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(item.id)}
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
              </div>

              {/* Mobile/Tablet Card View */}
              <div className="lg:hidden space-y-4">
                {filteredItems.map((item) => (
                  <Card key={item.id} className="border">
                    <CardContent className="p-4">
                      <div 
                        className="flex justify-between items-start cursor-pointer"
                        onClick={() => toggleItemExpansion(item.id)}
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{item.name}</h3>
                          <p className="text-sm text-gray-600">{item.category} • {item.type}</p>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="font-medium">{item.quantity} {item.unit}</span>
                            <Badge 
                              variant={
                                (item.quantity || 0) <= (item.reorderLevel || 0) ? "destructive" :
                                (item.quantity || 0) <= ((item.reorderLevel || 0) * 2) ? "outline" : "outline"
                              }
                              className={
                                (item.quantity || 0) <= (item.reorderLevel || 0) ? "" :
                                (item.quantity || 0) <= ((item.reorderLevel || 0) * 2) ? "text-orange-600 border-orange-200" : "text-green-600 border-green-200"
                              }
                            >
                              {(item.quantity || 0) <= (item.reorderLevel || 0) ? "Reorder" :
                               (item.quantity || 0) <= ((item.reorderLevel || 0) * 2) ? "Low" : "Good"}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">₹{(item.totalValue || 0).toLocaleString()}</p>
                          <p className="text-sm text-gray-600">₹{(item.costPerUnit || 0).toFixed(2)}/unit</p>
                        </div>
                      </div>
                      
                      {expandedItems.has(item.id) && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          <div>
                            <p className="text-sm font-medium">Location: {item.location}</p>
                            {item.notes && <p className="text-sm text-gray-600">Notes: {item.notes}</p>}
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium">Supplier: {item.supplier?.name}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <p className="text-sm text-gray-600">{item.supplier?.phone}</p>
                              {item.supplier?.phone && (
                                <ContactActions 
                                  phone={item.supplier.phone}
                                  message={`Hi, I need to reorder ${item.name}. Current stock: ${item.quantity} ${item.unit}`}
                                />
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStockAdjustment(item.id, -1)}
                                disabled={item.quantity <= 0}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="font-medium">{item.quantity} {item.unit}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStockAdjustment(item.id, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(item)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(item.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No inventory items</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm ? 'No items match your search.' : 'Add your first product to get started.'}
              </p>
              {!searchTerm && (
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-purple-600"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Item
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Type Manager Modal */}
      <Dialog open={isTypeManagerOpen} onOpenChange={setIsTypeManagerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Types</DialogTitle>
            <DialogDescription>Add, edit, or delete product types</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="New type name"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
              />
              <Button onClick={handleAddType}>Add</Button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {types.map((type) => (
                <div key={type.id} className="flex justify-between items-center p-2 border rounded">
                  <span>{type.name}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteType(type.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Manager Modal */}
      <Dialog open={isCategoryManagerOpen} onOpenChange={setIsCategoryManagerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
            <DialogDescription>Add, edit, or delete product categories</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="New category name"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <Button onClick={handleAddCategory}>Add</Button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {categories.map((category) => (
                <div key={category.id} className="flex justify-between items-center p-2 border rounded">
                  <span>{category.name}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteCategory(category.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
