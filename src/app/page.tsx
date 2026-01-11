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
import { CalendarIcon, PlusCircle } from 'lucide-react';
import { ReportsTab } from '@/components/app/dashboard/reports-tab';
import { StatusDistributionChart } from '@/components/app/dashboard/status-distribution-chart';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { Budget } from '@/lib/types';
import { collection, query, Timestamp } from 'firebase/firestore';
import { useState, useMemo } from 'react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';


export default function DashboardPage() {
  const { firestore, user } = useFirebase();
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  const budgetsQuery = useMemoFirebase(
    () =>
      user && firestore
        ? query(collection(firestore, 'users', user.uid, 'budgets'))
        : null,
    [firestore, user]
  );

  const { data: allBudgets } = useCollection<Budget>(budgetsQuery);

  const filteredBudgets = useMemo(() => {
    if (!allBudgets) return [];
    if (!date?.from) return allBudgets; // Return all if no start date

    const from = date.from;
    const to = date.to || from; // If no 'to', use 'from'

    return allBudgets.filter((budget) => {
      if (!budget.registrationDate) return false;
      const registrationDate = (budget.registrationDate as Timestamp).toDate();
      return registrationDate >= from && registrationDate <= addDays(to, 1); // include the end day
    });
  }, [allBudgets, date]);

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Painel
        </h1>
        <div className="flex items-center space-x-2">
           <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={'outline'}
                className={cn(
                  'w-[260px] justify-start text-left font-normal',
                  !date && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, 'LLL dd, y', { locale: ptBR })} -{' '}
                      {format(date.to, 'LLL dd, y', { locale: ptBR })}
                    </>
                  ) : (
                    format(date.from, 'LLL dd, y', { locale: ptBR })
                  )
                ) : (
                  <span>Escolha um período</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
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
                  Visão geral dos seus orçamentos no período selecionado.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Overview budgets={filteredBudgets} dateRange={date} />
              </CardContent>
            </Card>
            <Card className="col-span-4 lg:col-span-3">
              <CardHeader>
                <CardTitle>Orçamentos Recentes</CardTitle>
                <CardDescription>
                    {`Você tem ${
                        filteredBudgets?.length || 0
                      } orçamentos para o período selecionado.`}
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
