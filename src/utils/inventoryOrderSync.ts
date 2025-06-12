
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface OrderItem {
  type: string;
  quantity: number;
}

interface RequiredMaterial {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

export const updateInventoryStock = async (orderItems: OrderItem[]): Promise<{ success: boolean; missingItems: string[] }> => {
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
    console.error('Error updating inventory:', error);
    return { success: false, missingItems: ['Error updating inventory'] };
  }
};

export const deductInventoryForOrder = async (orderItems: OrderItem[]): Promise<{ success: boolean; missingItems: string[] }> => {
  const missingItems: string[] = [];
  
  try {
    for (const orderItem of orderItems) {
      // Find inventory item by ID (for required materials) or by name/type
      let inventoryQuery;
      if (orderItem.type.length === 20) { // Assuming Firebase doc IDs are 20 characters
        // Direct ID lookup for required materials
        const inventoryDoc = await getDocs(query(
          collection(db, 'inventory'),
          where('__name__', '==', orderItem.type)
        ));
        
        if (!inventoryDoc.empty) {
          const doc = inventoryDoc.docs[0];
          const inventoryData = doc.data();
          const availableQuantity = inventoryData.quantity;
          
          if (availableQuantity >= orderItem.quantity) {
            await updateDoc(doc.ref, {
              quantity: availableQuantity - orderItem.quantity,
              updatedAt: serverTimestamp()
            });
          } else {
            missingItems.push(`${inventoryData.name} (${orderItem.quantity - availableQuantity} units short)`);
          }
        } else {
          missingItems.push(orderItem.type);
        }
        continue;
      }
      
      // Fallback to name/type search
      inventoryQuery = query(
        collection(db, 'inventory'),
        where('name', '==', orderItem.type)
      );
      
      let inventorySnapshot = await getDocs(inventoryQuery);
      
      // If not found by name, try by type
      if (inventorySnapshot.empty) {
        inventoryQuery = query(
          collection(db, 'inventory'),
          where('type', '==', orderItem.type)
        );
        inventorySnapshot = await getDocs(inventoryQuery);
      }
      
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

// New function specifically for required materials
export const deductRequiredMaterials = async (materials: RequiredMaterial[]): Promise<{ success: boolean; missingItems: string[] }> => {
  const missingItems: string[] = [];
  
  try {
    for (const material of materials) {
      const inventoryDoc = await getDocs(query(
        collection(db, 'inventory'),
        where('__name__', '==', material.id)
      ));
      
      if (!inventoryDoc.empty) {
        const doc = inventoryDoc.docs[0];
        const inventoryData = doc.data();
        const availableQuantity = inventoryData.quantity;
        
        if (availableQuantity >= material.quantity) {
          await updateDoc(doc.ref, {
            quantity: availableQuantity - material.quantity,
            updatedAt: serverTimestamp()
          });
        } else {
          missingItems.push(`${material.name} (${material.quantity - availableQuantity} units short)`);
        }
      } else {
        missingItems.push(material.name);
      }
    }
    
    return { success: missingItems.length === 0, missingItems };
  } catch (error) {
    console.error('Error deducting required materials:', error);
    return { success: false, missingItems: ['Error deducting materials'] };
  }
};
