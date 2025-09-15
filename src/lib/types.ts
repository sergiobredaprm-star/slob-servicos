export type BudgetStatus = "ativo" | "concluído" | "cancelado";

export type Budget = {
  id: string;
  clientName: string;
  task: string;
  total: number;
  status: BudgetStatus;
  email: string;
};

export type DailyRateSettings = {
  startTime: string;
  endTime: string;
  workload: number;
  defaultRate: number;
};
