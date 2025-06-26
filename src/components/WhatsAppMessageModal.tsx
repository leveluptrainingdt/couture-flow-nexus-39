
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, DollarSign, Package, Receipt, Copy, Send, User, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
  items?: any[];
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
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customMessage, setCustomMessage] = useState('');
  const [variables, setVariables] = useState({
    customerName: order.customerName,
    orderId: order.orderNumber.slice(-4),
    orderNumber: order.orderNumber,
    status: order.status,
    balance: order.remainingAmount,
    totalAmount: order.totalAmount,
    advanceAmount: order.advanceAmount,
    itemType: order.itemType,
    quantity: order.quantity,
    orderDate: order.orderDate,
    deliveryDate: order.deliveryDate
  });

  const messageTemplates = {
    orderEnquiry: {
      title: 'Order Enquiry',
      icon: Package,
      description: 'General order information and status',
      template: `Hi {customerName}! 

Thank you for your interest in Swetha's Couture. 

Order Details:
• Order ID: #{orderId}
• Item: {itemType}
• Quantity: {quantity}
• Order Date: {orderDate}
• Expected Delivery: {deliveryDate}

How can I assist you today?

Best regards,
Swetha's Couture 🪡✨`
    },

    statusUpdate: {
      title: 'Status Update',
      icon: MessageSquare,
      description: 'Notify customer about order progress',
      template: `Hi {customerName}! 

Your order update from Swetha's Couture:

Order #{orderId} - {itemType}
Status: {status}

${order.status === 'ready' ? 
  `Great news! Your order is ready for pickup. Please visit us at your convenience.` :
  order.status === 'in-progress' ? 
  `Your order is currently being crafted with care. Expected completion: {deliveryDate}` :
  order.status === 'delivered' ? 
  `Thank you for choosing us! We hope you love your {itemType}.` :
  `Your order is currently {status}. Expected delivery: {deliveryDate}`}

Thank you for choosing Swetha's Couture! 🪡✨`
    },

    paymentAlert: {
      title: 'Payment Alert',
      icon: DollarSign,
      description: 'Payment reminder and balance details',
      template: `Hi {customerName}! 

Payment details for your order:

Order #{orderId} - {itemType}
• Total Amount: ₹{totalAmount}
• Advance Paid: ₹{advanceAmount}
• Remaining Balance: ₹{balance}

${order.remainingAmount > 0 ? 
  `Please clear the remaining balance before delivery/pickup.` : 
  `Payment completed. Thank you!`}

For any queries, feel free to contact us.

Best regards,
Swetha's Couture 🪡`
    },

    billDelivery: {
      title: 'Bill Delivery',
      icon: Receipt,
      description: 'Send bill details with payment options',
      template: `Hello {customerName}! 🪡✨

Your bill for Order #{orderId} is ready from Swetha's Couture.

Bill Details:
• Total Amount: ₹{totalAmount}
• Advance Paid: ₹{advanceAmount}
• Balance Due: ₹{balance}

Please complete the payment at your earliest convenience.

Thank you for choosing Swetha's Couture! 💜`
    },

    readyForPickup: {
      title: 'Ready for Pickup',
      icon: Package,
      description: 'Notify when order is ready',
      template: `🎉 Great News, {customerName}!

Your order is ready for pickup! ✨

Order Details:
• Order ID: #{orderId}
• Item: {itemType}
• Quantity: {quantity}

${order.remainingAmount > 0 ? 
  `Balance Due: ₹{balance} (to be paid at pickup)` : 
  `Payment Status: Complete ✅`}

Please visit us at your convenience to collect your beautiful {itemType}.

Swetha's Couture 🪡`
    },

    deliveryReminder: {
      title: 'Delivery Reminder',
      icon: Calendar,
      description: 'Remind about upcoming delivery date',
      template: `Hi {customerName}! 

Gentle reminder about your order delivery:

Order #{orderId} - {itemType}
Delivery Date: {deliveryDate}

${order.remainingAmount > 0 ? 
  `Balance Due: ₹{balance} (please arrange payment)` : 
  `Payment: Complete ✅`}

We'll contact you on the delivery date. Please ensure someone is available to receive the order.

Thank you!
Swetha's Couture 🪡✨`
    }
  };

  const quickVariables = [
    { key: '{customerName}', label: 'Customer Name', value: variables.customerName },
    { key: '{orderId}', label: 'Order ID', value: variables.orderId },
    { key: '{orderNumber}', label: 'Full Order Number', value: variables.orderNumber },
    { key: '{status}', label: 'Order Status', value: variables.status },
    { key: '{balance}', label: 'Balance Amount', value: `₹${variables.balance.toLocaleString()}` },
    { key: '{totalAmount}', label: 'Total Amount', value: `₹${variables.totalAmount.toLocaleString()}` },
    { key: '{advanceAmount}', label: 'Advance Amount', value: `₹${variables.advanceAmount.toLocaleString()}` },
    { key: '{itemType}', label: 'Item Type', value: variables.itemType },
    { key: '{quantity}', label: 'Quantity', value: variables.quantity.toString() },
    { key: '{orderDate}', label: 'Order Date', value: variables.orderDate },
    { key: '{deliveryDate}', label: 'Delivery Date', value: variables.deliveryDate }
  ];

  const handleTemplateSelect = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    const template = messageTemplates[templateKey as keyof typeof messageTemplates];
    if (template) {
      let processedMessage = template.template;
      
      // Replace variables in template
      quickVariables.forEach(variable => {
        processedMessage = processedMessage.replace(new RegExp(variable.key.replace(/[{}]/g, '\\$&'), 'g'), variable.value);
      });
      
      setCustomMessage(processedMessage);
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = document.querySelector('textarea');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = customMessage;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newText = before + variable + after;
      setCustomMessage(newText);
      
      // Set cursor position after the inserted variable
      setTimeout(() => {
        textarea.setSelectionRange(start + variable.length, start + variable.length);
        textarea.focus();
      }, 0);
    }
  };

  const copyMessage = () => {
    navigator.clipboard.writeText(customMessage);
    toast({
      title: "Copied!",
      description: "Message copied to clipboard",
    });
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send WhatsApp Message</DialogTitle>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <User className="h-4 w-4" />
            <span>To: {order.customerName}</span>
            <Badge variant="outline">{order.customerPhone}</Badge>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Template Selection */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-3">Choose Message Template:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(messageTemplates).map(([key, template]) => {
                    const Icon = template.icon;
                    return (
                      <Card
                        key={key}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedTemplate === key ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                        }`}
                        onClick={() => handleTemplateSelect(key)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <Icon className="h-5 w-5 mt-0.5 text-blue-600" />
                            <div>
                              <div className="font-medium text-sm">{template.title}</div>
                              <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Message Preview/Edit */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">Message Preview & Edit:</h3>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={copyMessage}
                      disabled={!customMessage.trim()}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={12}
                  className="font-mono text-sm resize-none"
                  placeholder="Select a template above or type your custom message..."
                />
              </div>
            </div>
          </div>

          {/* Quick Variables Panel */}
          <div>
            <h3 className="text-sm font-medium mb-3">Quick Variables:</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {quickVariables.map((variable) => (
                <Card
                  key={variable.key}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => insertVariable(variable.key)}
                >
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs font-mono text-blue-600">{variable.key}</div>
                        <div className="text-xs text-gray-500">{variable.label}</div>
                      </div>
                      <div className="text-xs text-gray-700 font-medium">{variable.value}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded text-xs text-blue-800">
              <strong>Tip:</strong> Click on any variable above to insert it into your message at the cursor position.
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={sendWhatsAppMessage}
            disabled={!customMessage.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            <Send className="h-4 w-4 mr-2" />
            Send via WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppMessageModal;
