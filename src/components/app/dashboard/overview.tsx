'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Budget } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMemo } from 'react';

const chartConfig = {
  total: {
    label: 'Total',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

type OverviewProps = {
  budgets: Budget[] | null | undefined;
};

export function Overview({ budgets }: OverviewProps) {

  const chartData = useMemo(() => {
    if (!budgets) return [];

    const monthlyTotals = Array.from({ length: 12 }, (_, i) => ({
      name: format(new Date(0, i), 'MMM', { locale: ptBR }),
      total: 0,
    }));
    
    const currentYear = new Date().getFullYear();

    for (const budget of budgets) {
      if (budget.registrationDate) {
        const registrationDate = (budget.registrationDate as any).toDate ? (budget.registrationDate as any).toDate() : new Date(budget.registrationDate);
        if (registrationDate.getFullYear() === currentYear) {
            const month = registrationDate.getMonth();
            monthlyTotals[month].total += budget.total;
        }
      }
    }

    return monthlyTotals;
  }, [budgets]);


  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData}>
          <XAxis
            dataKey="name"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `R$${value / 1000}k`}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <Bar
            dataKey="total"
            fill="var(--color-total)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
