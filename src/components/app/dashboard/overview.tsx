'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Budget } from '@/lib/types';
import { eachDayOfInterval, eachMonthOfInterval, endOfMonth, endOfYear, format, getMonth, getYear, startOfMonth, startOfYear } from 'date-fns';
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
  selectedMonth: string;
};

export function Overview({ budgets, selectedMonth }: OverviewProps) {

  const chartData = useMemo(() => {
    if (!budgets) return [];

    if (selectedMonth === 'all') {
      const now = new Date();
      const months = eachMonthOfInterval({
        start: startOfYear(now),
        end: endOfYear(now),
      });

      const totals = months.map(month => ({
        name: format(month, 'MMM', { locale: ptBR }),
        total: 0,
      }));

      for (const budget of budgets) {
        if (budget.registrationDate) {
          const registrationDate = (budget.registrationDate as any).toDate ? (budget.registrationDate as any).toDate() : new Date(budget.registrationDate);
          const monthIndex = registrationDate.getMonth();
          if (totals[monthIndex] && getYear(registrationDate) === getYear(now)) {
            totals[monthIndex].total += budget.total;
          }
        }
      }
      return totals;

    } else {
      const [year, month] = selectedMonth.split('-');
      const monthDate = new Date(Number(year), Number(month));
      const daysInMonth = eachDayOfInterval({
        start: startOfMonth(monthDate),
        end: endOfMonth(monthDate),
      });

      const dailyTotals = daysInMonth.map(day => ({
        name: format(day, 'd'),
        total: 0,
      }));

      for (const budget of budgets) {
        if (budget.registrationDate) {
          const registrationDate = (budget.registrationDate as any).toDate ? (budget.registrationDate as any).toDate() : new Date(budget.registrationDate);
          const budgetMonthKey = `${getYear(registrationDate)}-${getMonth(registrationDate)}`;
          if (budgetMonthKey === selectedMonth) {
            const dayIndex = registrationDate.getDate() - 1;
            if (dailyTotals[dayIndex]) {
              dailyTotals[dayIndex].total += budget.total;
            }
          }
        }
      }
       return dailyTotals;
    }
  }, [budgets, selectedMonth]);


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
            label={selectedMonth !== 'all' ? { value: format(new Date(selectedMonth.split('-')[0], selectedMonth.split('-')[1]), 'MMMM', { locale: ptBR }), position: 'insideBottom', offset: -5 } : undefined}
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
