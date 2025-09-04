
import React from 'react';
import type { Customer } from '../types';
import { Icon } from './ui/Icon';

interface CustomerCardProps {
  customer: Customer;
  onClick: () => void;
}

export const CustomerCard: React.FC<CustomerCardProps> = ({ customer, onClick }) => {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('customerId', customer.id);
  };

  const daysSinceContact = Math.floor((new Date().getTime() - customer.lastContacted.getTime()) / (1000 * 3600 * 24));
  const contactStatusColor = daysSinceContact > 7 ? 'text-red-500' : daysSinceContact > 3 ? 'text-yellow-600' : 'text-green-600';

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-primary-400 cursor-pointer transition-all duration-200"
    >
      <h3 className="font-bold text-gray-800 text-md truncate">{customer.name}</h3>
      <p className="text-sm text-gray-500 mt-1 flex items-center">
        <Icon name="location" className="w-4 h-4 mr-1.5 text-gray-400" />
        {customer.location}
      </p>
      <p className="text-sm text-gray-500 mt-1 flex items-center">
        <Icon name="factory" className="w-4 h-4 mr-1.5 text-gray-400" />
        {customer.businessType} - {customer.dailyProduction} kg/day
      </p>
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className={`text-xs font-medium ${contactStatusColor}`}>
          Last contacted: {daysSinceContact} day{daysSinceContact !== 1 && 's'} ago
        </p>
      </div>
    </div>
  );
};
