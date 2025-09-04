import React from 'react';
import { Customer } from '../types';

interface ReportsProps {
  customers: Customer[];
}

const isToday = (someDate: Date): boolean => {
  const today = new Date();
  return (
    someDate.getDate() === today.getDate() &&
    someDate.getMonth() === today.getMonth() &&
    someDate.getFullYear() === today.getFullYear()
  );
};

const ReportCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white rounded-lg shadow-sm border mb-8">
        <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        </div>
        <div className="overflow-x-auto">
            {children}
        </div>
    </div>
);

const ReportTable: React.FC<{ headers: string[]; children: React.ReactNode; }> = ({ headers, children }) => (
     <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
                {headers.map(header => <th scope="col" key={header} className="px-6 py-3">{header}</th>)}
            </tr>
        </thead>
        <tbody>
            {children}
        </tbody>
    </table>
);

const NoDataRow: React.FC<{ colSpan: number; message: string }> = ({ colSpan, message }) => (
    <tr>
        <td colSpan={colSpan} className="text-center py-10 text-gray-500">
            {message}
        </td>
    </tr>
);

export const Reports: React.FC<ReportsProps> = ({ customers }) => {
  const todaysFollowUps = customers.filter(c => isToday(new Date(c.lastContacted)));
  const todaysStageChanges = customers.filter(c => isToday(new Date(c.stageChangedAt)));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Daily Reports</h1>
        
        <ReportCard title="Today's Follow-ups">
            <ReportTable headers={['Name', 'Contact', 'Stage', 'Follow-up Time']}>
                {todaysFollowUps.length > 0 ? (
                    todaysFollowUps.map(customer => (
                        <tr key={customer.id} className="bg-white border-b hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{customer.name}</td>
                            <td className="px-6 py-4">{customer.phone}</td>
                            <td className="px-6 py-4">{customer.stage}</td>
                            <td className="px-6 py-4">{new Date(customer.lastContacted).toLocaleTimeString()}</td>
                        </tr>
                    ))
                ) : (
                    <NoDataRow colSpan={4} message="No follow-ups recorded today." />
                )}
            </ReportTable>
        </ReportCard>

        <ReportCard title="Today's Stage Changes">
            <ReportTable headers={['Name', 'Contact', 'New Stage', 'Time of Change']}>
                 {todaysStageChanges.length > 0 ? (
                    todaysStageChanges.map(customer => (
                        <tr key={customer.id} className="bg-white border-b hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{customer.name}</td>
                            <td className="px-6 py-4">{customer.phone}</td>
                            <td className="px-6 py-4">
                                <span className="font-semibold">{customer.stage}</span>
                            </td>
                            <td className="px-6 py-4">{new Date(customer.stageChangedAt).toLocaleTimeString()}</td>
                        </tr>
                    ))
                ) : (
                    <NoDataRow colSpan={4} message="No stage changes recorded today." />
                )}
            </ReportTable>
        </ReportCard>
    </div>
  );
};
