
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface OrderItem {
  type: string;
  quantity: number;
}

export const deductInventoryForOrder = async (orderItems: OrderItem[]): Promise<{ success: boolean; missingItems: string[] }> => {
  const missingItems: string[] = [];
  
  try {
    for (const orderItem of orderItems) {
      // Find matching inventory items by type
      const inventoryQuery = query(
        collection(db, 'inventory'),
        where('type', '==', orderItem.type),
        where('quantity', '>', 0)
      );
      
      const inventorySnapshot = await getDocs(inventoryQuery);
      
      if (inventorySnapshot.empty) {
        missingItems.push(orderItem.type);
        continue;
      }
      
      let remainingQuantity = orderItem.quantity;
      
      for (const inventoryDoc of inventorySnapshot.docs) {
        if (remainingQuantity <= 0) break;
        
        const inventoryData = inventoryDoc.data();
        const availableQuantity = inventoryData.quantity;
        
        const deductQuantity = Math.min(remainingQuantity, availableQuantity);
        const newQuantity = availableQuantity - deductQuantity;
        
        await updateDoc(doc(db, 'inventory', inventoryDoc.id), {
          quantity: newQuantity,
          updatedAt: serverTimestamp()
        });
        
        remainingQuantity -= deductQuantity;
      }
      
      if (remainingQuantity > 0) {
        missingItems.push(`${orderItem.type} (${remainingQuantity} units short)`);
      }
    }
    
    return { success: missingItems.length === 0, missingItems };
  } catch (error) {
    console.error('Error deducting inventory:', error);
    return { success: false, missingItems: ['Error updating inventory'] };
  }
};

export const checkInventoryAvailability = async (orderItems: OrderItem[]): Promise<{ available: boolean; shortages: string[] }> => {
  const shortages: string[] = [];
  
  try {
    for (const orderItem of orderItems) {
      const inventoryQuery = query(
        collection(db, 'inventory'),
        where('type', '==', orderItem.type)
      );
      
      const inventorySnapshot = await getDocs(inventoryQuery);
      
      if (inventorySnapshot.empty) {
        shortages.push(`${orderItem.type} - not in inventory`);
        continue;
      }
      
      const totalAvailable = inventorySnapshot.docs.reduce(
        (sum, doc) => sum + doc.data().quantity,
        0
      );
      
      if (totalAvailable < orderItem.quantity) {
        shortages.push(`${orderItem.type} - need ${orderItem.quantity}, have ${totalAvailable}`);
      }
    }
    
    return { available: shortages.length === 0, shortages };
  } catch (error) {
    console.error('Error checking inventory availability:', error);
    return { available: false, shortages: ['Error checking inventory'] };
  }
};
