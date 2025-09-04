
import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Icon } from './ui/Icon';
import { Stage, BusinessType, Customer } from '../types';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (newCustomers: Customer[]) => void;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({ isOpen, onClose, onUpload }) => {
  const [file, setFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setFeedback(null);
    }
  };

  const downloadSample = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "name,phone,location,businessType,dailyProduction,stage\n"
      + "Example Snacks Inc.,9876543210,Sample City,Snacks,250,Lead\n"
      + "Murukku World,9123456789,Test Town,Murukku,120,Enquiry";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sample_customers.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const processUpload = () => {
    if (!file) {
      setFeedback({ type: 'error', message: 'Please select a file to upload.' });
      return;
    }

    setIsProcessing(true);
    setFeedback(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const newCustomers = parseCSV(text);
        onUpload(newCustomers);
        setFeedback({ type: 'success', message: `Successfully added ${newCustomers.length} customers!` });
        setFile(null);
        setTimeout(() => {
            onClose();
            setFeedback(null);
        }, 2000);
      } catch (error) {
        if (error instanceof Error) {
            setFeedback({ type: 'error', message: error.message });
        } else {
            setFeedback({ type: 'error', message: 'An unknown error occurred during parsing.' });
        }
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
        setFeedback({ type: 'error', message: 'Failed to read the file.' });
        setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  const parseCSV = (csvText: string): Customer[] => {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) throw new Error("CSV file is empty or has only a header.");

    const header = lines[0].split(',').map(h => h.trim());
    const requiredHeaders = ['name', 'phone', 'location', 'businessType', 'dailyProduction', 'stage'];
    if (!requiredHeaders.every(h => header.includes(h))) {
        throw new Error(`Invalid CSV header. Must contain: ${requiredHeaders.join(', ')}`);
    }

    const customers: Customer[] = [];
    for (let i = 1; i < lines.length; i++) {
        const data = lines[i].split(',');
        if (data.length !== header.length) {
            throw new Error(`Row ${i + 1}: Incorrect number of columns.`);
        }
        
        const rowData: { [key: string]: string } = {};
        header.forEach((key, index) => {
            rowData[key] = data[index]?.trim() || '';
        });

        if (!rowData.name || !rowData.phone || !rowData.location) throw new Error(`Row ${i + 1}: Name, phone, and location are required.`);
        const dailyProduction = parseInt(rowData.dailyProduction, 10);
        if (isNaN(dailyProduction) || dailyProduction <= 0) throw new Error(`Row ${i+1}: 'dailyProduction' must be a positive number.`);
        if (!Object.values(BusinessType).includes(rowData.businessType as BusinessType)) throw new Error(`Row ${i+1}: Invalid 'businessType'. Must be 'Murukku' or 'Snacks'.`);
        if (!Object.values(Stage).includes(rowData.stage as Stage)) throw new Error(`Row ${i+1}: Invalid 'stage'.`);

        const now = new Date();
        const stage = rowData.stage as Stage;
        customers.push({
            id: `CUST-${Date.now()}-${i}`,
            name: rowData.name,
            phone: rowData.phone,
            location: rowData.location,
            businessType: rowData.businessType as BusinessType,
            dailyProduction: dailyProduction,
            stage: stage,
            notes: [],
            quotations: [],
            lastContacted: now,
            createdAt: now,
            stageChangedAt: now,
            stageHistory: [{ from: null, to: stage, changedAt: now }],
            nextFollowUpDate: null,
        });
    }
    return customers;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Upload Customers">
        <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                    Upload a CSV file (editable in Excel). Columns must be: <code className="font-mono bg-blue-100 p-1 rounded">name, phone, location, businessType, dailyProduction, stage</code>.
                </p>
                <button onClick={downloadSample} className="mt-2 text-sm font-semibold text-primary-600 hover:underline">Download Sample CSV File</button>
            </div>
            
            <div>
                <label className="block w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-primary-500">
                    <Icon name="upload" className="w-8 h-8 mx-auto text-gray-400" />
                    <span className="mt-2 block text-sm font-medium text-gray-700">{file ? file.name : 'Click to select a CSV file'}</span>
                    <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                </label>
            </div>

            {feedback && (
                <div className={`p-3 rounded-md text-sm ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {feedback.message}
                </div>
            )}

            <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-semibold">Cancel</button>
                <button onClick={processUpload} disabled={!file || isProcessing} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed">
                    {isProcessing ? 'Processing...' : 'Upload & Process'}
                </button>
            </div>
        </div>
    </Modal>
  );
};