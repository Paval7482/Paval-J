
import { Stage, BusinessType, Customer } from './types';

const today = new Date();
const tomorrow = new Date();
tomorrow.setDate(today.getDate() + 1);
const yesterday = new Date();
yesterday.setDate(today.getDate() - 1);
const twoDaysAgo = new Date();
twoDaysAgo.setDate(today.getDate() - 2);
const thisWeekStart = new Date();
thisWeekStart.setDate(today.getDate() - 3);
const aWeekAgo = new Date();
aWeekAgo.setDate(today.getDate() - 8);
const twoWeeksAgo = new Date();
twoWeeksAgo.setDate(today.getDate() - 14);
const lastMonth = new Date();
lastMonth.setDate(today.getDate() - 32);


export const STAGES: Stage[] = [
  Stage.Enquiry,
  Stage.Lead,
  Stage.Booking,
  Stage.Retail,
];

export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'CUST-001',
    name: 'Anbu Cheliyan',
    phone: '9876543210',
    location: 'Madurai',
    businessType: BusinessType.Murukku,
    dailyProduction: 150,
    stage: Stage.Enquiry,
    notes: [
      { id: 'N1', content: 'Called to ask about the new automatic murukku machine. Sent brochure.', createdAt: today },
    ],
    quotations: [],
    lastContacted: today,
    createdAt: today,
    stageChangedAt: today,
    stageHistory: [{ from: null, to: Stage.Enquiry, changedAt: today }],
    nextFollowUpDate: tomorrow,
  },
  {
    id: 'CUST-002',
    name: 'Bhavani Snacks',
    phone: '9123456780',
    location: 'Coimbatore',
    businessType: BusinessType.Snacks,
    dailyProduction: 300,
    stage: Stage.Lead,
    notes: [
      { id: 'N2-1', content: 'Interested in a full snacks production line. Needs a detailed quotation.', createdAt: yesterday },
    ],
    quotations: [],
    lastContacted: yesterday,
    createdAt: twoDaysAgo,
    stageChangedAt: yesterday,
    stageHistory: [
      { from: null, to: Stage.Enquiry, changedAt: twoDaysAgo },
      { from: Stage.Enquiry, to: Stage.Lead, changedAt: yesterday }
    ],
    nextFollowUpDate: today,
  },
  {
    id: 'CUST-003',
    name: 'Chennai Sweets',
    phone: '9988776655',
    location: 'Chennai',
    businessType: BusinessType.Snacks,
    dailyProduction: 500,
    stage: Stage.Booking,
    notes: [
      { id: 'N3-1', content: 'Quotation accepted. Paid advance amount.', createdAt: thisWeekStart },
    ],
    quotations: [
       { 
         id: 'Q1',
         quotationNumber: 'SLI-Q-24-001',
         date: thisWeekStart,
         lineItems: [
            { id: 'LI-1', description: 'Automatic Murukku Machine - Model X', hsn: '8438', pcs: 1, quantity: 1, amount: 450000 },
            { id: 'LI-2', description: 'Installation & Training Charges', hsn: '9987', pcs: 1, quantity: 1, amount: 25000 },
         ],
         netAmount: 560500, // 475000 + 18% GST
         status: 'Accepted'
       }
    ],
    lastContacted: thisWeekStart,
    createdAt: twoWeeksAgo,
    stageChangedAt: thisWeekStart,
    stageHistory: [
      { from: null, to: Stage.Enquiry, changedAt: twoWeeksAgo },
      { from: Stage.Enquiry, to: Stage.Lead, changedAt: aWeekAgo },
      { from: Stage.Lead, to: Stage.Booking, changedAt: thisWeekStart }
    ],
    nextFollowUpDate: null,
  },
  {
    id: 'CUST-004',
    name: 'Salem Murukku Center',
    phone: '9001122334',
    location: 'Salem',
    businessType: BusinessType.Murukku,
    dailyProduction: 200,
    stage: Stage.Retail,
    notes: [
      { id: 'N4-1', content: 'Order delivered and installed.', createdAt: lastMonth },
    ],
    quotations: [
       { 
         id: 'Q2',
         quotationNumber: 'SLI-Q-24-002',
         date: lastMonth,
         lineItems: [
            { id: 'LI-3', description: 'Semi-automatic Murukku Machine', hsn: '8438', pcs: 2, quantity: 2, amount: 150000 },
         ],
         netAmount: 177000, // 150000 + 18% GST
         status: 'Accepted'
       }
    ],
    lastContacted: lastMonth,
    createdAt: lastMonth,
    stageChangedAt: lastMonth,
    stageHistory: [{ from: null, to: Stage.Retail, changedAt: lastMonth }],
    nextFollowUpDate: null,
  },
  {
    id: 'CUST-005',
    name: 'Tirunelveli Halwa King',
    phone: '9556677889',
    location: 'Tirunelveli',
    businessType: BusinessType.Snacks,
    dailyProduction: 400,
    stage: Stage.Lead,
    notes: [
      { id: 'N5-1', content: 'Follow-up call scheduled for next week to discuss pricing.', createdAt: thisWeekStart },
    ],
    quotations: [],
    lastContacted: thisWeekStart,
    createdAt: aWeekAgo,
    stageChangedAt: thisWeekStart,
    stageHistory: [
      { from: null, to: Stage.Enquiry, changedAt: aWeekAgo },
      { from: Stage.Enquiry, to: Stage.Lead, changedAt: thisWeekStart }
    ],
    nextFollowUpDate: today,
  },
  {
    id: 'CUST-006',
    name: 'Erode Crispies',
    phone: '9112233445',
    location: 'Erode',
    businessType: BusinessType.Snacks,
    dailyProduction: 180,
    stage: Stage.Enquiry,
    notes: [],
    quotations: [],
    lastContacted: aWeekAgo, // This customer will be in pending follow-up
    createdAt: aWeekAgo,
    stageChangedAt: aWeekAgo,
    stageHistory: [{ from: null, to: Stage.Enquiry, changedAt: aWeekAgo }],
    nextFollowUpDate: null,
  }
];
