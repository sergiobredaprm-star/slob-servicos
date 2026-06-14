
'use client';
import { Timestamp } from 'firebase/firestore';

export type BudgetStatus = 'prospecção' | 'ativo' | 'concluído' | 'cancelado';
export type BudgetType = 'daily' | 'task';
export type ServiceType = 'Pintura' | 'Elétrica' | 'Hidráulica' | 'Alvenaria' | 'Outro' | string;

export type PaymentMethod = 'pix' | 'dinheiro' | 'cartão' | 'outro';

export type Payment = {
  id: string;
  amount: number;
  date: Date | Timestamp;
  method: PaymentMethod;
  notes?: string;
};

export type ElectricalItem = {
  name: string;
  quantity: number;
  value: number;
};

export type ElectricalServiceItem = {
  id: string;
  name: string;
  defaultValue: number;
  userId: string;
};

export type HydraulicItem = {
  name: string;
  quantity: number;
  value: number;
};

export type HydraulicServiceItem = {
  id: string;
  name: string;
  defaultValue: number;
  userId: string;
};

export type PaintingServiceItem = {
  id: string;
  name: string;
  defaultValue: number;
  userId: string;
};

export type ServiceTypeItem = {
  id: string;
  name: string;
  userId: string;
};

export type PaintingRoomType = 'completo' | 'paredes' | 'teto';

export type PaintingRoom = {
  name: string;
  type: PaintingRoomType;
  wallPerimeter?: number;
  wallHeight?: number;
  ceilingWidth?: number;
  ceilingLength?: number;
  deductionsArea?: number;
  calculatedArea: number;
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
  profit?: number; // Represents labor cost
  status: BudgetStatus;
  userId: string;
  paymentHistory?: Payment[];
  // Legacy Painting fields
  wallWidth?: number;
  wallHeight?: number;
  // New Painting fields
  paintingRooms?: PaintingRoom[];
  sqMetersPrice?: number;
  paintCoats?: number;
  electricalItems?: ElectricalItem[];
  hydraulicItems?: HydraulicItem[];
  serviceItems?: ElectricalItem[]; // Generic items for other services
  materialItems?: ElectricalItem[]; // List of materials
  includeMaterialList?: boolean;
  issueInvoice?: boolean;
  invoiceTaxRate?: number;
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
  cpf?: string;
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
