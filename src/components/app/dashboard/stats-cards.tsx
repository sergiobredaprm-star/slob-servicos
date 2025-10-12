'use client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DollarSign, CheckCircle2, Hourglass, XCircle, Search } from 'lucide-react';
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
        totalEmProspeccao: 0,
        totalRecebido: 0,
        totalPendente: 0,
        totalCancelado: 0,
      };
    }

    let totalRecebido = 0;
    let totalPendente = 0;

    const totalOrcado = budgets.reduce((sum, budget) => sum + budget.total, 0);
    
    const totalEmProspeccao = budgets
      .filter((b) => b.status === 'prospecção')
      .reduce((sum, budget) => sum + budget.total, 0);

    const totalCancelado = budgets
      .filter((b) => b.status === 'cancelado')
      .reduce((sum, budget) => sum + budget.total, 0);

    budgets.forEach((budget) => {
      const paidAmount = budget.paymentHistory?.reduce((sum, p) => sum + p.amount, 0) || 0;
      totalRecebido += paidAmount;

      if (budget.status === 'ativo' || budget.status === 'concluído') {
         totalPendente += budget.total - paidAmount;
      }
    });

    return {
      totalOrcado,
      totalEmProspeccao,
      totalRecebido,
      totalPendente,
      totalCancelado,
    };
  }, [budgets]);


  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
          <CardTitle className="text-sm font-medium">Em Prospecção</CardTitle>
          <Search className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(financialSummary.totalEmProspeccao)}
          </div>
          <p className="text-xs text-muted-foreground">
            Aguardando confirmação
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
            Soma de todos os pagamentos
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
            Saldo devedor de orçamentos ativos/concluídos
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
