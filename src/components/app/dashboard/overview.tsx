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
import { parseDate } from '@/lib/utils';

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
  onMonthClick?: (monthIndex: number, monthName: string) => void;
};

export function Overview({ budgets, year, onMonthClick }: OverviewProps) {
  const chartData = useMemo(() => {
    if (!budgets) return [];

    const monthlyTotals = Array.from({ length: 12 }, (_, i) => ({
      monthIndex: i,
      name: format(new Date(2024, i, 1), 'MMM', { locale: ptBR }),
      fullName: format(new Date(2024, i, 1), 'MMMM', { locale: ptBR }),
      profit: 0,
      material: 0,
      total: 0,
      count: 0,
    }));

    const yearToFilter =
      year && year !== 'all' ? parseInt(year, 10) : new Date().getFullYear();

    for (const budget of budgets) {
      const date = parseDate(budget.registrationDate);
      if (date && date.getFullYear() === yearToFilter) {
        const month = date.getMonth();
        monthlyTotals[month].profit += budget.profit || 0;
        monthlyTotals[month].material += budget.materialCost || 0;
        monthlyTotals[month].total += budget.total || 0;
        monthlyTotals[month].count += 1;
      }
    }

    return monthlyTotals;
  }, [budgets, year]);

  const handleBarClick = (data: any) => {
    if (!onMonthClick) return;
    if (data && typeof data.monthIndex === 'number') {
      onMonthClick(data.monthIndex, data.fullName);
    }
  };

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={chartData}
          onClick={(state: any) => {
            if (!onMonthClick) return;
            if (state && typeof state.activeTooltipIndex === 'number') {
              const item = chartData[state.activeTooltipIndex];
              if (item) {
                onMonthClick(item.monthIndex, item.fullName);
              }
            } else if (state?.activePayload && state.activePayload.length > 0) {
              const payloadData = state.activePayload[0]?.payload;
              if (payloadData && typeof payloadData.monthIndex === 'number') {
                onMonthClick(payloadData.monthIndex, payloadData.fullName);
              }
            }
          }}
          className="cursor-pointer"
        >
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
            cursor={{ fill: 'rgba(255, 255, 255, 0.06)' }}
            content={
              <ChartTooltipContent
                indicator="dot"
                labelFormatter={(label, payload) => {
                  const item = payload?.[0]?.payload;
                  return (
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold capitalize">
                        {item?.fullName || label}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        (Clique para detalhar)
                      </span>
                    </div>
                  );
                }}
              />
            }
          />
          <Bar
            dataKey="profit"
            fill="var(--color-profit)"
            radius={[0, 0, 0, 0]}
            stackId="a"
            cursor="pointer"
            onClick={handleBarClick}
          />
          <Bar
            dataKey="material"
            fill="var(--color-material)"
            radius={[4, 4, 0, 0]}
            stackId="a"
            cursor="pointer"
            onClick={handleBarClick}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
