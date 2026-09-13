'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Budget, BudgetStatus } from '@/lib/types';
import { parseDate } from '@/lib/utils';
import {
  Calendar,
  DollarSign,
  ArrowUpRight,
  Search,
  PlusCircle,
  TrendingUp,
  Boxes,
  FileText,
} from 'lucide-react';

const statusStyles: Record<BudgetStatus, string> = {
  prospecção: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-700',
  ativo: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  concluído: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700',
  cancelado: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-300 dark:border-red-700',
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export type MonthData = {
  monthIndex: number;
  monthName: string;
  year: number;
};

type MonthBudgetsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthData: MonthData | null;
  budgets: Budget[];
};

export function MonthBudgetsDialog({
  open,
  onOpenChange,
  monthData,
  budgets,
}: MonthBudgetsDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const summary = useMemo(() => {
    let total = 0;
    let profit = 0;
    let material = 0;

    for (const b of budgets) {
      total += b.total || 0;
      profit += b.profit || 0;
      material += b.materialCost || 0;
    }

    return {
      count: budgets.length,
      total,
      profit,
      material,
    };
  }, [budgets]);

  const filteredBudgets = useMemo(() => {
    if (!searchTerm.trim()) return budgets;
    const term = searchTerm.toLowerCase();

    return budgets.filter((b) => {
      const clientMatch = (b.clientName || '').toLowerCase().includes(term);
      const taskMatch = (b.task || '').toLowerCase().includes(term);
      const serviceMatch = (b.serviceType || '').toLowerCase().includes(term);
      const statusMatch = (b.status || '').toLowerCase().includes(term);
      return clientMatch || taskMatch || serviceMatch || statusMatch;
    });
  }, [budgets, searchTerm]);

  if (!monthData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between gap-4 pr-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold capitalize">
                  Orçamentos de {monthData.monthName} de {monthData.year}
                </DialogTitle>
                <DialogDescription>
                  {summary.count === 1
                    ? '1 orçamento encontrado neste mês'
                    : `${summary.count} orçamentos encontrados neste mês`}
                </DialogDescription>
              </div>
            </div>
            <Button size="sm" asChild>
              <Link href="/orcamentos/novo">
                <PlusCircle className="mr-1.5 h-4 w-4" />
                Novo Orçamento
              </Link>
            </Button>
          </div>
        </DialogHeader>

        {/* Resumo Financeiro do Mês */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-2">
          <div className="p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <FileText className="h-3.5 w-3.5" />
              Qtd. Orçamentos
            </div>
            <p className="text-lg font-bold">{summary.count}</p>
          </div>

          <div className="p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <DollarSign className="h-3.5 w-3.5 text-blue-500" />
              Total Geral
            </div>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(summary.total)}
            </p>
          </div>

          <div className="p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-green-500" />
              Ganho Real
            </div>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(summary.profit)}
            </p>
          </div>

          <div className="p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Boxes className="h-3.5 w-3.5 text-amber-500" />
              Material
            </div>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(summary.material)}
            </p>
          </div>
        </div>

        {/* Busca rápida */}
        {budgets.length > 0 && (
          <div className="relative my-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, tarefa ou serviço..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* Tabela de Orçamentos com Scroll */}
        <div className="flex-1 min-h-0 border rounded-md overflow-hidden">
          <ScrollArea className="h-[340px] w-full">
            {filteredBudgets.length > 0 ? (
              <Table>
                <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10">
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Serviço / Tarefa</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="w-[100px] text-center">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBudgets.map((budget) => {
                    const dateObj = parseDate(budget.registrationDate);
                    const formattedDate = dateObj
                      ? format(dateObj, 'dd/MM/yyyy')
                      : '-';

                    return (
                      <TableRow key={budget.id} className="hover:bg-muted/50">
                        <TableCell className="font-semibold text-foreground">
                          {budget.clientName || 'Cliente não informado'}
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate text-muted-foreground">
                          <div>
                            <span className="text-foreground text-sm font-medium">
                              {budget.task || 'Sem descrição'}
                            </span>
                            {budget.serviceType && (
                              <span className="block text-xs text-muted-foreground">
                                {budget.serviceType}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formattedDate}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`capitalize ${
                              statusStyles[budget.status] || ''
                            }`}
                          >
                            {budget.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold whitespace-nowrap">
                          {formatCurrency(budget.total || 0)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button size="sm" variant="ghost" className="h-8 px-2" asChild>
                            <Link href={`/orcamentos/${budget.id}`}>
                              <span className="text-xs mr-1">Ver</span>
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <h3 className="font-semibold text-base mb-1">
                  {budgets.length === 0
                    ? `Nenhum orçamento em ${monthData.monthName} de ${monthData.year}`
                    : 'Nenhum orçamento corresponde à busca'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-4">
                  {budgets.length === 0
                    ? 'Você ainda não registrou orçamentos neste mês.'
                    : 'Tente buscar com outros termos.'}
                </p>
                {budgets.length === 0 && (
                  <Button size="sm" asChild>
                    <Link href="/orcamentos/novo">
                      <PlusCircle className="mr-1.5 h-4 w-4" />
                      Criar Orçamento
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
