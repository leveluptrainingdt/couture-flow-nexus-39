
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, DollarSign, Package } from 'lucide-react';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  itemType: string;
  quantity: number;
  totalAmount: number;
  advanceAmount: number;
  remainingAmount: number;
  status: string;
  orderDate: string;
  deliveryDate: string;
}

interface WhatsAppMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
}

const WhatsAppMessageModal: React.FC<WhatsAppMessageModalProps> = ({
  isOpen,
  onClose,
  order
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [customMessage, setCustomMessage] = useState('');

  const messageTemplates = {
    orderEnquiry: `Hi ${order.customerName}! 

Thank you for your interest in Swetha's Couture. 

Order Details:
• Order ID: #${order.orderNumber.slice(-4)}
• Item: ${order.itemType}
• Quantity: ${order.quantity}
• Order Date: ${order.orderDate}
• Expected Delivery: ${order.deliveryDate}

How can I assist you today?`,

    statusUpdate: `Hi ${order.customerName}! 

Your order update from Swetha's Couture:

Order #${order.orderNumber.slice(-4)} - ${order.itemType}
Status: ${order.status.toUpperCase()}

${order.status === 'ready' ? `Great news! Your order is ready for pickup. Please visit us at your convenience.` :
  order.status === 'in-progress' ? `Your order is currently being crafted with care. Expected completion: ${order.deliveryDate}` :
  order.status === 'delivered' ? `Thank you for choosing us! We hope you love your ${order.itemType}.` :
  `Your order is ${order.status}. Expected delivery: ${order.deliveryDate}`}

Thank you for choosing Swetha's Couture! 🪡✨`,

    paymentAlert: `Hi ${order.customerName}! 

Payment details for your order:

Order #${order.orderNumber.slice(-4)} - ${order.itemType}
• Total Amount: ₹${order.totalAmount?.toLocaleString() || 0}
• Advance Paid: ₹${order.advanceAmount?.toLocaleString() || 0}
• Remaining Balance: ₹${order.remainingAmount?.toLocaleString() || 0}

${order.remainingAmount > 0 ? 
  `Please clear the remaining balance before delivery/pickup.` : 
  `Payment completed. Thank you!`}

For any queries, feel free to contact us.

Best regards,
Swetha's Couture 🪡`
  };

  const categories = [
    {
      id: 'orderEnquiry',
      title: 'Order Enquiry',
      icon: Package,
      description: 'General order information and status'
    },
    {
      id: 'statusUpdate',
      title: 'Status Update',
      icon: MessageSquare,
      description: 'Notify customer about order progress'
    },
    {
      id: 'paymentAlert',
      title: 'Payment Alert',
      icon: DollarSign,
      description: 'Payment reminder and balance details'
    }
  ];

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCustomMessage(messageTemplates[categoryId as keyof typeof messageTemplates]);
  };

  const sendWhatsAppMessage = () => {
    const phone = order.customerPhone.replace(/\D/g, '');
    const formattedPhone = phone.startsWith('91') ? phone : `91${phone}`;
    const message = encodeURIComponent(customMessage);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`;
    window.open(whatsappUrl, '_blank');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send WhatsApp Message</DialogTitle>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>To: {order.customerName}</span>
            <Badge variant="outline">{order.customerPhone}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Category Selection */}
          <div>
            <h3 className="text-sm font-medium mb-3">Choose Message Type:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    className="h-auto p-4 flex flex-col items-center text-center"
                    onClick={() => handleCategorySelect(category.id)}
                  >
                    <Icon className="h-6 w-6 mb-2" />
                    <div className="font-medium text-sm">{category.title}</div>
                    <div className="text-xs text-gray-500 mt-1 break-words">{category.description}</div>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Message Preview/Edit */}
          {selectedCategory && (
            <div>
              <h3 className="text-sm font-medium mb-2">Message Preview & Edit:</h3>
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={10}
                className="font-mono text-sm resize-none overflow-y-auto"
                style={{ 
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word',
                  maxHeight: '300px'
                }}
                placeholder="Your message will appear here..."
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={sendWhatsAppMessage}
              disabled={!customMessage.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              Send via WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppMessageModal;
