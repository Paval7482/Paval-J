
import React, { useState, useMemo } from 'react';
import type { Customer } from '../types';
import { Stage } from '../types';
import { STAGES } from '../constants';
import { CustomerCard } from './CustomerCard';

interface PipelineProps {
  customers: Customer[];
  onCustomerStageChange: (customerId: string, newStage: Stage) => void;
  onSelectCustomer: (customer: Customer) => void;
}

const STAGE_COLORS: { [key in Stage]: string } = {
  [Stage.Enquiry]: 'bg-slate-200 text-slate-800',
  [Stage.Lead]: 'bg-slate-300 text-slate-900',
  [Stage.Booking]: 'bg-slate-500 text-white',
  [Stage.Retail]: 'bg-slate-700 text-white',
};

type DateFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month';

const FilterButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; }> = ({ label, isActive, onClick }) => (
    <button onClick={onClick} className={`px-3 py-1 text-sm font-medium rounded-md ${ isActive ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}>
        {label}
    </button>
);

export const Pipeline: React.FC<PipelineProps> = ({ customers, onCustomerStageChange, onSelectCustomer }) => {
  const [draggedOverStage, setDraggedOverStage] = useState<Stage | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  const filteredCustomers = useMemo(() => {
    if (dateFilter === 'all') return customers;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return customers.filter(c => {
        const createdAt = new Date(c.createdAt);
        switch (dateFilter) {
            case 'today':
                return createdAt >= today;
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                return createdAt >= yesterday && createdAt < today;
            case 'week':
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                return createdAt >= startOfWeek;
            case 'month':
                 const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                 return createdAt >= startOfMonth;
            default:
                return true;
        }
    });
  }, [customers, dateFilter]);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, stage: Stage) => {
    e.preventDefault();
    const customerId = e.dataTransfer.getData('customerId');
    if (customerId) {
      onCustomerStageChange(customerId, stage);
    }
    setDraggedOverStage(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, stage: Stage) => {
    e.preventDefault();
    setDraggedOverStage(stage);
  };

  const handleDragLeave = () => {
    setDraggedOverStage(null);
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col h-full">
        <div className="flex items-center space-x-2 pb-4 px-4 border-b mb-4">
            <span className="text-sm font-semibold text-gray-600">Filter by Date Added:</span>
            <FilterButton label="All Time" isActive={dateFilter === 'all'} onClick={() => setDateFilter('all')} />
            <FilterButton label="Today" isActive={dateFilter === 'today'} onClick={() => setDateFilter('today')} />
            <FilterButton label="Yesterday" isActive={dateFilter === 'yesterday'} onClick={() => setDateFilter('yesterday')} />
            <FilterButton label="This Week" isActive={dateFilter === 'week'} onClick={() => setDateFilter('week')} />
            <FilterButton label="This Month" isActive={dateFilter === 'month'} onClick={() => setDateFilter('month')} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 flex-1 overflow-hidden">
            {STAGES.map(stage => {
            const customersInStage = filteredCustomers.filter(c => c.stage === stage);
            return (
                <div
                key={stage}
                onDrop={(e) => handleDrop(e, stage)}
                onDragOver={(e) => handleDragOver(e, stage)}
                onDragLeave={handleDragLeave}
                className={`flex flex-col rounded-xl transition-colors duration-200 h-full ${draggedOverStage === stage ? 'bg-primary-50' : ''}`}
                >
                <div className="p-4 sticky top-0 bg-gray-50 z-10">
                    <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-700 flex items-center">
                        <span className={`mr-2 px-2.5 py-1 rounded-full text-sm font-medium ${STAGE_COLORS[stage]}`}>{stage}</span>
                    </h2>
                    <span className="text-gray-500 font-semibold">{customersInStage.length}</span>
                    </div>
                </div>
                <div className="flex-1 p-4 pt-0 space-y-4 overflow-y-auto">
                    {customersInStage.map(customer => (
                    <CustomerCard key={customer.id} customer={customer} onClick={() => onSelectCustomer(customer)} />
                    ))}
                </div>
                </div>
            );
            })}
        </div>
    </div>
  );
};