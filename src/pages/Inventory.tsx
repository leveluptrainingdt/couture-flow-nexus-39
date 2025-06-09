
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, TrendingDown, TrendingUp, Phone, MessageCircle, Image as ImageIcon, Eye } from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { PRODUCT_TYPES, CATEGORIES, ProductType, Category } from '@/utils/productTypes';

interface InventoryItem {
  id: string;
  name: string;
  description: string;
  category: Category;
  type: ProductType;
  quantity: number;
  minStock: number;
  unitPrice: number;
  supplier: {
    name: string;
    phone: string;
    email?: string;
  };
  imageUrl?: string;
  createdAt: any;
  updatedAt: any;
}

const Inventory = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '' as Category,
    type: '' as ProductType,
    quantity: 0,
    minStock: 10,
    unitPrice: 0,
    supplier: {
      name: '',
      phone: '',
      email: ''
    },
    imageUrl: ''
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const inventorySnapshot = await getDocs(collection(db, 'inventory'));
      const inventoryData = inventorySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryItem[];
      
      inventoryData.sort((a, b) => a.name.localeCompare(b.name));
      setItems(inventoryData);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast({
        title: "Error",
        description: "Failed to fetch inventory",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const itemData = {
        ...formData,
        updatedAt: serverTimestamp(),
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
      fetchInventory();
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
      description: '',
      category: '' as Category,
      type: '' as ProductType,
      quantity: 0,
      minStock: 10,
      unitPrice: 0,
      supplier: {
        name: '',
        phone: '',
        email: ''
      },
      imageUrl: ''
    });
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      category: item.category,
      type: item.type,
      quantity: item.quantity,
      minStock: item.minStock,
      unitPrice: item.unitPrice,
      supplier: item.supplier,
      imageUrl: item.imageUrl || ''
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
        fetchInventory();
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

  const updateStock = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    try {
      await updateDoc(doc(db, 'inventory', itemId), {
        quantity: newQuantity,
        updatedAt: serverTimestamp()
      });
      toast({
        title: "Success",
        description: "Stock updated successfully",
      });
      fetchInventory();
    } catch (error) {
      console.error('Error updating stock:', error);
      toast({
        title: "Error",
        description: "Failed to update stock",
        variant: "destructive",
      });
    }
  };

  const handleSupplierContact = (supplier: InventoryItem['supplier'], productName: string, method: 'call' | 'whatsapp') => {
    const message = `Hi ${supplier.name}, please restock ${productName} urgently.`;
    
    if (method === 'call') {
      window.open(`tel:${supplier.phone}`);
    } else {
      const encodedMessage = encodeURIComponent(message);
      window.open(`https://wa.me/${supplier.phone.replace(/\D/g, '')}?text=${encodedMessage}`);
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockItems = items.filter(item => item.quantity <= item.minStock && item.quantity > 0);
  const outOfStockItems = items.filter(item => item.quantity === 0);
  const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity === 0) return { status: 'Out of Stock', color: 'bg-red-100 text-red-700 border-red-200' };
    if (item.quantity <= item.minStock) return { status: 'Low Stock', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
    return { status: 'In Stock', color: 'bg-green-100 text-green-700 border-green-200' };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Inventory Management</h1>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
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
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600">Manage stock with order integration and supplier controls</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              onClick={() => {
                setEditingItem(null);
                resetForm();
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Product' : 'Add New Product'}
              </DialogTitle>
              <DialogDescription>
                Fill in the product details below.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Cotton Fabric, Silk Thread"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value as Category})}
                    required
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="type">Product Type</Label>
                <select
                  id="type"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value as ProductType})}
                  required
                >
                  <option value="">Select type</option>
                  {PRODUCT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="quantity">Current Stock</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="minStock">Min Stock Alert</Label>
                  <Input
                    id="minStock"
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) => setFormData({...formData, minStock: parseInt(e.target.value) || 0})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="unitPrice">Unit Price (₹)</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({...formData, unitPrice: parseFloat(e.target.value) || 0})}
                    required
                  />
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium text-gray-900">Supplier Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="supplierName">Supplier Name</Label>
                    <Input
                      id="supplierName"
                      value={formData.supplier.name}
                      onChange={(e) => setFormData({...formData, supplier: {...formData.supplier, name: e.target.value}})}
                      placeholder="Supplier company name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplierPhone">Supplier Phone</Label>
                    <Input
                      id="supplierPhone"
                      value={formData.supplier.phone}
                      onChange={(e) => setFormData({...formData, supplier: {...formData.supplier, phone: e.target.value}})}
                      placeholder="+91 98765 43210"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="supplierEmail">Supplier Email (Optional)</Label>
                  <Input
                    id="supplierEmail"
                    type="email"
                    value={formData.supplier.email}
                    onChange={(e) => setFormData({...formData, supplier: {...formData.supplier, email: e.target.value}})}
                    placeholder="supplier@example.com"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="imageUrl">Product Image URL</Label>
                <Input
                  id="imageUrl"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                  placeholder="https://cloudinary.com/image-url"
                />
                <p className="text-xs text-gray-500 mt-1">Upload to Cloudinary and paste the URL here</p>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Additional details about the product"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-purple-600 to-blue-600">
                  {editingItem ? 'Update Product' : 'Add Product'}
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
            <CardTitle className="text-sm font-medium text-gray-600">Total Products</CardTitle>
            <Package className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{items.length}</div>
            <p className="text-xs text-gray-500">Unique products in inventory</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Low Stock</CardTitle>
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{lowStockItems.length}</div>
            <p className="text-xs text-gray-500">Items needing restock</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Out of Stock</CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{outOfStockItems.length}</div>
            <p className="text-xs text-gray-500">Items completely out</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Value</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">₹{totalValue.toLocaleString()}</div>
            <p className="text-xs text-gray-500">Total inventory value</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by product name, category, type, or supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {lowStockItems.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-yellow-800">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Low Stock Alert</span>
                </CardTitle>
                <CardDescription className="text-yellow-700">
                  {lowStockItems.length} item(s) are running low and need restocking.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lowStockItems.slice(0, 3).map(item => (
                    <div key={item.id} className="flex justify-between items-center p-2 bg-white rounded border">
                      <span className="font-medium">{item.name}</span>
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200">
                        {item.quantity}/{item.minStock} left
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {outOfStockItems.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-red-800">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Out of Stock Alert</span>
                </CardTitle>
                <CardDescription className="text-red-700">
                  {outOfStockItems.length} item(s) are completely out of stock.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {outOfStockItems.slice(0, 3).map(item => (
                    <div key={item.id} className="flex justify-between items-center p-2 bg-white rounded border">
                      <span className="font-medium">{item.name}</span>
                      <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
                        Out of Stock
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Inventory Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Min Stock</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const stockStatus = getStockStatus(item);
                const totalValue = item.quantity * item.unitPrice;
                
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        {item.imageUrl && (
                          <div 
                            className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200"
                            onClick={() => setSelectedImage(item.imageUrl!)}
                          >
                            <ImageIcon className="h-4 w-4 text-gray-500" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{item.name}</div>
                          {item.description && (
                            <div className="text-sm text-gray-500 line-clamp-1">{item.description}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span>{item.quantity} units</span>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateStock(item.id, item.quantity - 1)}
                            disabled={item.quantity === 0}
                            className="h-6 w-6 p-0"
                          >
                            <TrendingDown className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateStock(item.id, item.quantity + 1)}
                            className="h-6 w-6 p-0"
                          >
                            <TrendingUp className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{item.minStock}</TableCell>
                    <TableCell>₹{item.unitPrice}</TableCell>
                    <TableCell>
                      <Badge className={stockStatus.color} variant="outline">
                        {stockStatus.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-sm">{item.supplier.name}</div>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSupplierContact(item.supplier, item.name, 'call')}
                            className="h-6 w-12 p-0 text-xs"
                          >
                            <Phone className="h-3 w-3 mr-1" />
                            Call
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSupplierContact(item.supplier, item.name, 'whatsapp')}
                            className="h-6 w-12 p-0 text-xs"
                          >
                            <MessageCircle className="h-3 w-3 mr-1" />
                            Chat
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>₹{totalValue.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {filteredItems.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'Try adjusting your search criteria.'
                : 'Get started by adding your first product.'
              }
            </p>
            {!searchTerm && (
              <Button 
                className="bg-gradient-to-r from-purple-600 to-blue-600"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Product
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Product Image</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">
              <img 
                src={selectedImage} 
                alt="Product" 
                className="max-w-full max-h-96 object-contain rounded-lg"
                onError={() => setSelectedImage(null)}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Inventory;
