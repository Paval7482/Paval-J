
import React from 'react';
import type { Customer, CustomerFilter } from '../types';
import { Stage } from '../types';
import { STAGES } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Icon } from './ui/Icon';

interface DashboardProps {
    customers: Customer[];
    onNavigate: (filter: CustomerFilter) => void;
    onSelectCustomer: (customer: Customer) => void;
}

const StatCard: React.FC<{ title: string, value: string, icon: string, color: string, onClick?: () => void }> = ({ title, value, icon, color, onClick }) => (
    <div 
        className={`bg-white p-6 rounded-lg shadow-sm border flex items-start justify-between transition-all duration-200 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-primary-300' : ''}`}
        onClick={onClick}
        role={onClick ? 'button' : 'figure'}
        tabIndex={onClick ? 0 : -1}
        onKeyPress={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
    >
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${color}`}>
            <Icon name={icon} className="w-6 h-6 text-white" />
        </div>
    </div>
);

const ReminderItem: React.FC<{customer: Customer, onClick: () => void}> = ({customer, onClick}) => (
    <button onClick={onClick} className="w-full text-left p-2.5 rounded-md hover:bg-gray-100 flex justify-between items-center transition-colors">
        <div>
            <p className="font-medium text-sm text-gray-800">{customer.name}</p>
            <p className="text-xs text-gray-500">{customer.phone}</p>
        </div>
        <Icon name="phone" className="w-5 h-5 text-primary-500 flex-shrink-0" />
    </button>
)

const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}


export const Dashboard: React.FC<DashboardProps> = ({ customers, onNavigate, onSelectCustomer }) => {
    const totalCustomers = customers.length;
    const bookings = customers.filter(c => c.stage === Stage.Booking || c.stage === Stage.Retail);
    const conversionRate = totalCustomers > 0 ? ((bookings.length / totalCustomers) * 100).toFixed(1) : '0';

    const pendingFollowUps = customers.filter(c => {
        const daysSinceContact = Math.floor((new Date().getTime() - c.lastContacted.getTime()) / (1000 * 3600 * 24));
        return daysSinceContact > 7;
    }).length;

    const leadsByStageData = STAGES.map(stage => ({
        name: stage,
        count: customers.filter(c => c.stage === stage).length,
    }));
    
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const todaysFollowUps = customers.filter(c => c.nextFollowUpDate && isSameDay(new Date(c.nextFollowUpDate), today));
    const tomorrowsFollowUps = customers.filter(c => c.nextFollowUpDate && isSameDay(new Date(c.nextFollowUpDate), tomorrow));


    const COLORS = ['#334155', '#475569', '#64748b', '#94a3b8'];
    
    return (
        <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Customers" value={totalCustomers.toString()} icon="customers" color="bg-primary-500" onClick={() => onNavigate({ type: 'all', label: 'All Customers' })}/>
                <StatCard title="Total Bookings" value={bookings.length.toString()} icon="pipeline" color="bg-primary-600" onClick={() => onNavigate({ type: 'stages', stages: [Stage.Booking, Stage.Retail], label: 'Booked Customers' })}/>
                <StatCard title="Conversion %" value={`${conversionRate}%`} icon="sparkles" color="bg-primary-700"/>
                <StatCard title="Pending Follow-up" value={pendingFollowUps.toString()} icon="phone" color="bg-red-500" onClick={() => onNavigate({ type: 'pendingFollowUp', label: 'Customers with Pending Follow-up' })}/>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border h-96">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Leads by Stage</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={leadsByStageData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} />
                            <Tooltip wrapperClassName="!bg-white !border-gray-200 !rounded-lg !shadow-lg" />
                            <Legend />
                            <Bar dataKey="count" name="Customers" fill="#475569" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-sm border h-96">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Stage Distribution</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                             <Pie
                                data={leadsByStageData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={120}
                                fill="#8884d8"
                                dataKey="count"
                                nameKey="name"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                                {leadsByStageData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Follow-up Reminders */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Follow-up Reminders</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div>
                        <h4 className="font-semibold text-gray-600 border-b pb-2 mb-3">Today</h4>
                        <div className="space-y-1">
                            {todaysFollowUps.length > 0 ? (
                                todaysFollowUps.map(c => <ReminderItem key={c.id} customer={c} onClick={() => onSelectCustomer(c)} />)
                            ) : (
                                <p className="text-sm text-gray-400 pt-2">No follow-ups scheduled for today.</p>
                            )}
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-600 border-b pb-2 mb-3">Tomorrow</h4>
                         <div className="space-y-1">
                            {tomorrowsFollowUps.length > 0 ? (
                                tomorrowsFollowUps.map(c => <ReminderItem key={c.id} customer={c} onClick={() => onSelectCustomer(c)} />)
                            ) : (
                                <p className="text-sm text-gray-400 pt-2">No follow-ups scheduled for tomorrow.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};