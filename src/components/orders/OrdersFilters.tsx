
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Search, Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';

interface OrdersFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  dateFilter: { from?: Date; to?: Date; single?: Date };
  setDateFilter: (filter: { from?: Date; to?: Date; single?: Date }) => void;
}

const OrdersFilters: React.FC<OrdersFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  dateFilter,
  setDateFilter
}) => {
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const clearDateFilter = () => {
    setDateFilter({});
    setIsDatePickerOpen(false);
  };

  const handleSingleDateSelect = (date: Date | undefined) => {
    setDateFilter({ single: date });
  };

  const handleRangeDateSelect = (range: { from?: Date; to?: Date } | undefined) => {
    setDateFilter({ from: range?.from, to: range?.to });
  };

  const getDateDisplayText = () => {
    if (dateFilter.single) {
      return format(dateFilter.single, "MMM dd, yyyy");
    }
    if (dateFilter.from && dateFilter.to) {
      return `${format(dateFilter.from, "MMM dd")} - ${format(dateFilter.to, "MMM dd")}`;
    }
    if (dateFilter.from) {
      return `From ${format(dateFilter.from, "MMM dd, yyyy")}`;
    }
    return "Pick date";
  };

  const hasDateFilter = dateFilter.single || dateFilter.from || dateFilter.to;

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search orders, customers, or items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className={`w-full sm:w-60 justify-start ${hasDateFilter ? 'bg-blue-50 border-blue-200' : ''}`}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {hasDateFilter ? getDateDisplayText() : "Pick date"}
              {hasDateFilter && (
                <X 
                  className="ml-auto h-4 w-4 hover:text-red-500" 
                  onClick={(e) => {
                    e.stopPropagation();
                    clearDateFilter();
                  }}
                />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="p-3 border-b">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Date Filter Mode</p>
                <div className="flex rounded-md border">
                  <Button
                    variant={dateMode === 'single' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setDateMode('single')}
                    className="rounded-r-none text-xs"
                  >
                    Single
                  </Button>
                  <Button
                    variant={dateMode === 'range' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setDateMode('range')}
                    className="rounded-l-none text-xs"
                  >
                    Range
                  </Button>
                </div>
              </div>
            </div>
            {dateMode === 'single' ? (
              <Calendar
                mode="single"
                selected={dateFilter.single}
                onSelect={handleSingleDateSelect}
                numberOfMonths={1}
              />
            ) : (
              <Calendar
                mode="range"
                selected={{ from: dateFilter.from, to: dateFilter.to }}
                onSelect={handleRangeDateSelect}
                numberOfMonths={2}
              />
            )}
            <div className="p-3 border-t">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearDateFilter}
                  className="flex-1"
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsDatePickerOpen(false)}
                  className="flex-1"
                >
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default OrdersFilters;
