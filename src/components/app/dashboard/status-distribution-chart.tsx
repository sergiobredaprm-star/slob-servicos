'use client';

import * as React from 'react';
import {
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Budget, BudgetStatus } from '@/lib/types';
import { Calendar as CalendarIcon, FileDown, Loader2, User, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const chartConfig = {
  prospecção: {
    label: 'Prospecção',
    color: 'hsl(var(--chart-5))',
  },
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

type StatusDistributionChartProps = {
  budgets: Budget[] | null | undefined;
};

export function StatusDistributionChart({ budgets }: StatusDistributionChartProps) {
  const statusData = React.useMemo(() => {
    if (!budgets) return [];
    
    const counts: { [key in BudgetStatus]: number } = {
      prospecção: 0,
      ativo: 0,
      concluído: 0,
      cancelado: 0,
    };

    budgets.forEach((budget) => {
      if (budget.status in counts) {
        counts[budget.status]++;
      }
    });

    // Reversed order for concentric rings from outer to inner
    const statuses: BudgetStatus[] = ['concluído', 'ativo', 'prospecção', 'cancelado'];

    return statuses.map((status) => ({
      name: chartConfig[status]?.label || status,
      value: counts[status],
      fill: chartConfig[status]?.color,
    })).filter(d => d.value > 0);
  }, [budgets]);

  if (!budgets) {
      return (
        <Card className="col-span-7 bg-slate-950 border-slate-800">
          <CardContent className="flex h-[400px] items-center justify-center">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            >
              <Loader2 className="h-8 w-8 text-cyan-500" />
            </motion.div>
          </CardContent>
        </Card>
      );
  }
  
  const totalBudgets = statusData.reduce((acc, curr) => acc + curr.value, 0);
  
  return (
    <Card className="col-span-7 overflow-hidden border-none bg-slate-950/50 backdrop-blur-xl ring-1 ring-white/10 shadow-2xl shadow-cyan-500/10">
      <CardHeader className="relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-2xl font-black tracking-tighter text-transparent">
              ANÁLISE CENTRAL DE STATUS
            </CardTitle>
            <CardDescription className="text-slate-400 font-mono text-xs uppercase tracking-widest">
              Fluxo de Distribuição em Tempo Real
            </CardDescription>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10 ring-1 ring-cyan-500/20">
            <Activity className="h-5 w-5 text-cyan-400 animate-pulse" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative">
        {/* Futuristic Background Gradients */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -right-24 h-64 w-64 bg-cyan-500/10 blur-[100px]" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 bg-purple-500/10 blur-[100px]" />
        </div>

        {totalBudgets > 0 ? (
          <div className="relative h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart 
                cx="50%" 
                cy="50%" 
                innerRadius="30%" 
                outerRadius="100%" 
                barSize={12} 
                data={statusData}
                startAngle={90}
                endAngle={450}
              >
                <RadialBar
                  label={{ fill: '#94a3b8', position: 'insideStart', fontSize: '10px', fontFamily: 'monospace' }}
                  background={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                  dataKey="value"
                  cornerRadius={10}
                  animationBegin={200}
                  animationDuration={1500}
                  animationEasing="ease-out"
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-white/10 bg-slate-900/90 p-3 shadow-2xl backdrop-blur-md">
                          <p className="font-mono text-[10px] uppercase tracking-tighter text-slate-500">Cluster de Dados</p>
                          <p className="text-sm font-bold text-white">{data.name}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: data.fill }} />
                            <p className="font-mono text-lg font-black text-cyan-400">{data.value}</p>
                            <p className="text-[10px] text-slate-400">Unidades</p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </RadialBarChart>
            </ResponsiveContainer>

            {/* Central HUD */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="flex flex-col items-center justify-center rounded-full bg-slate-900/50 p-8 ring-1 ring-white/10 backdrop-blur-md shadow-inner"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500">Banco de Dados</span>
                <span className="text-5xl font-black tracking-tighter text-white">
                  {totalBudgets}
                </span>
                <span className="font-mono text-[8px] uppercase tracking-widest text-cyan-500/80">Registros Ativos</span>
              </motion.div>
            </div>
          </div>
        ) : (
          <div className="flex h-[300px] flex-col items-center justify-center space-y-4">
            <div className="rounded-full bg-slate-900 p-6 ring-1 ring-white/5">
                <Activity className="h-12 w-12 text-slate-700" />
            </div>
            <p className="font-mono text-xs uppercase tracking-widest text-slate-500 italic">Nenhum dado detectado neste setor.</p>
          </div>
        )}

        {/* Futuristic Status Legend */}
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          <AnimatePresence>
            {statusData.map((status, i) => (
              <motion.div
                key={status.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.1 }}
                className="group relative flex flex-col rounded-lg border border-white/5 bg-white/5 p-3 transition-colors hover:bg-white/10"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-tight text-slate-400">{status.name}</span>
                  <div className="h-1 w-1 rounded-full animate-pulse shadow-[0_0_8px_currentColor]" style={{ color: status.fill, backgroundColor: status.fill }} />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-black text-white">{status.value}</span>
                  <span className="text-[9px] text-slate-500">{(status.value / totalBudgets * 100).toFixed(0)}%</span>
                </div>
                {/* Visual accent bar */}
                <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-cyan-500 transition-all group-hover:w-full" style={{ backgroundColor: status.fill }} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
