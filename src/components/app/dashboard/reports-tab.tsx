'use client';

import { useState, useEffect, useMemo } from 'react';
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
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, FileDown, Loader2, User, Activity } from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { Budget, CompanyProfile, Client, BudgetStatus } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getCompanyProfile } from '@/lib/firebase/company-services';

const statusStyles: { [key in BudgetStatus]: string } = {
  prospecção: 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300',
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
  
  const [filterClientId, setFilterClientId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const [reportData, setReportData] = useState<Budget[] | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch clients for the filter
  const clientsQuery = useMemoFirebase(() =>
    user && firestore ? query(collection(firestore, 'users', user.uid, 'clients')) : null
  , [firestore, user]);
  
  const { data: clients } = useCollection<Client>(clientsQuery);

  useEffect(() => {
    async function fetchCompanyProfile() {
      if (user && firestore) {
        const profile = await getCompanyProfile(firestore, user.uid);
        if (profile) {
          setCompanyProfile(profile);
        }
      }
    }
    fetchCompanyProfile();
  }, [user, firestore]);

  const handleGenerateReport = async () => {
    if (!date?.from || !date?.to || !user || !firestore) return;

    setIsLoading(true);
    setReportData(null);

    const q = query(
      collection(firestore, 'users', user.uid, 'budgets'),
      where('registrationDate', '>=', Timestamp.fromDate(date.from)),
      where('registrationDate', '<=', Timestamp.fromDate(date.to))
    );

    try {
      const querySnapshot = await getDocs(q);
      const budgets = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Budget)
      );
      setReportData(budgets);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    if (!reportData) return [];
    return reportData.filter(budget => {
      const clientMatch = filterClientId === 'all' || budget.clientId === filterClientId;
      const statusMatch = filterStatus === 'all' || budget.status === filterStatus;
      return clientMatch && statusMatch;
    });
  }, [reportData, filterClientId, filterStatus]);

  const totalProspeccao = filteredData
      .filter((b) => b.status === 'prospecção')
      .reduce((sum, b) => sum + b.total, 0);
  const totalAtivo = filteredData
      .filter((b) => b.status === 'ativo')
      .reduce((sum, b) => sum + b.total, 0);
  const totalConcluido = filteredData
      .filter((b) => b.status === 'concluído')
      .reduce((sum, b) => sum + b.total, 0);
  const totalCancelado = filteredData
      .filter((b) => b.status === 'cancelado')
      .reduce((sum, b) => sum + b.total, 0);
  
  const totalProfit = filteredData.reduce((sum, b) => sum + (b.profit || 0), 0);
  const totalMaterial = filteredData.reduce((sum, b) => sum + (b.materialCost || 0), 0);
  const grandTotal = filteredData.reduce((sum, b) => sum + b.total, 0);

  const handleExportPDF = () => {
    if (filteredData.length === 0 || !date?.from || !date.to) return;
    const doc = new jsPDF();
    let startY = 22;

    doc.setFontSize(18);
    doc.text('Relatório de Orçamentos', 14, startY);
    startY += 8;

    if (companyProfile) {
        doc.setFontSize(11);
        doc.text(`${companyProfile.companyName || ''}${companyProfile.companyTaxId ? ` - CNPJ: ${companyProfile.companyTaxId}` : ''}`, 14, startY);
        startY += 6;
    }
    
    const periodStr = `Período: ${format(date.from, 'dd/MM/yyyy', { locale: ptBR })} a ${format(date.to, 'dd/MM/yyyy', { locale: ptBR })}`;
    doc.setFontSize(11);
    doc.text(periodStr, 14, startY);
    startY += 10;

    const summaryData = [
        ['Receita Bruta', formatCurrency(grandTotal)],
        ['Ganho Real (Mão de Obra)', formatCurrency(totalProfit)],
        ['Custo com Material', formatCurrency(totalMaterial)],
        ['---', '---'],
        ['Concluído', formatCurrency(totalConcluido)],
        ['Ativo', formatCurrency(totalAtivo)],
        ['Prospecção', formatCurrency(totalProspeccao)],
        ['Cancelado', formatCurrency(totalCancelado)],
    ];
    
    autoTable(doc, {
        startY: startY,
        head: [['Resumo', 'Valor']],
        body: summaryData,
        theme: 'striped',
        headStyles: { fillColor: [38, 109, 168] },
    });
    
    startY = (doc as any).lastAutoTable.finalY + 10;

    const tableColumn = ['Cliente', 'Tarefa', 'Status', 'Rec. Bruta', 'G. Real', 'Material'];
    const tableRows = filteredData.map((budget) => [
      budget.clientName,
      budget.task,
      budget.status,
      formatCurrency(budget.total),
      formatCurrency(budget.profit || 0),
      formatCurrency(budget.materialCost || 0),
    ]);

    autoTable(doc, {
      startY: startY,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid'
    });

    doc.save(`relatorio_orcamentos_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const handleShareWhatsApp = (statusFilter?: BudgetStatus) => {
    if (filteredData.length === 0 || !date?.from || !date.to) return;

    let message = `*Relatório de Orçamentos - ${companyProfile?.companyName || 'SLOB_SERVIÇOS'}*\n`;
    if (companyProfile?.companyTaxId) {
        message += `*CNPJ:* ${companyProfile.companyTaxId}\n`;
    }
    message += '\n';
    
    const periodStr = `*Período:* ${format(date.from, 'dd/MM/yyyy', { locale: ptBR })} a ${format(date.to, 'dd/MM/yyyy', { locale: ptBR })}`;
    message += `${periodStr}\n`;

    if (filterClientId !== 'all') {
        const clientName = clients?.find(c => c.id === filterClientId)?.name;
        message += `*Cliente:* ${clientName}\n`;
    }
    message += '\n';

    message += `*Resumo Financeiro*\n`;
    message += `*Receita Bruta:* ${formatCurrency(grandTotal)}\n`;
    message += `*Ganho Real (Mão de Obra):* ${formatCurrency(totalProfit)}\n`;
    message += `*Custo com Material:* ${formatCurrency(totalMaterial)}\n\n`;
    
    message += `*Por Status*\n`;
    message += `*Concluído:* ${formatCurrency(totalConcluido)}\n`;
    message += `*Ativo:* ${formatCurrency(totalAtivo)}\n`;
    message += `*Prospecção:* ${formatCurrency(totalProspeccao)}\n`;
    message += `*Cancelado:* ${formatCurrency(totalCancelado)}\n`;
    
    const displayData = statusFilter ? filteredData.filter(b => b.status === statusFilter) : filteredData;

    if (displayData.length > 0) {
        message += `\n*Lista de Serviços:*\n`;
        displayData.forEach(budget => {
            message += ` • ${budget.task} - ${budget.clientName} (${formatCurrency(budget.total)})\n`;
        });
    }

    message += `\n_Resumo gerado pelo SLOB_SERVIÇOS._`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const allStatus: BudgetStatus[] = ['prospecção', 'ativo', 'concluído', 'cancelado'];

  return (
    <Card className="col-span-7">
      <CardHeader>
        <CardTitle>Relatórios</CardTitle>
        <CardDescription>
          Gere extratos e consolidados customizados para seus clientes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="space-y-2 flex-grow sm:flex-grow-0">
            <label className="text-sm font-medium">Período</label>
            <Popover>
                <PopoverTrigger asChild>
                <Button
                    id="date"
                    variant={'outline'}
                    className={cn(
                    'w-full sm:w-[300px] justify-start text-left font-normal',
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
          </div>

          <div className="space-y-2 flex-grow sm:flex-grow-0">
            <label className="text-sm font-medium flex items-center gap-2"><User className="h-3 w-3" /> Cliente</label>
            <Select value={filterClientId} onValueChange={setFilterClientId}>
                <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {clients?.map(client => (
                        <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 flex-grow sm:flex-grow-0">
            <label className="text-sm font-medium flex items-center gap-2"><Activity className="h-3 w-3" /> Status</label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    {allStatus.map(status => (
                        <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>

          <Button onClick={handleGenerateReport} disabled={isLoading} className="w-full md:w-auto">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Gerar Relatório
          </Button>
        </div>

        {reportData && (
          <div className="space-y-4 pt-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Resultados do Relatório</h3>
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={filteredData.length === 0}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Exportar / Compartilhar
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onClick={handleExportPDF}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Exportar para PDF
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <WhatsappIcon className="mr-2 h-4 w-4" />
                        Compartilhar no WhatsApp
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                           <DropdownMenuItem onClick={() => handleShareWhatsApp()}>
                            Relatório Completo
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {allStatus.map(status => (
                            <DropdownMenuItem key={status} onClick={() => handleShareWhatsApp(status as BudgetStatus)}>
                              Somente {status.charAt(0).toUpperCase() + status.slice(1)}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                </DropdownMenuContent>
               </DropdownMenu>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Resumo Financeiro</h4>
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Receita Bruta
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {formatCurrency(grandTotal)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total cobrado (Mão de Obra + Material)</p>
                  </CardContent>
                </Card>
                <Card className="border-green-500/20 bg-green-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">
                      Ganho Real (Mão de Obra)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(totalProfit)}
                    </p>
                    <p className="text-xs text-muted-foreground text-green-600/80 dark:text-green-400/80">Seu lucro líquido estimado</p>
                  </CardContent>
                </Card>
                <Card className="border-orange-500/20 bg-orange-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">
                      Custo com Material
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {formatCurrency(totalMaterial)}
                    </p>
                    <p className="text-xs text-muted-foreground text-orange-600/80 dark:text-orange-400/80">Investimento em materiais</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Resumo por Status</h4>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                      Prospecção
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {formatCurrency(totalProspeccao)}
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
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tarefa</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Rec. Bruta</TableHead>
                  <TableHead className="text-right text-green-600 dark:text-green-400">G. Real</TableHead>
                  <TableHead className="text-right text-orange-600 dark:text-orange-400">Material</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length > 0 ? (
                  filteredData.map((budget) => (
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
                      <TableCell className="text-right text-green-600 dark:text-green-400">
                        {formatCurrency(budget.profit || 0)}
                      </TableCell>
                      <TableCell className="text-right text-orange-600 dark:text-orange-400">
                        {formatCurrency(budget.materialCost || 0)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum orçamento encontrado com os filtros aplicados.
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
