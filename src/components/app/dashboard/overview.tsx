'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Budget } from '@/lib/types';
import { eachMonthOfInterval, endOfYear, format, startOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const chartConfig = {
  total: {
    label: 'Total',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

export function Overview() {
  const { firestore, user } = useFirebase();

  const budgetsQuery = useMemoFirebase(
    () =>
      user && firestore
        ? query(collection(firestore, 'users', user.uid, 'budgets'))
        : null,
    [firestore, user]
  );

  const { data: budgets } = useCollection<Budget>(budgetsQuery);

  const monthlyTotals = useMemoFirebase(() => {
    const now = new Date();
    const months = eachMonthOfInterval({
      start: startOfYear(now),
      end: endOfYear(now),
    });

    const totals = months.map(month => ({
      month: format(month, 'MMM', { locale: ptBR }),
      total: 0,
    }));

    if (budgets) {
      for (const budget of budgets) {
        if (budget.registrationDate) {
          const registrationDate = (budget.registrationDate as any).toDate ? (budget.registrationDate as any).toDate() : new Date(budget.registrationDate);
          const monthIndex = registrationDate.getMonth();
          if (totals[monthIndex]) {
            totals[monthIndex].total += budget.total;
          }
        }
      }
    }
    
    return totals;
  }, [budgets]);


  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={monthlyTotals}>
          <XAxis
            dataKey="month"
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
