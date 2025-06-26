
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Phone, MessageSquare, User, Package, CreditCard, Calendar, Ruler, FileText, Edit, Trash2, Receipt, Users, Package2, Eye } from 'lucide-react';
import { updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';

interface OrderItem {
  madeFor: string;
  category: string;
  description: string;
  totalAmount: number;
  advanceAmount: number;
  balance: number;
  quantity: number;
  status: string;
  orderDate: string;
  deliveryDate: string;
  assignedStaff: string[];
  requiredMaterials: { id: string; name: string; quantity: number; unit: string; }[];
  designImages: string[];
  notes: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  items?: OrderItem[];
  itemType: string;
  quantity: number;
  totalAmount: number;
  advanceAmount: number;
  remainingAmount: number;
  status: string;
  orderDate: string;
  deliveryDate: string;
  measurements?: any;
  notes?: string;
  designImages?: string[];
  assignedStaff?: string[];
  requiredMaterials?: any[];
}

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onWhatsAppClick: (order: Order) => void;
  onEditClick?: (order: Order) => void;
  onBillClick?: (order: Order) => void;
  onRefresh: () => void;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  isOpen,
  onClose,
  order,
  onWhatsAppClick,
  onEditClick,
  onBillClick,
  onRefresh
}) => {
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  if (!order) return null;

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

  const updateStatus = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast({
        title: "Success",
        description: "Order status updated successfully",
      });
      onRefresh();
      onClose();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'orders', order.id));
      toast({
        title: "Success",
        description: "Order deleted successfully",
      });
      onRefresh();
      onClose();
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: "Error",
        description: "Failed to delete order",
        variant: "destructive",
      });
    }
  };

  const orderItems = order.items || [];
  const hasMultipleItems = orderItems.length > 1;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <DialogTitle>Order Details - #{order.orderNumber.slice(-4)}</DialogTitle>
                <Badge className={getStatusColor(order.status)} variant="outline">
                  {order.status.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                {onEditClick && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEditClick(order)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
                {onBillClick && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onBillClick(order)}
                    className="text-green-600"
                  >
                    <Receipt className="h-4 w-4 mr-2" />
                    Bill
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onWhatsAppClick(order)}
                  className="text-green-600"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="font-medium">Name:</span> {order.customerName}
                </div>
                <div>
                  <span className="font-medium">Phone:</span> {order.customerPhone}
                </div>
                {order.customerEmail && (
                  <div>
                    <span className="font-medium">Email:</span> {order.customerEmail}
                  </div>
                )}
                <div className="flex space-x-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`tel:${order.customerPhone}`)}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onWhatsAppClick(order)}
                    className="text-green-600"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Order Information & Status Update */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Order Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="font-medium">Order ID:</span> {order.orderNumber}
                </div>
                <div>
                  <span className="font-medium">Item Type:</span> {order.itemType}
                </div>
                <div>
                  <span className="font-medium">Total Quantity:</span> {order.quantity}
                </div>
                <div>
                  <span className="font-medium">Order Date:</span> {order.orderDate}
                </div>
                <div>
                  <span className="font-medium">Delivery Date:</span> {order.deliveryDate}
                </div>
                <div className="pt-2">
                  <span className="font-medium">Update Status:</span>
                  <Select onValueChange={updateStatus} disabled={updatingStatus}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Change status..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="received">Received</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="ready">Ready</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Payment Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="font-medium">Total Amount:</span> ₹{order.totalAmount?.toLocaleString() || 0}
                </div>
                <div>
                  <span className="font-medium">Advance Paid:</span> ₹{order.advanceAmount?.toLocaleString() || 0}
                </div>
                <div className={order.remainingAmount > 0 ? 'text-red-600 font-bold' : 'text-green-600'}>
                  <span className="font-medium">Remaining Balance:</span> ₹{order.remainingAmount?.toLocaleString() || 0}
                </div>
                <div className="text-sm text-gray-600">
                  Payment Status: {order.remainingAmount > 0 ? 'Pending' : 'Complete'}
                </div>
              </CardContent>
            </Card>

            {/* Assigned Staff */}
            {order.assignedStaff && order.assignedStaff.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Assigned Staff
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {order.assignedStaff.map((staffId, index) => (
                      <div key={index} className="flex items-center space-x-2 bg-gray-50 rounded-full px-3 py-1">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {staffId.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{staffId}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Items List */}
          {hasMultipleItems && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package2 className="h-5 w-5 mr-2" />
                  Order Items ({orderItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orderItems.map((item, index) => (
                    <Card key={index} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">Item {index + 1}</span>
                            <Badge variant="secondary">{item.category}</Badge>
                            {item.madeFor !== order.customerName && (
                              <Badge variant="outline" className="text-purple-600">
                                <User className="h-3 w-3 mr-1" />
                                {item.madeFor}
                              </Badge>
                            )}
                          </div>
                          <Badge className={getStatusColor(item.status)} variant="outline">
                            {item.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Description:</span> {item.description || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Quantity:</span> {item.quantity}
                          </div>
                          <div>
                            <span className="font-medium">Total Amount:</span> ₹{(item.totalAmount * item.quantity).toLocaleString()}
                          </div>
                          <div>
                            <span className="font-medium">Advance:</span> ₹{(item.advanceAmount * item.quantity).toLocaleString()}
                          </div>
                          <div className="text-red-600">
                            <span className="font-medium">Balance:</span> ₹{(item.balance * item.quantity).toLocaleString()}
                          </div>
                          <div>
                            <span className="font-medium">Delivery:</span> {item.deliveryDate}
                          </div>
                        </div>
                        
                        {/* Item Materials */}
                        {item.requiredMaterials && item.requiredMaterials.length > 0 && (
                          <div className="mt-3">
                            <span className="font-medium text-sm">Required Materials:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.requiredMaterials.map((material, matIndex) => (
                                <Badge key={matIndex} variant="outline" className="text-xs">
                                  {material.name} ({material.quantity} {material.unit})
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Item Images */}
                        {item.designImages && item.designImages.length > 0 && (
                          <div className="mt-3">
                            <span className="font-medium text-sm">Design Images:</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {item.designImages.map((url, imgIndex) => (
                                <img
                                  key={imgIndex}
                                  src={url}
                                  alt={`Design ${imgIndex + 1}`}
                                  className="w-12 h-12 object-cover rounded cursor-pointer hover:scale-110 transition-transform"
                                  onClick={() => setSelectedImageUrl(url)}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Item Notes */}
                        {item.notes && (
                          <div className="mt-3">
                            <span className="font-medium text-sm">Notes:</span>
                            <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Required Materials (for single item orders) */}
          {!hasMultipleItems && order.requiredMaterials && order.requiredMaterials.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package2 className="h-5 w-5 mr-2" />
                  Required Materials
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {order.requiredMaterials.map((materialId, index) => (
                    <Badge key={index} variant="outline">
                      {materialId}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Measurements */}
          {order.measurements && Object.keys(order.measurements).length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Ruler className="h-5 w-5 mr-2" />
                  Measurements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Object.entries(order.measurements).map(([key, value]) => (
                    <div key={key} className="text-sm">
                      <span className="font-medium capitalize">{key.replace('_', ' ')}:</span> {value as string}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Design Images (for single item orders) */}
          {!hasMultipleItems && order.designImages && order.designImages.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Design Images</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {order.designImages.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Design ${index + 1}`}
                      className="w-full h-20 object-cover rounded cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => setSelectedImageUrl(url)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {order.notes && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.notes}</p>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Lightbox */}
      {selectedImageUrl && (
        <Dialog open={!!selectedImageUrl} onOpenChange={() => setSelectedImageUrl(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Design Image</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">
              <img
                src={selectedImageUrl}
                alt="Design"
                className="max-w-full max-h-[70vh] object-contain rounded"
              />
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setSelectedImageUrl(null)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default OrderDetailsModal;
