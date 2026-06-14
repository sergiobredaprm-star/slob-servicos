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
import { PlusCircle, Calendar } from 'lucide-react';
import { ReportsTab } from '@/components/app/dashboard/reports-tab';
import { StatusDistributionChart } from '@/components/app/dashboard/status-distribution-chart';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { Budget } from '@/lib/types';
import { collection, query, Timestamp } from 'firebase/firestore';
import { useMemo, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { parseDate } from '@/lib/utils';

export default function DashboardPage() {
  const { firestore, user } = useFirebase();

  const budgetsQuery = useMemoFirebase(
    () =>
      user && firestore
        ? query(collection(firestore, 'users', user.uid, 'budgets'))
        : null,
    [firestore, user]
  );

  const { data: allBudgets } = useCollection<Budget>(budgetsQuery);

  const [selectedYear, setSelectedYear] = useState<string>('all');

  const years = useMemo(() => {
    if (!allBudgets) return [];
    const yearsSet = new Set<number>();
    allBudgets.forEach((budget) => {
      const date = parseDate(budget.registrationDate);
      if (date) {
        yearsSet.add(date.getFullYear());
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [allBudgets]);

  const filteredBudgets = useMemo(() => {
    if (!allBudgets) return null;
    if (selectedYear === 'all') return allBudgets;
    return allBudgets.filter((budget) => {
      const date = parseDate(budget.registrationDate);
      return date ? date.getFullYear().toString() === selectedYear : false;
    });
  }, [allBudgets, selectedYear]);


  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Painel de orçamentos
        </h1>
        <div className="flex items-center space-x-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[130px] bg-slate-900 border-slate-800 text-white">
              <Calendar className="mr-2 h-4 w-4 text-cyan-400" />
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-white">
              <SelectItem value="all">Todos</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
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
                  {selectedYear === 'all' 
                    ? `Visão geral dos seus orçamentos no ano de ${new Date().getFullYear()}.` 
                    : `Visão geral dos seus orçamentos em ${selectedYear}.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Overview budgets={filteredBudgets} year={selectedYear} />
              </CardContent>
            </Card>
            <Card className="col-span-4 lg:col-span-3">
              <CardHeader>
                <CardTitle>Orçamentos Recentes</CardTitle>
                <CardDescription>
                  {`Você tem ${filteredBudgets?.length || 0
                    } orçamentos registrados no total.`}
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
            <StatusDistributionChart budgets={filteredBudgets} />
          </div>
        </TabsContent>
        <TabsContent value="reports" className="space-y-4">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
