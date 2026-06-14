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
  profit: {
    label: 'Ganho Real',
    color: 'hsl(var(--chart-2))',
  },
  material: {
    label: 'Material',
    color: 'hsl(var(--chart-4))',
  },
} satisfies ChartConfig;

type OverviewProps = {
  budgets: Budget[] | null | undefined;
  year?: string;
};

export function Overview({ budgets, year }: OverviewProps) {

  const chartData = useMemo(() => {
    if (!budgets) return [];

    const monthlyTotals = Array.from({ length: 12 }, (_, i) => ({
      name: format(new Date(0, i), 'MMM', { locale: ptBR }),
      profit: 0,
      material: 0,
    }));
    
    const yearToFilter = year && year !== 'all' ? parseInt(year, 10) : new Date().getFullYear();

    for (const budget of budgets) {
      if (budget.registrationDate) {
        const registrationDate = budget.registrationDate instanceof Date 
          ? budget.registrationDate 
          : (budget.registrationDate as any).toDate 
            ? (budget.registrationDate as any).toDate() 
            : new Date(budget.registrationDate as any);
        if (registrationDate.getFullYear() === yearToFilter) {
            const month = registrationDate.getMonth();
            monthlyTotals[month].profit += budget.profit || 0;
            monthlyTotals[month].material += budget.materialCost || 0;
        }
      }
    }

    return monthlyTotals;
  }, [budgets, year]);


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
            dataKey="profit"
            fill="var(--color-profit)"
            radius={[0, 0, 0, 0]}
            stackId="a"
          />
          <Bar
            dataKey="material"
            fill="var(--color-material)"
            radius={[4, 4, 0, 0]}
            stackId="a"
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
