
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Eye, Edit, MessageSquare, Receipt, Phone, User, Trash2 } from 'lucide-react';
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
  handleBillOrder?: (order: Order) => void;
  onRefresh: () => void;
}

const OrdersListView: React.FC<OrdersListViewProps> = ({
  filteredOrders,
  handleViewOrder,
  handleEditOrder,
  handleSendWhatsApp,
  handleBillOrder,
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

  const getMadeForItems = (order: Order) => {
    if (!order.items || order.items.length === 0) return [order.customerName];
    return [...new Set(order.items.map(item => item.madeFor || order.customerName))];
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
    <TooltipProvider>
      {/* Horizontal scroll wrapper - ONLY the table scrolls */}
      <div className="w-full">
        <div style={{ overflowX: 'auto', width: '100%' }} className="border rounded-lg bg-white shadow-sm">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="min-w-[100px] whitespace-nowrap font-semibold">Order ID</TableHead>
                <TableHead className="min-w-[150px] whitespace-nowrap font-semibold">Customer</TableHead>
                <TableHead className="min-w-[120px] whitespace-nowrap font-semibold">Made For</TableHead>
                <TableHead className="min-w-[120px] whitespace-nowrap font-semibold">Item Type</TableHead>
                <TableHead className="min-w-[100px] whitespace-nowrap font-semibold">Order Date</TableHead>
                <TableHead className="min-w-[100px] whitespace-nowrap font-semibold">Delivery Date</TableHead>
                <TableHead className="min-w-[80px] whitespace-nowrap font-semibold">Status</TableHead>
                <TableHead className="min-w-[280px] whitespace-nowrap font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map(order => {
                const madeForItems = getMadeForItems(order);
                return (
                  <TableRow key={order.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell className="font-medium whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm font-bold">#{order.orderNumber.slice(-4)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[150px]">
                      <div className="max-w-[150px]">
                        <div className="font-medium truncate text-sm" title={order.customerName}>
                          {order.customerName}
                        </div>
                        <div className="text-xs text-gray-500 truncate" title={order.customerPhone}>
                          {order.customerPhone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <div className="flex flex-wrap gap-1 max-w-[120px]">
                        {madeForItems.slice(0, 2).map((person, index) => (
                          <Badge 
                            key={index} 
                            variant="outline" 
                            className={`${person !== order.customerName ? "text-purple-600 bg-purple-50" : "text-gray-600 bg-gray-50"} text-xs truncate max-w-full`}
                            title={person}
                          >
                            <User className="h-3 w-3 mr-1" />
                            {person.length > 8 ? `${person.slice(0, 8)}...` : person}
                          </Badge>
                        ))}
                        {madeForItems.length > 2 && (
                          <Badge variant="outline" className="text-xs bg-gray-50">
                            +{madeForItems.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <div className="max-w-[120px]">
                        <div className="truncate text-sm" title={order.itemType}>
                          {order.itemType}
                        </div>
                        {order.quantity > 1 && (
                          <Badge variant="outline" className="text-xs mt-1 bg-blue-50 text-blue-600">
                            Qty: {order.quantity}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{order.orderDate}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{order.deliveryDate}</TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(order.status)} font-medium`} variant="outline">
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 min-w-[280px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewOrder(order)}
                              className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-200"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View Order</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditOrder(order)}
                              className="h-8 w-8 p-0 hover:bg-green-50 hover:border-green-200"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit Order</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteClick(order)}
                              className="text-red-600 hover:bg-red-50 hover:border-red-200 h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete Order</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendWhatsApp(order)}
                              className="text-green-600 hover:bg-green-50 hover:border-green-200 h-8 w-8 p-0"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Send WhatsApp</TooltipContent>
                        </Tooltip>
                        
                        {handleBillOrder && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleBillOrder(order)}
                                className="text-purple-600 hover:bg-purple-50 hover:border-purple-200 h-8 w-8 p-0"
                              >
                                <Receipt className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Generate Bill</TooltipContent>
                          </Tooltip>
                        )}

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="md:hidden h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-200"
                              onClick={() => window.open(`tel:${order.customerPhone}`)}
                            >
                              <Phone className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Call Customer</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <DeleteConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        orderNumber={deleteDialog.order?.orderNumber || ''}
        isDeleting={isDeleting}
      />
    </TooltipProvider>
  );
};

export default OrdersListView;
