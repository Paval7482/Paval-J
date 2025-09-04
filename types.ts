
export enum Stage {
  Enquiry = 'Enquiry',
  Lead = 'Lead',
  Booking = 'Booking',
  Retail = 'Retail / Order Complete',
}

export enum BusinessType {
  Murukku = 'Murukku',
  Snacks = 'Snacks',
}

export interface Note {
  id: string;
  content: string;
  createdAt: Date;
}

export interface QuotationLineItem {
  id:string;
  description: string;
  hsn: string;
  pcs: number;
  quantity: number;
  amount: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  date: Date;
  lineItems: QuotationLineItem[];
  netAmount: number;
  status: 'Draft' | 'Sent' | 'Accepted';
}

export interface StageHistoryEntry {
  from: Stage | null;
  to: Stage;
  changedAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  location: string;
  businessType: BusinessType;
  dailyProduction: number; // in kgs
  stage: Stage;
  notes: Note[];
  quotations: Quotation[];
  lastContacted: Date;
  createdAt: Date;
  stageChangedAt: Date;
  stageHistory: StageHistoryEntry[];
  nextFollowUpDate: Date | null;
}

// FIX: Changed label types from string literals to 'string' to allow more descriptive labels and fix the type error in Dashboard.tsx.
export type CustomerFilter =
  | { type: 'all'; label: string }
  | { type: 'stages'; stages: Stage[]; label: string }
  | { type: 'pendingFollowUp'; label: string };
