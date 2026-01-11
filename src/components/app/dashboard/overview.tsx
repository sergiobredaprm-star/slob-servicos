'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Budget } from '@/lib/types';
import { eachDayOfInterval, format, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMemo } from 'react';
import { DateRange } from 'react-day-picker';

const chartConfig = {
  total: {
    label: 'Total',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

type OverviewProps = {
  budgets: Budget[] | null | undefined;
  dateRange?: DateRange;
};

export function Overview({ budgets, dateRange }: OverviewProps) {

  const chartData = useMemo(() => {
    if (!budgets || !dateRange?.from) return [];

    const from = dateRange.from;
    const to = dateRange.to || from;

    const days = eachDayOfInterval({
        start: from,
        end: to,
    });

    const dailyTotals = days.map(day => ({
        name: format(day, 'd'),
        fullDate: format(day, 'dd/MM'),
        total: 0,
    }));

    for (const budget of budgets) {
        if (budget.registrationDate) {
          const registrationDate = (budget.registrationDate as any).toDate ? (budget.registrationDate as any).toDate() : new Date(budget.registrationDate);
          
          if(registrationDate >= from && registrationDate <= to) {
            const dayIndex = dailyTotals.findIndex(d => d.name === format(registrationDate, 'd') && getYear(registrationDate) === getYear(from) && format(registrationDate, 'M') === format(from, 'M'));
            if (dayIndex !== -1) {
              dailyTotals[dayIndex].total += budget.total;
            }
          }
        }
    }
    return dailyTotals;

  }, [budgets, dateRange]);


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
            content={<ChartTooltipContent 
                indicator="dot" 
                labelKey="fullDate"
                formatter={(value, name, item) => {
                    return (
                        <div className="flex flex-col">
                            <span>{item.payload.fullDate}</span>
                            <span className="font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value as number)}</span>
                        </div>
                    )
                }}
            />}
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
