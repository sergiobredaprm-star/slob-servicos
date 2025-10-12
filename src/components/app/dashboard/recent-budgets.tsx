'use client';
import { Budget } from '@/lib/types';
import { useMemo } from 'react';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

type RecentBudgetsProps = {
  budgets: Budget[] | null | undefined;
};

export function RecentBudgets({ budgets: filteredBudgets }: RecentBudgetsProps) {
  const sortedBudgets = useMemo(() => {
    if (!filteredBudgets) return [];
    return [...filteredBudgets]
      .filter(b => b.registrationDate) // Garante que o orçamento tenha data de registro
      .sort((a, b) => {
        const dateA = (a.registrationDate as any).toDate
          ? (a.registrationDate as any).toDate()
          : new Date(a.registrationDate);
        const dateB = (b.registrationDate as any).toDate
          ? (b.registrationDate as any).toDate()
          : new Date(b.registrationDate);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);
  }, [filteredBudgets]);

  if (!filteredBudgets) {
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
          Nenhum orçamento para o período selecionado.
        </p>
      )}
    </div>
  );
}
