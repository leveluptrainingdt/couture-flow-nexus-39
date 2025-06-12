
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  measurements?: any;
  address?: string;
  city?: string;
}

interface CustomerAutoSuggestProps {
  value: string;
  onChange: (value: string) => void;
  onCustomerSelect: (customer: Customer) => void;
  placeholder?: string;
}

const CustomerAutoSuggest: React.FC<CustomerAutoSuggestProps> = ({
  value,
  onChange,
  onCustomerSelect,
  placeholder = "Customer name"
}) => {
  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const customersSnapshot = await getDocs(collection(db, 'customers'));
      const customers = customersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Customer[];
      setAllCustomers(customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);
    
    if (inputValue.length > 1) {
      const filtered = allCustomers.filter(customer =>
        customer.name?.toLowerCase().includes(inputValue.toLowerCase()) ||
        customer.phone?.includes(inputValue) ||
        customer.email?.toLowerCase().includes(inputValue.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (customer: Customer) => {
    onChange(customer.name);
    onCustomerSelect(customer);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <Label htmlFor="customerName">Customer Name</Label>
      <Input
        id="customerName"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder={placeholder}
        required
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((customer) => (
            <div
              key={customer.id}
              className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
              onClick={() => handleSuggestionClick(customer)}
            >
              <div className="font-medium">{customer.name}</div>
              <div className="text-sm text-gray-500">{customer.phone}</div>
              {customer.email && (
                <div className="text-sm text-gray-400">{customer.email}</div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {showSuggestions && suggestions.length === 0 && value.length > 1 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-3">
          <div className="text-sm text-gray-500">No existing customers found. Will create new customer.</div>
        </div>
      )}
    </div>
  );
};

export default CustomerAutoSuggest;
