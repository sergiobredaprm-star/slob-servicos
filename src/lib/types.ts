'use client';
import { Timestamp } from 'firebase/firestore';

export type BudgetStatus = 'prospecção' | 'ativo' | 'concluído' | 'cancelado';
export type BudgetType = 'daily' | 'task';
export type ServiceType = 'Pintura' | 'Elétrica' | 'Hidráulica' | 'Alvenaria' | 'Outro';

export type Payment = {
  id: string;
  amount: number;
  date: Date | Timestamp;
  notes?: string;
};

export type Budget = {
  id:string;
  clientId: string;
  clientName: string;
  clientDescription?: string;
  serviceType: ServiceType;
  task: string;
  budgetType: BudgetType;
  dailyRate?: number;
  period?: {
    from: Date | Timestamp;
    to: Date | Timestamp;
  };
  deadline?: Date | Timestamp;
  registrationDate: Date | Timestamp;
  total: number;
  materialCost?: number;
  profit?: number;
  status: BudgetStatus;
  userId: string;
  paymentHistory?: Payment[];
};

export type DailyRateSettings = {
  startTime: string;
  endTime: string;
  workload: number;
  defaultRate: number;
};

export type Client = {
  id: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  userId: string;
};

export type CompanyProfile = {
  id: string;
  companyName: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyWebsite?: string;
  companyTaxId?: string;
  userId: string;
};
