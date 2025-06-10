
import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const useRealTimeData = (collectionName: string, orderByField?: string) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let q = collection(db, collectionName);
    
    if (orderByField) {
      q = query(q, orderBy(orderByField, 'desc')) as any;
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const documents = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setData(documents);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(`Error fetching ${collectionName}:`, err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, orderByField]);

  return { data, loading, error };
};

export const useRealTimeStats = () => {
  const { data: orders } = useRealTimeData('orders', 'createdAt');
  const { data: customers } = useRealTimeData('customers', 'createdAt');
  const { data: inventory } = useRealTimeData('inventory');
  const { data: appointments } = useRealTimeData('appointments', 'createdAt');

  const stats = {
    totalOrders: orders.length,
    totalCustomers: customers.length,
    totalRevenue: orders
      .filter(order => order.status === 'delivered')
      .reduce((sum, order) => sum + (order.totalAmount || 0), 0),
    lowStockItems: inventory.filter(item => 
      item.quantity < (item.minStock || 10)
    ).length,
    todaysAppointments: appointments.filter(apt => {
      const today = new Date().toISOString().split('T')[0];
      const aptDate = apt.appointmentDate?.toDate?.()?.toISOString().split('T')[0];
      return aptDate === today;
    }).length,
    activeOrders: orders.filter(order => 
      ['received', 'in-progress'].includes(order.status)
    ).length,
    pendingOrders: orders.filter(order => order.status === 'received').length,
    completedOrders: orders.filter(order => 
      ['ready', 'delivered'].includes(order.status)
    ).length
  };

  return stats;
};
