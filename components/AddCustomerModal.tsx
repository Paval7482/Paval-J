
import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Stage, BusinessType, Customer } from '../types';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newCustomer: Omit<Customer, 'id' | 'notes' | 'quotations' | 'lastContacted' | 'createdAt' | 'stageChangedAt' | 'stageHistory' | 'nextFollowUpDate'>) => void;
}

type NewCustomerData = {
  name: string;
  phone: string;
  location: string;
  businessType: BusinessType;
  dailyProduction: number;
  stage: Stage;
};


export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<NewCustomerData>({
    name: '',
    phone: '',
    location: '',
    businessType: BusinessType.Murukku,
    dailyProduction: 100,
    stage: Stage.Enquiry,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof NewCustomerData, string>>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'dailyProduction' ? Number(value) : value }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof NewCustomerData, string>> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (formData.dailyProduction <= 0) newErrors.dailyProduction = 'Production must be a positive number';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
      // Reset form for next time
      setFormData({
        name: '', phone: '', location: '', businessType: BusinessType.Murukku, dailyProduction: 100, stage: Stage.Enquiry
      });
      setErrors({});
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Customer">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Customer Name</label>
          <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
                <input type="text" name="phone" id="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
            </div>
            <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
                <input type="text" name="location" id="location" value={formData.location} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                {errors.location && <p className="mt-1 text-xs text-red-600">{errors.location}</p>}
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="businessType" className="block text-sm font-medium text-gray-700">Business Type</label>
                <select name="businessType" id="businessType" value={formData.businessType} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                    {Object.values(BusinessType).map(type => <option key={type} value={type}>{type}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="dailyProduction" className="block text-sm font-medium text-gray-700">Daily Production (kg)</label>
                <input type="number" name="dailyProduction" id="dailyProduction" value={formData.dailyProduction} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                {errors.dailyProduction && <p className="mt-1 text-xs text-red-600">{errors.dailyProduction}</p>}
            </div>
        </div>

         <div>
          <label htmlFor="stage" className="block text-sm font-medium text-gray-700">Initial Stage</label>
          <select name="stage" id="stage" value={formData.stage} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
            {Object.values(Stage).map(stage => <option key={stage} value={stage}>{stage}</option>)}
          </select>
        </div>

        <div className="pt-4 flex justify-end space-x-3">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-semibold">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-semibold">Save Customer</button>
        </div>
      </form>
    </Modal>
  );
};