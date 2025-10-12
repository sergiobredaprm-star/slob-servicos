'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatsCards } from '@/components/app/dashboard/stats-cards';
import { Overview } from '@/components/app/dashboard/overview';
import { RecentBudgets } from '@/components/app/dashboard/recent-budgets';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { ReportsTab } from '@/components/app/dashboard/reports-tab';
import { StatusDistributionChart } from '@/components/app/dashboard/status-distribution-chart';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { Budget } from '@/lib/types';
import { collection, query }from 'firebase/firestore';
import { useState, useMemo } from 'react';
import { format, getMonth, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function DashboardPage() {
  const { firestore, user } = useFirebase();
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const budgetsQuery = useMemoFirebase(() => 
    user && firestore ? query(collection(firestore, 'users', user.uid, 'budgets')) : null
  , [firestore, user]);

  const { data: allBudgets } = useCollection<Budget>(budgetsQuery);

  const availableMonths = useMemo(() => {
    if (!allBudgets) return [];
    const months = new Set<string>();
    allBudgets.forEach(budget => {
      const date = (budget.registrationDate as any).toDate ? (budget.registrationDate as any).toDate() : new Date(budget.registrationDate);
      const monthKey = `${getYear(date)}-${getMonth(date)}`;
      months.add(monthKey);
    });
    return Array.from(months).map(monthKey => {
      const [year, month] = monthKey.split('-');
      const date = new Date(Number(year), Number(month));
       return {
         value: monthKey,
         label: format(date, 'MMMM yyyy', { locale: ptBR }),
       };
    }).sort((a,b) => b.value.localeCompare(a.value));
  }, [allBudgets]);

  const filteredBudgets = useMemo(() => {
    if (selectedMonth === 'all') {
      return allBudgets;
    }
    return allBudgets?.filter(budget => {
       const date = (budget.registrationDate as any).toDate ? (budget.registrationDate as any).toDate() : new Date(budget.registrationDate);
      const monthKey = `${getYear(date)}-${getMonth(date)}`;
      return monthKey === selectedMonth;
    });
  }, [allBudgets, selectedMonth]);


  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Painel
        </h1>
        <div className="flex items-center space-x-2">
           <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Meses</SelectItem>
              {availableMonths.map(month => (
                <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild>
            <Link href="/orcamentos/novo">
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Orçamento
            </Link>
          </Button>
        </div>
      </div>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <StatsCards budgets={filteredBudgets} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Orçamentos</CardTitle>
                <CardDescription>
                  Visão geral dos seus orçamentos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Overview budgets={allBudgets} selectedMonth={selectedMonth} />
              </CardContent>
            </Card>
            <Card className="col-span-4 lg:col-span-3">
              <CardHeader>
                <CardTitle>Orçamentos Recentes</CardTitle>
                <CardDescription>
                  {selectedMonth === 'all' 
                    ? `Você tem ${filteredBudgets?.length || 0} orçamentos no total.`
                    : `Você tem ${filteredBudgets?.length || 0} orçamentos para o mês selecionado.`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecentBudgets budgets={filteredBudgets} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="analytics" className="space-y-4">
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-7">
              <CardHeader>
                <CardTitle>Analytics</CardTitle>
                <CardDescription>
                  Análise detalhada dos seus orçamentos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StatusDistributionChart budgets={allBudgets} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="reports" className="space-y-4">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
