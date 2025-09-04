import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { Customer, CustomerFilter, Stage } from '../types';
import { STAGES } from '../constants';
import { Icon } from './ui/Icon';

type SortDirection = 'ascending' | 'descending';
type SortConfig = { key: keyof Customer; direction: SortDirection } | null;

interface CustomerListProps {
  customers: Customer[];
  onDeleteCustomer: (customerId: string) => void;
  onViewCustomer: (customer: Customer) => void;
  filter: CustomerFilter | null;
  sortConfig: SortConfig;
  onSort: (key: keyof Customer) => void;
}

const SortableHeader: React.FC<{
  label: string;
  sortKey: keyof Customer;
  sortConfig: SortConfig;
  onSort: (key: keyof Customer) => void;
  className?: string;
}> = ({ label, sortKey, sortConfig, onSort, className = '' }) => {
  const isSorted = sortConfig?.key === sortKey;
  const direction = sortConfig?.direction;

  return (
    <th scope="col" className={`px-6 py-3 ${className}`}>
      <button onClick={() => onSort(sortKey)} className="flex items-center space-x-1 group whitespace-nowrap">
        <span>{label}</span>
        <span className={`transition-opacity duration-200 ${isSorted ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
          {isSorted ? (
            direction === 'ascending' ? <Icon name="arrow-up" className="w-3.5 h-3.5" /> : <Icon name="arrow-down" className="w-3.5 h-3.5" />
          ) : (
             <Icon name="arrow-up" className="w-3.5 h-3.5 text-gray-400" />
          )}
        </span>
      </button>
    </th>
  );
};


export const CustomerList: React.FC<CustomerListProps> = ({ customers, onDeleteCustomer, onViewCustomer, filter, sortConfig, onSort }) => {
  const [stageFilter, setStageFilter] = useState<'all' | Stage>('all');

  const displayedCustomers = useMemo(() => {
    if (stageFilter === 'all') {
      return customers;
    }
    return customers.filter(c => c.stage === stageFilter);
  }, [customers, stageFilter]);

  const handleDelete = (customer: Customer) => {
    if (window.confirm(`Are you sure you want to delete ${customer.name}? This action cannot be undone.`)) {
      onDeleteCustomer(customer.id);
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Phone', 'Location', 'Stage', 'Business Type', 'Daily Production (kg)'];
    const rows = displayedCustomers.map(c => [
        `"${c.name.replace(/"/g, '""')}"`,
        c.phone,
        `"${c.location.replace(/"/g, '""')}"`,
        c.stage,
        c.businessType,
        c.dailyProduction.toString()
    ]);

    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" 
        + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "customers_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    (doc as any).autoTable({
        head: [['Name', 'Phone', 'Location', 'Stage', 'Business Type']],
        body: displayedCustomers.map(c => [
            c.name, c.phone, c.location, c.stage, c.businessType
        ]),
        didDrawPage: (data: any) => {
           doc.text('Customer List', data.settings.margin.left, 15);
        }
    });
    doc.save('customers_export.pdf');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 flex justify-between items-start flex-wrap gap-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">{filter?.label || 'All Customers'}</h2>
            <p className="mt-1 text-sm text-gray-500">A complete list of all your customers and leads.</p>
          </div>
           <div className="flex items-center space-x-2">
              <div className="min-w-[200px]">
                  <label htmlFor="stage-filter" className="sr-only">Filter by stage</label>
                  <select
                    id="stage-filter"
                    name="stage-filter"
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                    value={stageFilter}
                    onChange={(e) => setStageFilter(e.target.value as 'all' | Stage)}
                  >
                    <option value="all">All Stages</option>
                    {STAGES.map(stage => (
                        <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
              </div>
              <button onClick={exportToCSV} className="flex items-center px-3 py-1.5 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 text-sm font-semibold">
                  <Icon name="download" className="w-4 h-4 mr-2" />
                  Export CSV
              </button>
              <button onClick={exportToPDF} className="flex items-center px-3 py-1.5 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 text-sm font-semibold">
                  <Icon name="download" className="w-4 h-4 mr-2" />
                  Export PDF
              </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <SortableHeader label="Name" sortKey="name" sortConfig={sortConfig} onSort={onSort} />
                <SortableHeader label="Contact" sortKey="phone" sortConfig={sortConfig} onSort={onSort} />
                <SortableHeader label="Location" sortKey="location" sortConfig={sortConfig} onSort={onSort} />
                <SortableHeader label="Stage" sortKey="stage" sortConfig={sortConfig} onSort={onSort} />
                <th scope="col" className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedCustomers.length > 0 ? displayedCustomers.map((customer) => (
                <tr key={customer.id} className="bg-white border-b hover:bg-gray-50">
                  <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                    {customer.name}
                  </th>
                  <td className="px-6 py-4">{customer.phone}</td>
                  <td className="px-6 py-4">{customer.location}</td>
                  <td className="px-6 py-4">{customer.stage}</td>
                  <td className="px-6 py-4 text-right space-x-4 whitespace-nowrap">
                    <button 
                      onClick={() => onViewCustomer(customer)} 
                      className="font-medium text-primary-600 hover:underline"
                      aria-label={`View details for ${customer.name}`}
                    >
                      View
                    </button>
                    <button 
                      onClick={() => handleDelete(customer)} 
                      className="font-medium text-red-600 hover:underline"
                      aria-label={`Delete ${customer.name}`}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-500">
                        No customers found for this filter.
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};