
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Trash2, Plus, Package, ChevronDown, ChevronRight, Upload, X, User, Calendar, DollarSign } from 'lucide-react';

interface OrderItem {
  madeFor: string;
  category: string;
  description: string;
  price: number;
  quantity: number;
  status: string;
  orderDate: string;
  deliveryDate: string;
  assignedStaff: string[];
  requiredMaterials: { id: string; name: string; quantity: number; unit: string; }[];
  designImages: string[];
  notes: string;
}

interface Staff {
  id: string;
  name: string;
  phone: string;
  photo?: string;
}

interface Material {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
}

interface MultipleOrderItemsSectionProps {
  orderItems: OrderItem[];
  setOrderItems: (items: OrderItem[]) => void;
  customerName: string;
  staff: Staff[];
  materials: Material[];
}

const MultipleOrderItemsSection: React.FC<MultipleOrderItemsSectionProps> = ({
  orderItems,
  setOrderItems,
  customerName,
  staff,
  materials
}) => {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set([0]));

  const categories = [
    'Lehenga', 'Saree Blouse', 'Salwar Kameez', 'Kurti', 'Gown', 'Dress',
    'Shirt', 'Pants', 'Skirt', 'Jacket', 'Suit', 'Other'
  ];

  const statusOptions = [
    'received', 'in-progress', 'ready', 'delivered', 'cancelled'
  ];

  const addNewItem = () => {
    const newItem: OrderItem = {
      madeFor: customerName || '',
      category: '',
      description: '',
      price: 0,
      quantity: 1,
      status: 'received',
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: '',
      assignedStaff: [],
      requiredMaterials: [],
      designImages: [],
      notes: ''
    };
    setOrderItems([...orderItems, newItem]);
    setOpenItems(prev => new Set([...prev, orderItems.length]));
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const updatedItems = orderItems.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    );
    setOrderItems(updatedItems);
  };

  const removeItem = (index: number) => {
    if (orderItems.length <= 1) return; // Keep at least one item
    const updatedItems = orderItems.filter((_, i) => i !== index);
    setOrderItems(updatedItems);
    setOpenItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      // Adjust indices for remaining items
      const adjustedSet = new Set();
      newSet.forEach(itemIndex => {
        if (itemIndex < index) {
          adjustedSet.add(itemIndex);
        } else if (itemIndex > index) {
          adjustedSet.add(itemIndex - 1);
        }
      });
      return adjustedSet;
    });
  };

  const toggleItem = (index: number) => {
    setOpenItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const updateStaffAssignment = (itemIndex: number, staffId: string, assigned: boolean) => {
    const currentStaff = orderItems[itemIndex].assignedStaff;
    let newStaff;
    if (assigned) {
      newStaff = [...currentStaff, staffId];
    } else {
      newStaff = currentStaff.filter(id => id !== staffId);
    }
    updateItem(itemIndex, 'assignedStaff', newStaff);
  };

  const updateMaterialRequirement = (itemIndex: number, materialId: string, quantity: number) => {
    const currentMaterials = orderItems[itemIndex].requiredMaterials;
    const material = materials.find(m => m.id === materialId);
    if (!material) return;

    let newMaterials;
    if (quantity > 0) {
      const existingIndex = currentMaterials.findIndex(m => m.id === materialId);
      if (existingIndex >= 0) {
        newMaterials = currentMaterials.map((m, i) => 
          i === existingIndex ? { ...m, quantity } : m
        );
      } else {
        newMaterials = [...currentMaterials, {
          id: materialId,
          name: material.name,
          quantity,
          unit: material.unit
        }];
      }
    } else {
      newMaterials = currentMaterials.filter(m => m.id !== materialId);
    }
    updateItem(itemIndex, 'requiredMaterials', newMaterials);
  };

  const removeDesignImage = (itemIndex: number, imageIndex: number) => {
    const currentImages = orderItems[itemIndex].designImages;
    const newImages = currentImages.filter((_, i) => i !== imageIndex);
    updateItem(itemIndex, 'designImages', newImages);
  };

  const getTotalAmount = () => {
    return orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const getTotalQuantity = () => {
    return orderItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Order Items ({orderItems.length})
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">
              Total Qty: {getTotalQuantity()}
            </div>
            <div className="text-lg font-semibold">
              Total: ₹{getTotalAmount().toLocaleString()}
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {orderItems.map((item, index) => (
          <Collapsible 
            key={index}
            open={openItems.has(index)}
            onOpenChange={() => toggleItem(index)}
          >
            <Card className="border-2 border-l-4 border-l-blue-500 shadow-sm">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 pb-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      {openItems.has(index) ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">Item {index + 1}</span>
                        {item.category && (
                          <Badge variant="secondary">{item.category}</Badge>
                        )}
                        {item.madeFor && item.madeFor !== customerName && (
                          <Badge variant="outline" className="text-purple-600">
                            <User className="h-3 w-3 mr-1" />
                            {item.madeFor}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {item.price > 0 && (
                        <div className="text-right">
                          <div className="font-medium">₹{(item.price * item.quantity).toLocaleString()}</div>
                          <div className="text-sm text-gray-500">Qty: {item.quantity}</div>
                        </div>
                      )}
                      {orderItems.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItem(index);
                          }}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Made For *</Label>
                      <Input
                        value={item.madeFor}
                        onChange={(e) => updateItem(index, 'madeFor', e.target.value)}
                        placeholder="Person this item is made for"
                      />
                    </div>
                    <div>
                      <Label>Item Category *</Label>
                      <Select
                        value={item.category}
                        onValueChange={(value) => updateItem(index, 'category', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder="Brief description of the item"
                    />
                  </div>
                  
                  {/* Price & Quantity */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Price (₹) *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.price}
                          onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={item.status}
                        onValueChange={(value) => updateItem(index, 'status', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map(status => (
                            <SelectItem key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Order Date</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          type="date"
                          value={item.orderDate}
                          onChange={(e) => updateItem(index, 'orderDate', e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Delivery Date *</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          type="date"
                          value={item.deliveryDate}
                          onChange={(e) => updateItem(index, 'deliveryDate', e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Staff Assignment */}
                  {staff.length > 0 && (
                    <div>
                      <Label>Assign Staff</Label>
                      <div className="mt-2 space-y-2 max-h-32 overflow-y-auto border rounded-md p-3">
                        {staff.map(staffMember => (
                          <div key={staffMember.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`staff-${index}-${staffMember.id}`}
                              checked={item.assignedStaff.includes(staffMember.id)}
                              onChange={(e) => updateStaffAssignment(index, staffMember.id, e.target.checked)}
                              className="rounded"
                            />
                            <label htmlFor={`staff-${index}-${staffMember.id}`} className="flex-1 text-sm">
                              {staffMember.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Required Materials */}
                  {materials.length > 0 && (
                    <div>
                      <Label>Required Materials</Label>
                      <div className="mt-2 space-y-2 max-h-32 overflow-y-auto border rounded-md p-3">
                        {materials.map(material => {
                          const requiredMaterial = item.requiredMaterials.find(m => m.id === material.id);
                          return (
                            <div key={material.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`material-${index}-${material.id}`}
                                checked={!!requiredMaterial}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    updateMaterialRequirement(index, material.id, 1);
                                  } else {
                                    updateMaterialRequirement(index, material.id, 0);
                                  }
                                }}
                                className="rounded"
                              />
                              <label htmlFor={`material-${index}-${material.id}`} className="flex-1 text-sm">
                                {material.name} ({material.unit})
                              </label>
                              {requiredMaterial && (
                                <Input
                                  type="number"
                                  min="1"
                                  value={requiredMaterial.quantity}
                                  onChange={(e) => updateMaterialRequirement(index, material.id, parseInt(e.target.value) || 1)}
                                  className="w-20 text-xs"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Design Images */}
                  <div>
                    <Label>Design Images</Label>
                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          // TODO: Implement image upload to Cloudinary
                          console.log('Image upload for item', index);
                        }}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Images
                      </Button>
                      {item.designImages.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.designImages.map((image, imgIndex) => (
                            <div key={imgIndex} className="relative">
                              <img
                                src={image}
                                alt={`Design ${imgIndex + 1}`}
                                className="w-16 h-16 object-cover rounded border"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="absolute -top-2 -right-2 h-6 w-6 p-0 bg-red-500 text-white hover:bg-red-600"
                                onClick={() => removeDesignImage(index, imgIndex)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={item.notes}
                      onChange={(e) => updateItem(index, 'notes', e.target.value)}
                      placeholder="Special instructions or notes for this item..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
        
        <Button
          type="button"
          variant="outline"
          onClick={addNewItem}
          className="w-full border-dashed border-2 hover:border-solid hover:bg-blue-50"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Another Item
        </Button>
      </CardContent>
    </Card>
  );
};

export default MultipleOrderItemsSection;
