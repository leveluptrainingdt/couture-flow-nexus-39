
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Edit, MessageSquare, Phone, Trash2 } from 'lucide-react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  itemType: string;
  orderDate: string;
  deliveryDate: string;
  status: string;
  quantity: number;
  items?: any[];
}

interface OrdersListViewProps {
  filteredOrders: Order[];
  handleViewOrder: (order: Order) => void;
  handleEditOrder: (order: Order) => void;
  handleSendWhatsApp: (order: Order) => void;
  onRefresh: () => void;
}

const OrdersListView: React.FC<OrdersListViewProps> = ({
  filteredOrders,
  handleViewOrder,
  handleEditOrder,
  handleSendWhatsApp,
  onRefresh
}) => {
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; order: Order | null }>({
    isOpen: false,
    order: null
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'in-progress': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'ready': return 'bg-green-100 text-green-700 border-green-200';
      case 'delivered': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const handleDeleteClick = (order: Order) => {
    setDeleteDialog({ isOpen: true, order });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.order) return;

    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'orders', deleteDialog.order.id));
      toast({
        title: "Success",
        description: `Order #${deleteDialog.order.orderNumber.slice(-4)} deleted successfully`,
      });
      onRefresh();
      setDeleteDialog({ isOpen: false, order: null });
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: "Error",
        description: "Failed to delete order",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    if (!isDeleting) {
      setDeleteDialog({ isOpen: false, order: null });
    }
  };

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Order #</TableHead>
                  <TableHead className="min-w-[150px]">Customer</TableHead>
                  <TableHead className="min-w-[120px]">Item Type</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[100px]">Order Date</TableHead>
                  <TableHead className="min-w-[100px]">Delivery Date</TableHead>
                  <TableHead className="min-w-[80px]">Quantity</TableHead>
                  <TableHead className="min-w-[200px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map(order => (
                  <TableRow key={order.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      #{order.orderNumber.slice(-4)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.customerName}</div>
                        <div className="text-sm text-gray-500">{order.customerPhone}</div>
                      </div>
                    </TableCell>
                    <TableCell>{order.itemType}</TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(order.status)} font-medium`} variant="outline">
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{order.orderDate}</TableCell>
                    <TableCell className="text-sm">{order.deliveryDate}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewOrder(order)}
                          className="h-8 px-2 text-xs"
                          title="View Order"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditOrder(order)}
                          className="h-8 px-2 text-xs"
                          title="Edit Order"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendWhatsApp(order)}
                          className="h-8 px-2 text-xs text-green-600 hover:bg-green-50"
                          title="Send WhatsApp"
                        >
                          <MessageSquare className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`tel:${order.customerPhone}`)}
                          className="h-8 px-2 text-xs"
                          title="Call Customer"
                        >
                          <Phone className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteClick(order)}
                          className="h-8 px-2 text-xs text-red-600 hover:bg-red-50"
                          title="Delete Order"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <DeleteConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        orderNumber={deleteDialog.order?.orderNumber || ''}
        isDeleting={isDeleting}
      />
    </>
  );
};

export default OrdersListView;
