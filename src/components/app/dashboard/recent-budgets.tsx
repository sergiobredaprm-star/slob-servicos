'use client';
import { Budget } from '@/lib/types';
import { useMemo } from 'react';
import { parseDate } from '@/lib/utils';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

type RecentBudgetsProps = {
  budgets: Budget[] | null | undefined;
};

export function RecentBudgets({ budgets }: RecentBudgetsProps) {
  const sortedBudgets = useMemo(() => {
    if (!budgets) return [];
    return [...budgets]
      .filter(b => b.registrationDate) // Garante que o orçamento tenha data de registro
      .sort((a, b) => {
        const dateA = parseDate(a.registrationDate);
        const dateB = parseDate(b.registrationDate);
        if (dateA && dateB) {
          return dateB.getTime() - dateA.getTime();
        }
        return 0;
      })
      .slice(0, 5);
  }, [budgets]);

  if (!budgets) {
    return <div>Carregando orçamentos...</div>;
  }

  return (
    <div className="space-y-8">
      {sortedBudgets.map((budget) => (
        <div key={budget.id} className="flex items-center">
          <div className="space-y-1">
            <p className="text-sm font-medium leading-none">
              {budget.clientName}
            </p>
            <p className="text-sm text-muted-foreground">{budget.task}</p>
          </div>
          <div className="ml-auto font-medium">
            {formatCurrency(budget.total)}
          </div>
        </div>
      ))}
      {sortedBudgets.length === 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Nenhum orçamento recente para exibir.
        </p>
      )}
    </div>
  );
}
