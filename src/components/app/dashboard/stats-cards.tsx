'use client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DollarSign, CheckCircle2, Hourglass, XCircle } from 'lucide-react';
import { useMemo } from 'react';
import { Budget } from '@/lib/types';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

type StatsCardsProps = {
  budgets: Budget[] | null | undefined;
};

export function StatsCards({ budgets }: StatsCardsProps) {
  const financialSummary = useMemo(() => {
    if (!budgets) {
      return {
        totalOrcado: 0,
        totalRecebido: 0,
        totalPendente: 0,
        totalCancelado: 0,
      };
    }
    return {
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
  }, [budgets]);


  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Orçado</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(financialSummary.totalOrcado)}
          </div>
          <p className="text-xs text-muted-foreground">
            Soma de todos os orçamentos
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(financialSummary.totalRecebido)}
          </div>
          <p className="text-xs text-muted-foreground">
            Orçamentos concluídos
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pendente</CardTitle>
          <Hourglass className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(financialSummary.totalPendente)}
          </div>
          <p className="text-xs text-muted-foreground">
            Orçamentos ativos
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cancelado</CardTitle>
          <XCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(financialSummary.totalCancelado)}
          </div>
          <p className="text-xs text-muted-foreground">
            Orçamentos cancelados
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
