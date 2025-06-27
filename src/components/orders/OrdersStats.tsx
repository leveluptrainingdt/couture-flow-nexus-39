
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Clock, AlertCircle, CheckCircle, Calendar } from 'lucide-react';

interface OrdersStatsProps {
  stats: {
    total: number;
    pending: number;
    inProgress: number;
    ready: number;
    deliveryDeadline: number;
  };
  onStatusFilter: (status: string) => void;
}

const OrdersStats: React.FC<OrdersStatsProps> = ({ stats, onStatusFilter }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">All time orders</p>
        </CardContent>
      </Card>
      
      <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer hover:bg-orange-50" onClick={() => onStatusFilter('received')}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
          <Clock className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
          <p className="text-xs text-muted-foreground">Awaiting processing</p>
        </CardContent>
      </Card>
      
      <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer hover:bg-blue-50" onClick={() => onStatusFilter('in-progress')}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          <AlertCircle className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          <p className="text-xs text-muted-foreground">Currently working</p>
        </CardContent>
      </Card>
      
      <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer hover:bg-green-50" onClick={() => onStatusFilter('ready')}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ready Orders</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.ready}</div>
          <p className="text-xs text-muted-foreground">Ready for pickup</p>
        </CardContent>
      </Card>
      
      <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer hover:bg-red-50" onClick={() => onStatusFilter('delivery-deadline')}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Delivery Deadline</CardTitle>
          <Calendar className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{stats.deliveryDeadline}</div>
          <p className="text-xs text-muted-foreground">Due within 5 days</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrdersStats;
