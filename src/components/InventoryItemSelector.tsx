
import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Plus } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';

interface InventoryItem {
  id: string;
  itemName: string;
  stockQty: number;
  category?: string;
}

interface InventoryItemSelectorProps {
  inventory: InventoryItem[];
  value: string;
  onValueChange: (value: string) => void;
  onInventoryUpdate: () => void;
  quantity?: number;
}

const InventoryItemSelector = ({ 
  inventory, 
  value, 
  onValueChange, 
  onInventoryUpdate,
  quantity = 1 
}: InventoryItemSelectorProps) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemStock, setNewItemStock] = useState(0);

  const selectedItem = inventory.find(item => item.itemName === value);
  const isLowStock = selectedItem && selectedItem.stockQty < quantity;

  const handleAddNewItem = async () => {
    try {
      const newItem = {
        itemName: newItemName,
        category: newItemCategory,
        stockQty: newItemStock,
        createdAt: new Date(),
      };
      
      await addDoc(collection(db, 'inventory'), newItem);
      
      // Reset form
      setNewItemName('');
      setNewItemCategory('');
      setNewItemStock(0);
      setShowAddModal(false);
      
      // Update inventory list
      onInventoryUpdate();
      
      // Select the new item
      onValueChange(newItemName);
      
      toast({
        title: "Item Added",
        description: `${newItemName} has been added to inventory.`,
      });
    } catch (error) {
      console.error('Error adding new item:', error);
      toast({
        title: "Error",
        description: "Failed to add new item to inventory.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={(selectedValue) => {
        if (selectedValue === '__add_new__') {
          setShowAddModal(true);
        } else {
          onValueChange(selectedValue);
        }
      }}>
        <SelectTrigger>
          <SelectValue placeholder="Select item from inventory" />
        </SelectTrigger>
        <SelectContent>
          {inventory.map(item => (
            <SelectItem key={item.id} value={item.itemName}>
              <div className="flex items-center justify-between w-full">
                <span>{item.itemName}</span>
                <Badge variant={item.stockQty < 10 ? "destructive" : "secondary"} className="ml-2">
                  Stock: {item.stockQty}
                </Badge>
              </div>
            </SelectItem>
          ))}
          <SelectItem value="__add_new__" className="text-blue-600">
            <div className="flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Add New Item
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
      
      {isLowStock && (
        <Badge variant="destructive" className="w-full justify-center">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Warning: Only {selectedItem.stockQty} left in stock
        </Badge>
      )}

      {/* Add New Item Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Inventory Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Item Name *</Label>
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Enter item name"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                placeholder="Enter category (optional)"
              />
            </div>
            <div className="space-y-2">
              <Label>Initial Stock *</Label>
              <Input
                type="number"
                value={newItemStock}
                onChange={(e) => setNewItemStock(Number(e.target.value))}
                min="0"
                placeholder="Enter initial stock quantity"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddNewItem}
                disabled={!newItemName.trim() || newItemStock < 0}
              >
                Add Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryItemSelector;
