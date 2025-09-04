
import React, { useState, useCallback, useEffect } from 'react';
import { Stage, type Customer, type Note, type Quotation } from '../types';
import { generateFollowUpMessage } from '../services/geminiService';
import { generateQuotationPdf } from '../services/quotationPdf';
import { Modal } from './ui/Modal';
import { Icon } from './ui/Icon';
import { AddQuotationModal } from './AddQuotationModal';

interface CustomerDetailsModalProps {
  customer: Customer | null;
  onClose: () => void;
  onUpdateCustomer: (updatedCustomer: Customer) => void;
  onDeleteCustomer: (customerId: string) => void;
  onCustomerStageChange: (customerId: string, newStage: Stage) => void;
}

const DetailItem: React.FC<{ icon: string; label: string; value: string | number }> = ({ icon, label, value }) => (
    <div className="flex items-start text-sm text-gray-700">
        <Icon name={icon} className="w-5 h-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
        <div>
            <span className="font-semibold text-gray-800">{label}:</span> {value}
        </div>
    </div>
);

export const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({ customer, onClose, onUpdateCustomer, onDeleteCustomer, onCustomerStageChange }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'notes' | 'quotations' | 'stageHistory'>('details');
  const [newNote, setNewNote] = useState('');
  const [newNoteDate, setNewNoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [nextFollowUp, setNextFollowUp] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);

  useEffect(() => {
    if (customer) {
      const suggestedDate = new Date();
      suggestedDate.setDate(suggestedDate.getDate() + 7);
      setNextFollowUp(suggestedDate.toISOString().split('T')[0]);
    } else {
        // Reset tab to details when modal is closed or customer changes
        setActiveTab('details');
    }
  }, [customer]);

  const handleAddNote = () => {
    if (newNote.trim() && customer) {
      const note: Note = {
        id: `N-${Date.now()}`,
        content: newNote.trim(),
        createdAt: new Date(newNoteDate + 'T00:00:00'),
      };
      const updatedCustomer: Customer = {
        ...customer,
        notes: [note, ...customer.notes],
        lastContacted: new Date(),
        nextFollowUpDate: nextFollowUp ? new Date(nextFollowUp + 'T00:00:00') : null,
      };
      onUpdateCustomer(updatedCustomer);
      setNewNote('');
      const suggestedDate = new Date();
      suggestedDate.setDate(suggestedDate.getDate() + 7);
      setNextFollowUp(suggestedDate.toISOString().split('T')[0]);
    }
  };
  
  const handleSaveQuotation = (quotationData: Omit<Quotation, 'id'>) => {
    if (!customer) return;
    
    let updatedQuotations: Quotation[];
    
    if (editingQuotation) {
        // Update existing quotation
        updatedQuotations = customer.quotations.map(q => 
            q.id === editingQuotation.id ? { ...q, ...quotationData } : q
        );
    } else {
        // Add new quotation
        const newQuotation: Quotation = {
            ...quotationData,
            id: `Q-${Date.now()}`,
        };
        updatedQuotations = [newQuotation, ...customer.quotations];
    }

    const updatedCustomer = { ...customer, quotations: updatedQuotations };
    onUpdateCustomer(updatedCustomer);
    setIsQuotationModalOpen(false);
    setEditingQuotation(null);
  };

  const handleConfirmOrder = (quotationId: string) => {
    if (!customer || !window.confirm('Are you sure you want to confirm this order? This will move the customer to the "Booking" stage.')) return;
    
    const updatedQuotations = customer.quotations.map(q => 
        q.id === quotationId ? { ...q, status: 'Accepted' as const } : q
    );
    
    const updatedCustomer: Customer = {
        ...customer,
        quotations: updatedQuotations,
    };
    
    onUpdateCustomer(updatedCustomer);
    
    if (customer.stage !== Stage.Booking) {
        onCustomerStageChange(customer.id, Stage.Booking);
    }
  };


  const handleGenerateSuggestion = useCallback(async () => {
    if (!customer) return;
    setIsGenerating(true);
    setAiSuggestion('');
    try {
      const suggestion = await generateFollowUpMessage(customer);
      setAiSuggestion(suggestion);
    } catch (error) {
      setAiSuggestion('Failed to generate suggestion.');
    } finally {
      setIsGenerating(false);
    }
  }, [customer]);
  
  const handleDelete = () => {
    if (customer && window.confirm(`Are you sure you want to delete ${customer.name}? This action cannot be undone.`)) {
        onDeleteCustomer(customer.id);
    }
  };


  if (!customer) return null;

  return (
    <>
    <Modal 
        isOpen={!!customer} 
        onClose={onClose} 
        title={customer.name} 
        size="xl"
        footer={
            <div className="flex justify-between w-full items-center">
                <button onClick={handleDelete} className="flex items-center px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-semibold">
                    <Icon name="trash" className="w-4 h-4 mr-2" />
                    Delete Customer
                </button>
            </div>
        }
    >
        <div className="flex flex-col">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 pb-6 border-b">
               <DetailItem icon="phone" label="Phone" value={customer.phone} />
               <DetailItem icon="location" label="Location" value={customer.location} />
               <DetailItem icon="factory" label="Business" value={`${customer.businessType} (${customer.dailyProduction} kg/day)`} />
               <div className="flex items-center text-sm text-gray-700">
                   <span className={`w-3 h-3 rounded-full mr-2 ${
                       customer.stage === Stage.Enquiry ? 'bg-slate-400'
                       : customer.stage === Stage.Lead ? 'bg-slate-500'
                       : customer.stage === Stage.Booking ? 'bg-slate-600'
                       : 'bg-slate-700'
                   }`}></span>
                   <span className="font-semibold text-gray-800">Stage:</span> {customer.stage}
               </div>
            </div>

            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('details')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'details' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Details
                    </button>
                     <button onClick={() => setActiveTab('notes')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'notes' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Notes & Follow-ups
                    </button>
                    <button onClick={() => setActiveTab('quotations')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'quotations' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Quotations
                    </button>
                    <button onClick={() => setActiveTab('stageHistory')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'stageHistory' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Stage History
                    </button>
                </nav>
            </div>

            <div className="pt-6">
                {activeTab === 'details' && (
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
                        <p className="text-gray-600">Additional customer details will be displayed here.</p>
                    </div>
                )}
                {activeTab === 'notes' && (
                    <div>
                        <div className="space-y-4 max-h-48 overflow-y-auto pr-2 mb-4">
                        {customer.notes.length > 0 ? customer.notes.map(note => (
                            <div key={note.id} className="bg-gray-50 p-3 rounded-lg border">
                                <p className="text-sm text-gray-800">{note.content}</p>
                                <p className="text-xs text-gray-500 mt-1">{note.createdAt.toLocaleString()}</p>
                            </div>
                        )) : <p className="text-sm text-gray-500">No notes yet.</p>}
                        </div>

                        <div className="mt-4 border-t pt-4">
                            <h4 className="text-md font-semibold text-gray-800 mb-2">Add New Entry</h4>
                            <textarea
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder="Add a new note or follow-up details..."
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
                                rows={3}
                            />
                             <div className="flex flex-wrap justify-between items-center mt-2 gap-4">
                                <div className="flex items-center gap-4 flex-wrap">
                                    <div>
                                        <label htmlFor="noteDate" className="block text-xs font-medium text-gray-600 mb-1">Entry Date</label>
                                        <input
                                            type="date"
                                            id="noteDate"
                                            value={newNoteDate}
                                            onChange={(e) => setNewNoteDate(e.target.value)}
                                            className="p-1.5 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="nextFollowUp" className="block text-xs font-medium text-gray-600 mb-1">Next Follow-up?</label>
                                        <input
                                            type="date"
                                            id="nextFollowUp"
                                            value={nextFollowUp}
                                            onChange={(e) => setNextFollowUp(e.target.value)}
                                            className="p-1.5 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
                                        />
                                    </div>
                                    <button onClick={handleGenerateSuggestion} disabled={isGenerating} className="self-end flex items-center text-sm px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 disabled:opacity-50">
                                        <Icon name="sparkles" className="w-4 h-4 mr-2" />
                                        {isGenerating ? 'Generating...' : 'AI Suggestion'}
                                    </button>
                                </div>
                                <button onClick={handleAddNote} className="self-end px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-semibold">
                                    Add Note
                                </button>
                            </div>
                             {aiSuggestion && (
                                <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                                    <p className="text-sm font-semibold text-indigo-800 mb-1">AI Suggestion:</p>
                                    <p className="text-sm text-indigo-700 italic">{aiSuggestion}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {activeTab === 'quotations' && (
                     <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">Quotation History</h3>
                             <button onClick={() => { setEditingQuotation(null); setIsQuotationModalOpen(true); }} className="flex items-center text-sm px-3 py-1.5 bg-primary-600 text-white rounded-md hover:bg-primary-700">
                                <Icon name="plus" className="w-4 h-4 mr-1.5"/>
                                New Quotation
                            </button>
                        </div>
                         <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {customer.quotations.length > 0 ? customer.quotations.map(q => (
                                <div key={q.id} className="bg-gray-50 p-4 rounded-lg border">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-gray-800">{q.quotationNumber}</p>
                                            <p className="text-sm text-gray-600">Amount: <span className="font-semibold">₹{q.netAmount.toLocaleString('en-IN')}</span></p>
                                            <p className="text-xs text-gray-500">Dated: {new Date(q.date).toLocaleDateString()}</p>
                                        </div>
                                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                            q.status === 'Sent' ? 'bg-blue-100 text-blue-800' :
                                            q.status === 'Accepted' ? 'bg-green-100 text-green-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>{q.status}</span>
                                    </div>
                                    <div className="mt-4 pt-3 border-t flex items-center justify-end space-x-3">
                                        <button onClick={() => { setEditingQuotation(q); setIsQuotationModalOpen(true); }} className="text-sm font-medium text-gray-600 hover:text-primary-600">Edit</button>
                                        <button onClick={() => generateQuotationPdf(customer, q)} className="text-sm font-medium text-gray-600 hover:text-primary-600">Generate PDF</button>
                                        {q.status !== 'Accepted' && (
                                            <button onClick={() => handleConfirmOrder(q.id)} className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 font-semibold">
                                                Confirm Order
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )) : <p className="text-sm text-gray-500">No quotations found.</p>}
                        </div>
                    </div>
                )}
                 {activeTab === 'stageHistory' && (
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Stage Journey</h3>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {customer.stageHistory && customer.stageHistory.length > 0 ? (
                                [...customer.stageHistory].reverse().map((entry, index) => (
                                    <div key={index} className="flex items-start p-4 bg-gray-50 rounded-lg border">
                                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center mr-4 mt-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </div>
                                        <div className="flex-grow">
                                            <p className="text-sm text-gray-800">
                                                Moved from <span className="font-semibold text-gray-900">{entry.from || 'Initial Creation'}</span> to <span className="font-semibold text-primary-700">{entry.to}</span>
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(entry.changedAt).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500">No stage history has been recorded.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    </Modal>
    {isQuotationModalOpen && (
        <AddQuotationModal
            isOpen={isQuotationModalOpen}
            onClose={() => setIsQuotationModalOpen(false)}
            onSave={handleSaveQuotation}
            existingQuotation={editingQuotation}
        />
    )}
    </>
  );
};
