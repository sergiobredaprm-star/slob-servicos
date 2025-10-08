'use client';

import { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, FileDown, Loader2 } from 'lucide-react';
import { useFirebase } from '@/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { Budget } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BudgetStatus } from '@/lib/types';

const statusStyles: { [key in BudgetStatus]: string } = {
  ativo: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  concluído:
    'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  cancelado: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const WhatsappIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
);


export function ReportsTab() {
  const { firestore, user } = useFirebase();
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [reportData, setReportData] = useState<Budget[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateReport = async () => {
    if (!date?.from || !date?.to || !user || !firestore) return;

    setIsLoading(true);
    setReportData(null);

    const q = query(
      collection(firestore, 'users', user.uid, 'budgets'),
      where('period.from', '>=', Timestamp.fromDate(date.from)),
      where('period.from', '<=', Timestamp.fromDate(date.to))
    );

    try {
      const querySnapshot = await getDocs(q);
      const budgets = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Budget)
      );
      setReportData(budgets);
    } catch (error) {
      console.error('Error generating report:', error);
      // Aqui você pode adicionar um toast de erro
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!reportData || !date?.from || !date.to) return;
    const doc = new jsPDF();

    const periodStr = `Período: ${format(date.from, 'dd/MM/yyyy', { locale: ptBR })} a ${format(date.to, 'dd/MM/yyyy', { locale: ptBR })}`;
    
    doc.setFontSize(18);
    doc.text('Relatório de Orçamentos', 14, 22);
    doc.setFontSize(11);
    doc.text(periodStr, 14, 30);

    const summaryData = [
        ['Total Geral', formatCurrency(grandTotal)],
        ['Concluído', formatCurrency(totalConcluido)],
        ['Ativo', formatCurrency(totalAtivo)],
        ['Cancelado', formatCurrency(totalCancelado)],
    ];
    
    autoTable(doc, {
        startY: 35,
        head: [['Resumo', 'Valor']],
        body: summaryData,
        theme: 'striped',
        headStyles: { fillColor: [38, 109, 168] },
    });

    const tableColumn = ['Cliente', 'Tarefa', 'Status', 'Total'];
    const tableRows = reportData.map((budget) => [
      budget.clientName,
      budget.task,
      budget.status,
      formatCurrency(budget.total),
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid'
    });

    doc.save(`relatorio_orcamentos_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const handleShareWhatsApp = () => {
    if (!reportData || !date?.from || !date.to) return;

    const periodStr = `*Período:* ${format(date.from, 'dd/MM/yyyy', { locale: ptBR })} a ${format(date.to, 'dd/MM/yyyy', { locale: ptBR })}`;
    
    let message = `*Resumo do Relatório de Orçamentos*\n\n`;
    message += `${periodStr}\n\n`;
    message += `*Total Geral:* ${formatCurrency(grandTotal)}\n`;
    message += `*Concluído:* ${formatCurrency(totalConcluido)}\n`;
    message += `*Ativo:* ${formatCurrency(totalAtivo)}\n`;
    message += `*Cancelado:* ${formatCurrency(totalCancelado)}\n\n`;
    message += `_Este é um resumo automático gerado pelo OrçaDiária._`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };


  const totalAtivo =
    reportData
      ?.filter((b) => b.status === 'ativo')
      .reduce((sum, b) => sum + b.total, 0) || 0;
  const totalConcluido =
    reportData
      ?.filter((b) => b.status === 'concluído')
      .reduce((sum, b) => sum + b.total, 0) || 0;
  const totalCancelado =
    reportData
      ?.filter((b) => b.status === 'cancelado')
      .reduce((sum, b) => sum + b.total, 0) || 0;
  const grandTotal = totalAtivo + totalConcluido + totalCancelado;

  return (
    <Card className="col-span-7">
      <CardHeader>
        <CardTitle>Relatórios</CardTitle>
        <CardDescription>
          Gere relatórios customizados dos seus orçamentos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={'outline'}
                className={cn(
                  'w-[300px] justify-start text-left font-normal',
                  !date && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, 'LLL dd, y', { locale: ptBR })} -{' '}
                      {format(date.to, 'LLL dd, y', { locale: ptBR })}
                    </>
                  ) : (
                    format(date.from, 'LLL dd, y', { locale: ptBR })
                  )
                ) : (
                  <span>Escolha um período</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
          <Button onClick={handleGenerateReport} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Gerar Relatório
          </Button>
        </div>

        {isLoading && <p>Gerando relatório...</p>}

        {reportData && (
          <div className="space-y-4 pt-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Resultados do Relatório</h3>
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                        <FileDown className="mr-2 h-4 w-4" />
                        Exportar / Compartilhar
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onClick={handleExportPDF}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Exportar para PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleShareWhatsApp}>
                        <WhatsappIcon className="mr-2 h-4 w-4" />
                        Compartilhar no WhatsApp
                    </DropdownMenuItem>
                </DropdownMenuContent>
               </DropdownMenu>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Geral
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {formatCurrency(grandTotal)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Concluído
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {formatCurrency(totalConcluido)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Ativo</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {formatCurrency(totalAtivo)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Cancelado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {formatCurrency(totalCancelado)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tarefa</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.length > 0 ? (
                  reportData.map((budget) => (
                    <TableRow key={budget.id}>
                      <TableCell className="font-medium">
                        {budget.clientName}
                      </TableCell>
                      <TableCell>{budget.task}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`capitalize ${statusStyles[budget.status]}`}
                        >
                          {budget.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(budget.total)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      Nenhum orçamento encontrado para este período.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
