
export interface OrderItem {
  madeFor: string;
  category: string;
  description: string;
  quantity: number;
  status: string;
  orderDate: string;
  deliveryDate: string;
  assignedStaff: string[];
  requiredMaterials: any[];
  designImages: string[];
  notes: string;
  sizes?: Record<string, string>;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  items?: OrderItem[];
  itemType: string;
  orderDate: string;
  deliveryDate: string;
  quantity: number;
  status: 'received' | 'in-progress' | 'ready' | 'delivered' | 'cancelled';
  measurements?: Record<string, string>;
  notes?: string;
  designImages?: string[];
  assignedStaff?: string[];
  requiredMaterials?: any[];
}

// Extended interface for calendar component that needs billing properties
export interface CalendarOrder extends Order {
  totalAmount: number;
  advanceAmount: number;
  remainingAmount: number;
}
