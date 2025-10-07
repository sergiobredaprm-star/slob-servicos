import { Timestamp } from 'firebase/firestore';

export type BudgetStatus = 'ativo' | 'concluído' | 'cancelado';

export type Budget = {
  id?: string;
  clientName: string;
  clientDescription?: string;
  task: string;
  dailyRate: number;
  period: {
    from: Date | Timestamp;
    to: Date | Timestamp;
  };
  total: number;
  status: BudgetStatus;
  userId: string;
};

export type DailyRateSettings = {
  startTime: string;
  endTime: string;
  workload: number;
  defaultRate: number;
};
