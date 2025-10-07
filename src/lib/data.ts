import { Budget, DailyRateSettings } from '@/lib/types';

export const budgets: Budget[] = [];

export const settings: DailyRateSettings = {
  startTime: '08:00',
  endTime: '17:00',
  workload: 8,
  defaultRate: 150,
};

export const financialSummary = {
  totalOrcado: budgets.reduce((sum, budget) => sum + budget.total, 0),
  totalRecebido: budgets
    .filter((b) => b.status === 'concluído')
    .reduce((sum, budget) => sum + budget.total, 0),
  totalPendente: budgets
    .filter((b) => b.status === 'ativo')
    .reduce((sum, budget) => sum + budget.total, 0),
  totalCancelado: budgets
    .filter((b) => b.status === 'cancelado')
    .reduce((sum, budget) => sum + budget.total, 0),
};
