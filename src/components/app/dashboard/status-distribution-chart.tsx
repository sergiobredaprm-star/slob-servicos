'use client';

import * as React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Budget, BudgetStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const chartConfig = {
  ativo: {
    label: 'Ativo',
    color: 'hsl(var(--chart-2))',
  },
  concluído: {
    label: 'Concluído',
    color: 'hsl(var(--chart-1))',
  },
  cancelado: {
    label: 'Cancelado',
    color: 'hsl(var(--chart-3))',
  },
} satisfies ChartConfig;

export function StatusDistributionChart() {
  const { firestore, user } = useFirebase();

  const budgetsQuery = useMemoFirebase(
    () =>
      user && firestore
        ? query(collection(firestore, 'users', user.uid, 'budgets'))
        : null,
    [firestore, user]
  );

  const { data: budgets, isLoading } = useCollection<Budget>(budgetsQuery);

  const statusData = React.useMemo(() => {
    if (!budgets) return [];
    
    const counts: { [key in BudgetStatus]: number } = {
      ativo: 0,
      concluído: 0,
      cancelado: 0,
    };

    budgets.forEach((budget) => {
      if (budget.status in counts) {
        counts[budget.status]++;
      }
    });

    return Object.entries(counts).map(([status, count]) => ({
      name: status,
      value: count,
      fill: chartConfig[status as BudgetStatus]?.color,
    }));
  }, [budgets]);

  if (isLoading) {
      return <div>Carregando análise...</div>;
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição por Status</CardTitle>
        <CardDescription>
          Uma visão geral de como seus orçamentos estão distribuídos por status.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Tooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                labelLine={false}
                label={({
                  cx,
                  cy,
                  midAngle,
                  innerRadius,
                  outerRadius,
                  value,
                  index,
                }) => {
                  const RADIAN = Math.PI / 180;
                  const radius =
                    25 + innerRadius + (outerRadius - innerRadius);
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);

                  return (
                    <text
                      x={x}
                      y={y}
                      fill="currentColor"
                      textAnchor={x > cx ? 'start' : 'end'}
                      dominantBaseline="central"
                      className="fill-foreground text-sm"
                    >
                      {statusData[index].name} ({value})
                    </text>
                  );
                }}
              >
                {statusData.map((entry) => (
                  <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
