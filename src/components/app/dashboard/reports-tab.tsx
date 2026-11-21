'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn, parseDate } from '@/lib/utils';
import {
  Calendar as CalendarIcon,
  FileDown,
  Loader2,
  User,
  Activity,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Coins,
  CreditCard,
  QrCode,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  ChevronsUpDown,
  Search,
} from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { Budget, CompanyProfile, Client, BudgetStatus, Payment } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getCompanyProfile } from '@/lib/firebase/company-services';

const statusStyles: { [key in BudgetStatus]: string } = {
  prospecção: 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300',
  ativo: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  concluído: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  cancelado: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (dateValue: any) => {
  const parsed = parseDate(dateValue);
  if (!parsed) return '-';
  return format(parsed, 'dd/MM/yyyy', { locale: ptBR });
};

const getPaymentMethodIcon = (method?: string) => {
  switch (method?.toLowerCase()) {
    case 'pix':
      return <QrCode className="h-3.5 w-3.5 text-primary" />;
    case 'dinheiro':
      return <Coins className="h-3.5 w-3.5 text-emerald-500" />;
    case 'cartão':
    case 'cartao':
      return <CreditCard className="h-3.5 w-3.5 text-blue-500" />;
    default:
      return <Wallet className="h-3.5 w-3.5 text-orange-500" />;
  }
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
  const router = useRouter();
  const { firestore, user } = useFirebase();

  // Filtros
  const [useDateFilter, setUseDateFilter] = useState<boolean>(false);
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -90),
    to: new Date(),
  });
  const [filterClientId, setFilterClientId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('ativos_concluidos');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [reportData, setReportData] = useState<Budget[] | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedBudgets, setExpandedBudgets] = useState<Record<string, boolean>>({});

  // Lista de clientes
  const clientsQuery = useMemoFirebase(
    () => (user && firestore ? query(collection(firestore, 'users', user.uid, 'clients')) : null),
    [firestore, user]
  );
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

  // Consulta de dados
  const handleGenerateReport = async () => {
    if (!user || !firestore) return;

    setIsLoading(true);
    setReportData(null);
    setExpandedBudgets({});

    try {
      let q;
      if (useDateFilter && date?.from && date?.to) {
        q = query(
          collection(firestore, 'users', user.uid, 'budgets'),
          where('registrationDate', '>=', Timestamp.fromDate(date.from)),
          where('registrationDate', '<=', Timestamp.fromDate(date.to))
        );
      } else {
        q = query(collection(firestore, 'users', user.uid, 'budgets'));
      }

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

  // Filtragem dos dados carregados
  const filteredData = useMemo(() => {
    if (!reportData) return [];
    const term = searchTerm.toLowerCase().trim();

    return reportData.filter((budget) => {
      // Filtro de Cliente
      const clientMatch = filterClientId === 'all' || budget.clientId === filterClientId;

      // Filtro de Status do Serviço
      let statusMatch = true;
      if (filterStatus === 'ativos_concluidos') {
        statusMatch = budget.status === 'ativo' || budget.status === 'concluído';
      } else if (filterStatus !== 'all') {
        statusMatch = budget.status === filterStatus;
      }

      // Filtro de Situação de Pagamento
      const payments = budget.paymentHistory || [];
      const totalPaid = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
      const remaining = Math.max(0, budget.total - totalPaid);

      let paymentMatch = true;
      if (filterPayment === 'pendente') {
        paymentMatch = remaining > 0.01;
      } else if (filterPayment === 'quitado') {
        paymentMatch = remaining <= 0.01 && budget.total > 0;
      } else if (filterPayment === 'com_pagamento') {
        paymentMatch = totalPaid > 0;
      }

      // Filtro de Busca por Texto / Lançamento / Pagamento
      let searchMatch = true;
      if (term) {
        const matchesBudget =
          budget.clientName?.toLowerCase().includes(term) ||
          budget.task?.toLowerCase().includes(term) ||
          budget.serviceType?.toLowerCase().includes(term) ||
          formatCurrency(budget.total).toLowerCase().includes(term) ||
          formatCurrency(totalPaid).toLowerCase().includes(term) ||
          formatCurrency(remaining).toLowerCase().includes(term);

        // Busca também dentro dos lançamentos de pagamentos (observação, forma, valor, data)
        const matchesPayments = payments.some((p) => {
          const notesMatch = p.notes?.toLowerCase().includes(term);
          const methodMatch = p.method?.toLowerCase().includes(term);
          const amountMatch = formatCurrency(p.amount).toLowerCase().includes(term);
          let dateStr = '';
          try {
            const dateObj = parseDate(p.date);
            if (dateObj) dateStr = format(dateObj, 'dd/MM/yyyy');
          } catch {}
          const dateMatch = dateStr.includes(term);
          return Boolean(notesMatch || methodMatch || amountMatch || dateMatch);
        });

        searchMatch = Boolean(matchesBudget || matchesPayments);
      }

      return clientMatch && statusMatch && paymentMatch && searchMatch;
    });
  }, [reportData, filterClientId, filterStatus, filterPayment, searchTerm]);

  // Totais consolidados
  const totals = useMemo(() => {
    let grandTotal = 0;
    let totalPaid = 0;
    let totalProfit = 0;
    let totalMaterial = 0;
    let countComPagamentoParcial = 0;

    filteredData.forEach((b) => {
      grandTotal += b.total || 0;
      totalProfit += b.profit || 0;
      totalMaterial += b.materialCost || 0;

      const pSum = (b.paymentHistory || []).reduce((acc, p) => acc + (p.amount || 0), 0);
      totalPaid += pSum;

      const rem = (b.total || 0) - pSum;
      if (rem > 0.01 && pSum > 0) {
        countComPagamentoParcial++;
      }
    });

    const totalRemaining = Math.max(0, grandTotal - totalPaid);
    const paidPercentage = grandTotal > 0 ? (totalPaid / grandTotal) * 100 : 0;

    return {
      grandTotal,
      totalPaid,
      totalRemaining,
      totalProfit,
      totalMaterial,
      paidPercentage,
      countComPagamentoParcial,
    };
  }, [filteredData]);

  // Alternar expansão de orçamento
  const toggleExpand = (budgetId: string) => {
    setExpandedBudgets((prev) => ({
      ...prev,
      [budgetId]: !prev[budgetId],
    }));
  };

  const toggleAllExpanded = () => {
    const allExpanded = filteredData.every((b) => expandedBudgets[b.id]);
    if (allExpanded) {
      setExpandedBudgets({});
    } else {
      const next: Record<string, boolean> = {};
      filteredData.forEach((b) => {
        next[b.id] = true;
      });
      setExpandedBudgets(next);
    }
  };

  const selectedClient = useMemo(() => {
    if (filterClientId === 'all') return null;
    return clients?.find((c) => c.id === filterClientId) || null;
  }, [clients, filterClientId]);

  // EXPORTAR PDF COMPLETO COM DETALHAMENTO DE PAGAMENTOS
  const handleExportPDF = () => {
    if (filteredData.length === 0) return;
    const doc = new jsPDF();
    let startY = 18;

    // Cabeçalho da Empresa
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(companyProfile?.companyName || 'SLOB_SERVIÇOS', 14, startY);
    startY += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (companyProfile?.companyTaxId || companyProfile?.companyPhone) {
      const infoLine = [
        companyProfile.companyTaxId ? `CNPJ: ${companyProfile.companyTaxId}` : '',
        companyProfile.companyPhone ? `Tel: ${companyProfile.companyPhone}` : '',
        companyProfile.companyEmail ? `E-mail: ${companyProfile.companyEmail}` : '',
      ]
        .filter(Boolean)
        .join(' | ');
      doc.text(infoLine, 14, startY);
      startY += 5;
    }

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Serviços e Pagamentos Parciais', 14, startY);
    startY += 6;

    // Metadados do relatório
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const clientStr = selectedClient ? `Cliente: ${selectedClient.name}` : 'Cliente: Todos os Clientes';
    const periodStr = useDateFilter && date?.from && date?.to
      ? `Período: ${format(date.from, 'dd/MM/yyyy')} a ${format(date.to, 'dd/MM/yyyy')}`
      : 'Período: Geral (Todos os registros)';
    const statusLabel =
      filterStatus === 'ativos_concluidos'
        ? 'Ativos e Concluídos'
        : filterStatus === 'all'
        ? 'Todos os status'
        : filterStatus.toUpperCase();

    doc.text(`${clientStr} | ${periodStr} | Status: ${statusLabel}`, 14, startY);
    startY += 8;

    // Resumo Financeiro
    const summaryBody = [
      [
        'Total Contratado (Serviços)',
        formatCurrency(totals.grandTotal),
        'Total Já Recebido',
        formatCurrency(totals.totalPaid),
      ],
      [
        'Saldo a Receber (Pendente)',
        formatCurrency(totals.totalRemaining),
        'Taxa de Quitação',
        `${totals.paidPercentage.toFixed(1)}%`,
      ],
    ];

    autoTable(doc, {
      startY: startY,
      head: [['Resumo Financeiro Consolidado', '', '', '']],
      body: summaryBody,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9 },
    });

    startY = (doc as any).lastAutoTable.finalY + 8;

    // Tabela dos Serviços
    const tableHead = [
      'Cliente',
      'Serviço / Tarefa',
      'Status',
      'Total',
      'Já Pago',
      'Saldo Devedor',
    ];

    const tableRows = filteredData.map((b) => {
      const pSum = (b.paymentHistory || []).reduce((acc, p) => acc + (p.amount || 0), 0);
      const rem = Math.max(0, (b.total || 0) - pSum);
      return [
        b.clientName || 'Não informado',
        b.task || '-',
        b.status.toUpperCase(),
        formatCurrency(b.total),
        formatCurrency(pSum),
        rem > 0 ? formatCurrency(rem) : 'QUITADO',
      ];
    });

    autoTable(doc, {
      startY: startY,
      head: [tableHead],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [38, 109, 168], fontSize: 8 },
      styles: { fontSize: 8 },
    });

    startY = (doc as any).lastAutoTable.finalY + 10;

    // Detalhamento dos pagamentos de cada serviço
    const budgetsWithPayments = filteredData.filter(
      (b) => b.paymentHistory && b.paymentHistory.length > 0
    );

    if (budgetsWithPayments.length > 0) {
      if (startY > 240) {
        doc.addPage();
        startY = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Detalhamento dos Pagamentos Parciais por Serviço', 14, startY);
      startY += 6;

      budgetsWithPayments.forEach((b) => {
        const pSum = (b.paymentHistory || []).reduce((acc, p) => acc + (p.amount || 0), 0);
        const rem = Math.max(0, (b.total || 0) - pSum);

        if (startY > 250) {
          doc.addPage();
          startY = 20;
        }

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(
          `• ${b.task} (${b.clientName}) — Total: ${formatCurrency(b.total)} | Pago: ${formatCurrency(pSum)} | Saldo: ${rem > 0 ? formatCurrency(rem) : 'QUITADO'}`,
          14,
          startY
        );
        startY += 4;

        const paymentsRows = (b.paymentHistory || []).map((p) => [
          formatDate(p.date),
          (p.method || 'Outro').toUpperCase(),
          formatCurrency(p.amount),
          p.notes || '-',
        ]);

        autoTable(doc, {
          startY: startY,
          head: [['Data', 'Forma', 'Valor Pago', 'Observações']],
          body: paymentsRows,
          theme: 'plain',
          headStyles: { fillColor: [220, 225, 230], textColor: [0, 0, 0], fontSize: 8 },
          styles: { fontSize: 8 },
          margin: { left: 18 },
        });

        startY = (doc as any).lastAutoTable.finalY + 6;
      });
    }

    doc.save(`relatorio_pagamentos_slob_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  // COMPARTILHAR NO WHATSAPP COM EXTRATO DE PAGAMENTOS
  const handleShareWhatsApp = (directToClientPhone?: string) => {
    if (filteredData.length === 0) return;

    let msg = `*${(companyProfile?.companyName || 'SLOB_SERVIÇOS').toUpperCase()}*\n`;
    msg += `*EXTRATO DE SERVIÇOS E PAGAMENTOS*\n`;
    if (companyProfile?.companyTaxId) {
      msg += `CNPJ: ${companyProfile.companyTaxId}\n`;
    }
    msg += `--------------------------------------\n`;

    if (selectedClient) {
      msg += `👤 *Cliente:* ${selectedClient.name}\n`;
      if (selectedClient.contactPhone) {
        msg += `📱 *Telefone:* ${selectedClient.contactPhone}\n`;
      }
    } else {
      msg += `👤 *Cliente:* Todos os Clientes\n`;
    }

    if (useDateFilter && date?.from && date?.to) {
      msg += `📅 *Período:* ${format(date.from, 'dd/MM/yyyy')} a ${format(date.to, 'dd/MM/yyyy')}\n`;
    } else {
      msg += `📅 *Período:* Geral (Todos os registros)\n`;
    }
    msg += `\n`;

    msg += `📊 *RESUMO FINANCEIRO*\n`;
    msg += `• *Total Contratado:* ${formatCurrency(totals.grandTotal)}\n`;
    msg += `• *Total Já Pago:* ${formatCurrency(totals.totalPaid)}\n`;
    msg += `• *Saldo a Receber:* *${formatCurrency(totals.totalRemaining)}*\n`;
    msg += `--------------------------------------\n\n`;

    msg += `📋 *DETALHAMENTO DOS SERVIÇOS:*\n\n`;

    filteredData.forEach((budget, index) => {
      const payments = budget.paymentHistory || [];
      const pSum = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
      const rem = Math.max(0, (budget.total || 0) - pSum);

      msg += `*${index + 1}. ${budget.task || 'Serviço'}*\n`;
      if (!selectedClient) {
        msg += `   • Cliente: ${budget.clientName}\n`;
      }
      msg += `   • Status: ${budget.status.toUpperCase()}\n`;
      msg += `   • Valor Total: ${formatCurrency(budget.total)}\n`;
      msg += `   • Já Pago: ${formatCurrency(pSum)}\n`;
      if (rem > 0) {
        msg += `   • *Saldo Pendente:* *${formatCurrency(rem)}*\n`;
      } else {
        msg += `   • *Situação:* ✅ *QUITADO*\n`;
      }

      if (payments.length > 0) {
        msg += `   _Histórico de Pagamentos:_\n`;
        payments.forEach((p) => {
          const dt = formatDate(p.date);
          const met = (p.method || 'Outro').toUpperCase();
          const obs = p.notes ? ` (${p.notes})` : '';
          msg += `     ✓ ${dt} - ${met}: ${formatCurrency(p.amount)}${obs}\n`;
        });
      } else {
        msg += `   _Nenhum pagamento registrado até o momento._\n`;
      }
      msg += `\n`;
    });

    msg += `--------------------------------------\n`;
    if (totals.totalRemaining > 0) {
      msg += `⚠️ *Saldo Total em Aberto: ${formatCurrency(totals.totalRemaining)}*\n\n`;
    } else {
      msg += `✅ *Todos os serviços listados estão quitados!*\n\n`;
    }
    msg += `_Extrato emitido pelo SLOB_SERVIÇOS._`;

    // Se tiver telefone direto, limpa caracteres e envia para o número
    let whatsappUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    if (directToClientPhone) {
      const cleanPhone = directToClientPhone.replace(/\D/g, '');
      const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
      whatsappUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
    }

    window.open(whatsappUrl, '_blank');
  };

  const allStatus = [
    { value: 'ativos_concluidos', label: 'Ativos e Concluídos (Recomendado)' },
    { value: 'all', label: 'Todos os Status' },
    { value: 'ativo', label: 'Somente Ativo' },
    { value: 'concluído', label: 'Somente Concluído' },
    { value: 'prospecção', label: 'Somente Prospecção' },
    { value: 'cancelado', label: 'Somente Cancelado' },
  ];

  const paymentFilterOptions = [
    { value: 'all', label: 'Todas as Situações' },
    { value: 'pendente', label: 'Com Saldo Pendente (Pagamento Parcial / Devedor)' },
    { value: 'com_pagamento', label: 'Com Pelo Menos 1 Pagamento Feito' },
    { value: 'quitado', label: 'Totalmente Quitados' },
  ];

  return (
    <Card className="col-span-7">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Relatórios e Extratos de Pagamentos</span>
        </CardTitle>
        <CardDescription>
          Acompanhe serviços ativos ou concluídos, pagamentos parciais realizados e saldos pendentes por cliente ou geral.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Painel de Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-lg border bg-muted/30">
          {/* Filtro: Cliente */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Cliente
            </label>
            <Select value={filterClientId} onValueChange={setFilterClientId}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Todos os clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro: Status do Serviço */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Status do Serviço
            </label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                {allStatus.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro: Situação do Pagamento */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Coins className="h-4 w-4 text-emerald-500" /> Situação Financeira
            </label>
            <Select value={filterPayment} onValueChange={setFilterPayment}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Selecione o pagamento" />
              </SelectTrigger>
              <SelectContent>
                {paymentFilterOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro: Período com Checkbox */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" /> Período
              </label>
              <div className="flex items-center space-x-1.5">
                <Checkbox
                  id="enable-date-filter"
                  checked={useDateFilter}
                  onCheckedChange={(c) => setUseDateFilter(!!c)}
                />
                <label
                  htmlFor="enable-date-filter"
                  className="text-xs text-muted-foreground cursor-pointer select-none"
                >
                  Filtrar datas
                </label>
              </div>
            </div>

            {useDateFilter ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={'outline'}
                    className={cn(
                      'w-full justify-start text-left font-normal bg-background text-xs',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {date?.from ? (
                      date.to ? (
                        <>
                          {format(date.from, 'dd/MM/yy', { locale: ptBR })} -{' '}
                          {format(date.to, 'dd/MM/yy', { locale: ptBR })}
                        </>
                      ) : (
                        format(date.from, 'dd/MM/yy', { locale: ptBR })
                      )
                    ) : (
                      <span>Escolha o período</span>
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
            ) : (
              <div className="h-10 px-3 flex items-center rounded-md border border-dashed text-xs text-muted-foreground bg-background/50">
                Todo o histórico (sem limite de data)
              </div>
            )}
          </div>
        </div>

        {/* Botão de Geração */}
        <div className="flex justify-end">
          <Button onClick={handleGenerateReport} disabled={isLoading} className="w-full sm:w-auto">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Gerar Relatório
          </Button>
        </div>

        {/* Resultados */}
        {reportData && (
          <div className="space-y-6 pt-2">
            {/* Barra de Ações: Exportação e WhatsApp */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2 border-b">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span>Extrato Consolidado</span>
                  <Badge variant="secondary" className="font-normal text-xs">
                    {filteredData.length} {filteredData.length === 1 ? 'serviço' : 'serviços'}
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selectedClient ? `Cliente: ${selectedClient.name}` : 'Todos os clientes selecionados'}
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAllExpanded}
                  disabled={filteredData.length === 0}
                  className="text-xs"
                >
                  <ChevronsUpDown className="mr-1.5 h-3.5 w-3.5" />
                  Expandir Pagamentos
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="default"
                      size="sm"
                      disabled={filteredData.length === 0}
                      className="text-xs"
                    >
                      <FileDown className="mr-1.5 h-3.5 w-3.5" />
                      Exportar / Enviar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuItem onClick={handleExportPDF}>
                      <FileDown className="mr-2 h-4 w-4 text-rose-500" />
                      Baixar Relatório em PDF
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => handleShareWhatsApp()}>
                      <WhatsappIcon className="mr-2 h-4 w-4 text-emerald-500" />
                      Compartilhar no WhatsApp (Geral)
                    </DropdownMenuItem>

                    {selectedClient?.contactPhone && (
                      <DropdownMenuItem
                        onClick={() => handleShareWhatsApp(selectedClient.contactPhone)}
                      >
                        <Send className="mr-2 h-4 w-4 text-emerald-600" />
                        Enviar direto p/ {selectedClient.name.split(' ')[0]}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Cards de Resumo Financeiro */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    Total dos Serviços
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatCurrency(totals.grandTotal)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Valor total contratado</p>
                </CardContent>
              </Card>

              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Total Já Recebido
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(totals.totalPaid)}
                  </p>
                  <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                    {totals.paidPercentage.toFixed(1)}% do total quitado
                  </p>
                </CardContent>
              </Card>

              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    Saldo a Receber (Pendente)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {formatCurrency(totals.totalRemaining)}
                  </p>
                  <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
                    {totals.countComPagamentoParcial > 0
                      ? `${totals.countComPagamentoParcial} serviço(s) com pagamento parcial`
                      : 'Valores restantes a receber'}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-blue-500/20 bg-blue-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    Mão de Obra (Ganho Real)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(totals.totalProfit)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Lucro de mão de obra previsto</p>
                </CardContent>
              </Card>
            </div>

            {/* Barra de Pesquisa Rápida */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por cliente, tarefa, valor, observação ou forma de pagamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Tabela de Serviços e Pagamentos */}
            <div className="rounded-md border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[36px]"></TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Serviço / Tarefa</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right text-emerald-600 dark:text-emerald-400">Já Pago</TableHead>
                    <TableHead className="text-right text-amber-600 dark:text-amber-400">Saldo Pendente</TableHead>
                    <TableHead className="w-[80px] text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length > 0 ? (
                    filteredData.map((budget) => {
                      const payments = budget.paymentHistory || [];
                      const pSum = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
                      const rem = Math.max(0, (budget.total || 0) - pSum);
                      const isExpanded = !!expandedBudgets[budget.id];

                      return (
                        <Fragment key={budget.id}>
                          <TableRow
                            onClick={() => toggleExpand(budget.id)}
                            className="cursor-pointer hover:bg-muted/70 transition-colors"
                          >
                            <TableCell className="text-center px-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpand(budget.id);
                                }}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="font-semibold text-foreground">
                              {budget.clientName || 'Cliente não informado'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {budget.task || '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className={`capitalize ${statusStyles[budget.status] || ''}`}
                              >
                                {budget.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(budget.total)}
                            </TableCell>
                            <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(pSum)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {rem > 0 ? (
                                <span className="text-amber-600 dark:text-amber-400">
                                  {formatCurrency(rem)}
                                </span>
                              ) : (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                                  Quitado
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                              <Button size="sm" variant="ghost" className="h-8 px-2" asChild>
                                <Link href={`/orcamentos/${budget.id}`} title="Ver detalhes do orçamento">
                                  <span className="text-xs mr-1">Ver</span>
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>

                          {/* Linha Expandida: Histórico de Pagamentos */}
                          {isExpanded && (
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                              <TableCell colSpan={8} className="p-4">
                                <div className="rounded-md border bg-background p-3 space-y-2">
                                  <div className="flex items-center justify-between pb-1 border-b">
                                    <div className="flex items-center gap-2">
                                      <Coins className="h-4 w-4 text-emerald-500" />
                                      <span className="text-xs font-semibold">
                                        Histórico de Pagamentos ({payments.length})
                                      </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {rem > 0 ? (
                                        <span>Faltam {formatCurrency(rem)} para quitação</span>
                                      ) : (
                                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                          Totalmente pago
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {payments.length > 0 ? (
                                    <div className="divide-y text-xs">
                                      {payments.map((p, idx) => (
                                        <div
                                          key={p.id || idx}
                                          className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                        >
                                          <div className="flex items-center gap-3">
                                            <span className="text-muted-foreground w-20">
                                              {formatDate(p.date)}
                                            </span>
                                            <Badge variant="outline" className="gap-1 font-normal capitalize">
                                              {getPaymentMethodIcon(p.method)}
                                              <span>{p.method || 'Outro'}</span>
                                            </Badge>
                                            {p.notes && (
                                              <span className="text-muted-foreground italic">
                                                &ldquo;{p.notes}&rdquo;
                                              </span>
                                            )}
                                          </div>
                                          <div className="font-semibold text-emerald-600 dark:text-emerald-400 sm:text-right">
                                            + {formatCurrency(p.amount)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground py-2 italic">
                                      Nenhum pagamento registrado neste serviço até o momento.
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                        Nenhum serviço encontrado com os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
