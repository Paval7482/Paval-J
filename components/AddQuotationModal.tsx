
import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from './ui/Modal';
import { Icon } from './ui/Icon';
import type { Quotation, QuotationLineItem } from '../types';

interface AddQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newQuotation: Omit<Quotation, 'id'>) => void;
  existingQuotation: Quotation | null;
}

export const AddQuotationModal: React.FC<AddQuotationModalProps> = ({ isOpen, onClose, onSave, existingQuotation }) => {
  const [quotationNumber, setQuotationNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [lineItems, setLineItems] = useState<QuotationLineItem[]>([]);

  useEffect(() => {
    if (existingQuotation) {
        setQuotationNumber(existingQuotation.quotationNumber);
        setDate(new Date(existingQuotation.date).toISOString().split('T')[0]);
        setLineItems(existingQuotation.lineItems);
    } else {
        // Reset form for a new quotation
        setQuotationNumber(`SLI-Q-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`);
        setDate(new Date().toISOString().split('T')[0]);
        setLineItems([{ id: `LI-${Date.now()}`, description: '', hsn: '', pcs: 1, quantity: 1, amount: 0 }]);
    }
  }, [existingQuotation, isOpen]);

  const handleLineItemChange = (id: string, field: keyof Omit<QuotationLineItem, 'id'>, value: string | number) => {
    setLineItems(items => items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };
  
  const addLineItem = () => {
    setLineItems(items => [...items, { id: `LI-${Date.now()}`, description: '', hsn: '', pcs: 1, quantity: 1, amount: 0 }]);
  };
  
  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
        setLineItems(items => items.filter(item => item.id !== id));
    }
  };

  const { subTotal, cgst, sgst, netAmount } = useMemo(() => {
    const subTotal = lineItems.reduce((acc, item) => acc + Number(item.amount), 0);
    const cgst = subTotal * 0.09;
    const sgst = subTotal * 0.09;
    const netAmount = subTotal + cgst + sgst;
    return { subTotal, cgst, sgst, netAmount };
  }, [lineItems]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const quotationData = {
        quotationNumber,
        date: new Date(date),
        lineItems,
        netAmount,
        status: existingQuotation?.status || 'Draft' as const,
    };
    onSave(quotationData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingQuotation ? "Edit Quotation" : "Create New Quotation"} size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="quotationNumber" className="block text-sm font-medium text-gray-700">Quotation Number</label>
                <input type="text" name="quotationNumber" id="quotationNumber" value={quotationNumber} onChange={(e) => setQuotationNumber(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
            </div>
            <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
                <input type="date" name="date" id="date" value={date} onChange={(e) => setDate(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
            </div>
        </div>

        {/* Line Items */}
        <div className="space-y-4">
            <h3 className="text-md font-semibold text-gray-800 border-b pb-2">Line Items</h3>
            {lineItems.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-x-3 gap-y-2 items-end p-3 bg-gray-50 rounded-lg border">
                    <div className="col-span-12 md:col-span-4">
                        <label className="text-xs font-medium text-gray-600">Description</label>
                        <input type="text" placeholder="Item Description" value={item.description} onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)} required className="w-full p-2 border border-gray-300 rounded-md text-sm" />
                    </div>
                     <div className="col-span-6 md:col-span-2">
                        <label className="text-xs font-medium text-gray-600">HSN Code</label>
                        <input type="text" placeholder="HSN" value={item.hsn} onChange={(e) => handleLineItemChange(item.id, 'hsn', e.target.value)} required className="w-full p-2 border border-gray-300 rounded-md text-sm" />
                    </div>
                     <div className="col-span-6 md:col-span-1">
                        <label className="text-xs font-medium text-gray-600">PCS</label>
                        <input type="number" value={item.pcs} onChange={(e) => handleLineItemChange(item.id, 'pcs', Number(e.target.value))} min="1" required className="w-full p-2 border border-gray-300 rounded-md text-sm" />
                    </div>
                    <div className="col-span-6 md:col-span-1">
                        <label className="text-xs font-medium text-gray-600">Qty</label>
                        <input type="number" value={item.quantity} onChange={(e) => handleLineItemChange(item.id, 'quantity', Number(e.target.value))} min="1" required className="w-full p-2 border border-gray-300 rounded-md text-sm" />
                    </div>
                    <div className="col-span-10 md:col-span-3">
                        <label className="text-xs font-medium text-gray-600">Amount (₹)</label>
                        <input type="number" value={item.amount} onChange={(e) => handleLineItemChange(item.id, 'amount', Number(e.target.value))} min="0" required className="w-full p-2 border border-gray-300 rounded-md text-sm" />
                    </div>
                    <div className="col-span-2 md:col-span-1 text-right">
                        <button type="button" onClick={() => removeLineItem(item.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-full" aria-label="Remove item">
                            <Icon name="trash" className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            ))}
             <button type="button" onClick={addLineItem} className="flex items-center text-sm px-3 py-1.5 border border-dashed border-gray-400 text-gray-700 rounded-md hover:bg-gray-100">
                <Icon name="plus" className="w-4 h-4 mr-1.5"/>
                Add Item
            </button>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-600">Sub-Total:</span>
                    <span className="font-medium text-gray-800">₹{subTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">CGST @ 9%:</span>
                    <span className="font-medium text-gray-800">₹{cgst.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">SGST @ 9%:</span>
                    <span className="font-medium text-gray-800">₹{sgst.toLocaleString('en-IN')}</span>
                </div>
                 <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span className="text-gray-900">Net Amount:</span>
                    <span className="text-primary-700">₹{netAmount.toLocaleString('en-IN')}</span>
                </div>
            </div>
        </div>

        <div className="pt-4 flex justify-end space-x-3 border-t">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-semibold">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-semibold">Save Quotation</button>
        </div>
      </form>
    </Modal>
  );
};
