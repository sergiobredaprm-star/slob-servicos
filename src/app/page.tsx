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

export default function DashboardPage() {
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
          <TabsTrigger value="analytics" disabled>
            Analytics
          </TabsTrigger>
          <TabsTrigger value="reports" disabled>
            Relatórios
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <StatsCards />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Orçamentos Recentes</CardTitle>
                <CardDescription>
                  Visão geral dos seus orçamentos mais recentes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Overview />
              </CardContent>
            </Card>
            <Card className="col-span-4 lg:col-span-3">
              <CardHeader>
                <CardTitle>Lista de Orçamentos</CardTitle>
                <CardDescription>
                  Você tem 12 orçamentos este mês.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecentBudgets />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
