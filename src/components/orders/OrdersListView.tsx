import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Eye, Edit, MessageSquare, Receipt, Phone, User } from 'lucide-react';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  itemType: string;
  orderDate: string;
  deliveryDate: string;
  totalAmount: number;
  remainingAmount: number;
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

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[100px]">Order ID</TableHead>
              <TableHead className="min-w-[150px]">Customer</TableHead>
              <TableHead className="min-w-[120px]">Made For</TableHead>
              <TableHead className="min-w-[120px]">Item Type</TableHead>
              <TableHead className="min-w-[100px]">Order Date</TableHead>
              <TableHead className="min-w-[100px]">Delivery Date</TableHead>
              <TableHead className="min-w-[80px]">Status</TableHead>
              <TableHead className="min-w-[100px]">Total</TableHead>
              <TableHead className="min-w-[100px]">Balance</TableHead>
              <TableHead className="min-w-[250px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map(order => {
              const madeForItems = getMadeForItems(order);
              return (
                <TableRow key={order.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    #{order.orderNumber.slice(-4)}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[150px]">
                      <div className="font-medium truncate" title={order.customerName}>
                        {order.customerName}
                      </div>
                      <div className="text-sm text-gray-500 truncate" title={order.customerPhone}>
                        {order.customerPhone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[120px]">
                      {madeForItems.slice(0, 2).map((person, index) => (
                        <Badge 
                          key={index} 
                          variant="outline" 
                          className={`${person !== order.customerName ? "text-purple-600" : ""} text-xs truncate max-w-full`}
                          title={person}
                        >
                          <User className="h-3 w-3 mr-1" />
                          {person.length > 8 ? `${person.slice(0, 8)}...` : person}
                        </Badge>
                      ))}
                      {madeForItems.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{madeForItems.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[120px]">
                      <div className="truncate" title={order.itemType}>
                        {order.itemType}
                      </div>
                      {order.quantity > 1 && (
                        <Badge variant="outline" className="text-xs mt-1">
                          Qty: {order.quantity}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{order.orderDate}</TableCell>
                  <TableCell className="text-sm">{order.deliveryDate}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(order.status)} variant="outline">
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    ₹{order.totalAmount?.toLocaleString() || 0}
                  </TableCell>
                  <TableCell>
                    {order.remainingAmount > 0 ? (
                      <span className="text-red-600 font-medium">
                        ₹{order.remainingAmount.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-green-600">Paid</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewOrder(order)}
                            className="h-8 w-8 p-0"
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
                            className="h-8 w-8 p-0"
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
                            onClick={() => handleSendWhatsApp(order)}
                            className="text-green-600 hover:bg-green-50 h-8 w-8 p-0"
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
                              className="text-purple-600 hover:bg-purple-50 h-8 w-8 p-0"
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
                            className="md:hidden h-8 w-8 p-0"
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
    </TooltipProvider>
  );
};

export default OrdersListView;
