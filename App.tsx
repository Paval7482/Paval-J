
import React, { useState, useCallback, useMemo } from 'react';
import { MOCK_CUSTOMERS } from './constants';
import { Stage } from './types';
import type { Customer, CustomerFilter, StageHistoryEntry } from './types';
import { Pipeline } from './components/Pipeline';
import { Dashboard } from './components/Dashboard';
import { CustomerDetailsModal } from './components/CustomerDetailsModal';
import { Icon } from './components/ui/Icon';
import { AddCustomerModal } from './components/AddCustomerModal';
import { BulkUploadModal } from './components/BulkUploadModal';
import { CustomerList } from './components/CustomerList';
import { Reports } from './components/Reports';
import { LoginPage } from './components/LoginPage';
import { LOGO_BASE64 } from './logo';

type View = 'pipeline' | 'dashboard' | 'customers' | 'reports';
type SortDirection = 'ascending' | 'descending';
type SortConfig = { key: keyof Customer; direction: SortDirection } | null;


const NavItem: React.FC<{ icon: string; label: string; isActive: boolean; onClick: () => void; }> = ({ icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
            isActive ? 'bg-primary-700 text-white' : 'text-gray-400 hover:bg-primary-800 hover:text-white'
        }`}
    >
        <Icon name={icon} className="w-5 h-5 mr-3" />
        <span>{label}</span>
    </button>
);

const App: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);
    const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
    const [customerFilter, setCustomerFilter] = useState<CustomerFilter | null>(null);
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);


    const handleLogin = (username: string, password: string) => {
        if (username === 'admin' && password === 'admin') {
            setIsAuthenticated(true);
            setLoginError(null);
        } else {
            setLoginError('Invalid username or password.');
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
    };


    const handleCustomerStageChange = useCallback((customerId: string, newStage: Stage) => {
        setCustomers(prev => prev.map(c => {
            if (c.id === customerId && c.stage !== newStage) {
                const newHistoryEntry: StageHistoryEntry = { from: c.stage, to: newStage, changedAt: new Date() };
                return { 
                    ...c, 
                    stage: newStage, 
                    lastContacted: new Date(), 
                    stageChangedAt: new Date(),
                    stageHistory: [...c.stageHistory, newHistoryEntry]
                };
            }
            return c;
        }));
    }, []);
    
    const handleUpdateCustomer = useCallback((updatedCustomer: Customer) => {
        setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
        if (selectedCustomer && selectedCustomer.id === updatedCustomer.id) {
            setSelectedCustomer(updatedCustomer);
        }
    }, [selectedCustomer]);

    const handleDeleteCustomer = useCallback((customerId: string) => {
        setCustomers(prev => prev.filter(c => c.id !== customerId));
        if (selectedCustomer && selectedCustomer.id === customerId) {
            setSelectedCustomer(null);
        }
    }, [selectedCustomer]);

    const handleAddCustomer = useCallback((newCustomerData: Omit<Customer, 'id' | 'notes' | 'quotations' | 'lastContacted' | 'createdAt' | 'stageChangedAt' | 'stageHistory' | 'nextFollowUpDate'>) => {
        const now = new Date();
        const newCustomer: Customer = {
            ...newCustomerData,
            id: `CUST-${Date.now()}`,
            notes: [],
            quotations: [],
            lastContacted: now,
            createdAt: now,
            stageChangedAt: now,
            stageHistory: [{ from: null, to: newCustomerData.stage, changedAt: now }],
            nextFollowUpDate: null,
        };
        setCustomers(prev => [newCustomer, ...prev]);
        setIsAddModalOpen(false);
    }, []);

    const handleBulkUpload = useCallback((newCustomers: Customer[]) => {
        setCustomers(prev => [...newCustomers, ...prev]);
    }, []);

    const handleNavigateAndFilter = useCallback((filter: CustomerFilter) => {
        setCustomerFilter(filter);
        setCurrentView('customers');
    }, []);

    const handleViewCustomers = useCallback(() => {
        setCurrentView('customers');
        setCustomerFilter({ type: 'all', label: 'All Customers' });
    }, []);

    const handleSort = useCallback((key: keyof Customer) => {
        setSortConfig(prevConfig => {
            if (prevConfig && prevConfig.key === key && prevConfig.direction === 'ascending') {
                return { key, direction: 'descending' };
            }
            return { key, direction: 'ascending' };
        });
    }, []);

    const filteredAndSortedCustomers = useMemo(() => {
        let filtered = customers;
        if (customerFilter && currentView === 'customers') {
            switch (customerFilter.type) {
                case 'all':
                    // No filter needed
                    break;
                case 'stages':
                    filtered = customers.filter(c => customerFilter.stages.includes(c.stage));
                    break;
                case 'pendingFollowUp':
                    filtered = customers.filter(c => {
                        const daysSinceContact = Math.floor((new Date().getTime() - new Date(c.lastContacted).getTime()) / (1000 * 3600 * 24));
                        return daysSinceContact > 7;
                    });
                    break;
            }
        }
        
        if (sortConfig !== null) {
            return [...filtered].sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }

        return filtered;
    }, [customers, customerFilter, currentView, sortConfig]);
    
    if (!isAuthenticated) {
        return <LoginPage onLogin={handleLogin} error={loginError} />;
    }

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            <aside className="w-64 bg-primary-900 text-white flex flex-col flex-shrink-0">
                <div className="h-20 flex items-center justify-center p-4 bg-primary-950">
                    <img src={LOGO_BASE64} alt="Sri Lakshmi Industries Logo" className="w-32" />
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    <NavItem icon="dashboard" label="Dashboard" isActive={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
                    <NavItem icon="pipeline" label="Pipeline" isActive={currentView === 'pipeline'} onClick={() => setCurrentView('pipeline')} />
                    <NavItem icon="customers" label="Customers" isActive={currentView === 'customers'} onClick={handleViewCustomers} />
                    <NavItem icon="reports" label="Reports" isActive={currentView === 'reports'} onClick={() => setCurrentView('reports')} />
                </nav>
                <div className="p-4 border-t border-primary-800 space-y-3">
                    <button onClick={() => setIsAddModalOpen(true)} className="w-full flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-semibold">
                        <Icon name="plus" className="w-4 h-4 mr-2" /> Add Customer
                    </button>
                    <button onClick={() => setIsBulkUploadModalOpen(true)} className="w-full flex items-center justify-center px-4 py-2 bg-primary-700 text-white rounded-md hover:bg-primary-800 text-sm font-semibold">
                        <Icon name="upload" className="w-4 h-4 mr-2" /> Bulk Upload
                    </button>
                    <button onClick={handleLogout} className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-semibold mt-4">
                         Logout
                    </button>
                </div>
            </aside>
            <main className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-x-hidden overflow-y-auto">
                    {currentView === 'dashboard' && <Dashboard customers={customers} onNavigate={handleNavigateAndFilter} onSelectCustomer={setSelectedCustomer} />}
                    {currentView === 'pipeline' && (
                        <Pipeline customers={customers} onCustomerStageChange={handleCustomerStageChange} onSelectCustomer={setSelectedCustomer} />
                    )}
                    {currentView === 'customers' && (
                        <CustomerList 
                            customers={filteredAndSortedCustomers} 
                            onViewCustomer={setSelectedCustomer} 
                            onDeleteCustomer={handleDeleteCustomer} 
                            filter={customerFilter} 
                            sortConfig={sortConfig}
                            onSort={handleSort}
                        />
                    )}
                    {currentView === 'reports' && <Reports customers={customers} />}
                </div>
            </main>
            <CustomerDetailsModal customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} onUpdateCustomer={handleUpdateCustomer} onDeleteCustomer={handleDeleteCustomer} onCustomerStageChange={handleCustomerStageChange} />
            <AddCustomerModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSave={handleAddCustomer} />
            <BulkUploadModal isOpen={isBulkUploadModalOpen} onClose={() => setIsBulkUploadModalOpen(false)} onUpload={handleBulkUpload} />
        </div>
    );
};
export default App;
