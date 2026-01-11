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
import { collection, query, Timestamp } from 'firebase/firestore';
import { useMemo } from 'react';

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

  // For this example, we'll just use all budgets for the charts and stats.
  // In a real app, you'd likely add date range filters.
  const filteredBudgets = allBudgets;

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Painel
        </h1>
        <div className="flex items-center space-x-2">
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
                  Visão geral dos seus orçamentos no último ano.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Overview budgets={filteredBudgets} />
              </CardContent>
            </Card>
            <Card className="col-span-4 lg:col-span-3">
              <CardHeader>
                <CardTitle>Orçamentos Recentes</CardTitle>
                <CardDescription>
                    {`Você tem ${
                        filteredBudgets?.length || 0
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
