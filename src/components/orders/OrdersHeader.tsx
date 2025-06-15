
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, List, Grid, Calendar as CalendarIcon } from 'lucide-react';

interface OrdersHeaderProps {
  view: 'list' | 'grid' | 'calendar';
  setView: (view: 'list' | 'grid' | 'calendar') => void;
  setSelectedGridStatus: (status: string | null) => void;
  setIsCreateModalOpen: (open: boolean) => void;
}

const OrdersHeader: React.FC<OrdersHeaderProps> = ({
  view,
  setView,
  setSelectedGridStatus,
  setIsCreateModalOpen
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
        <p className="text-gray-600">Track custom orders and customer requests</p>
      </div>
      <div className="flex items-center space-x-3">
        {/* View Toggle */}
        <div className="flex rounded-lg border bg-white">
          <Button
            variant={view === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setView('list');
              setSelectedGridStatus(null);
            }}
            className="rounded-r-none"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setView('grid');
              setSelectedGridStatus(null);
            }}
            className="rounded-none border-x"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setView('calendar');
              setSelectedGridStatus(null);
            }}
            className="rounded-l-none"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </div>
        <Button 
          className="bg-gradient-to-r from-blue-600 to-purple-600"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Order
        </Button>
      </div>
    </div>
  );
};

export default OrdersHeader;
