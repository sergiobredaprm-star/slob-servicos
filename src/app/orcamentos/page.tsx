'use client';

import { Budget, BudgetStatus, Client } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Trash2, ChevronsUpDown, Check } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { useState, useMemo, useEffect, Suspense } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteBudget } from '@/lib/firebase/services';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSearchParams } from 'next/navigation';


const statusStyles: { [key in BudgetStatus]: string } = {
  prospecção: 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300',
  ativo: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  concluído:
    'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  cancelado: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};

const paymentStatusStyles: { [key: string]: string } = {
  Pago: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  Parcial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  Aguardando: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
  'N/A': 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300',
};


const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

function OrcamentosPageComponent() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [taskFilter, setTaskFilter] = useState<string>('');
  const [observationFilter, setObservationFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<BudgetStatus | null>(null);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);

  useEffect(() => {
    const statusFromUrl = searchParams.get('status');
    if (statusFromUrl && ['prospecção', 'ativo', 'concluído', 'cancelado'].includes(statusFromUrl)) {
      setStatusFilter(statusFromUrl as BudgetStatus);
    }
  }, [searchParams]);

  const budgetsQuery = useMemoFirebase(() => 
    user && firestore ? query(collection(firestore, 'users', user.uid, 'budgets')) : null
  , [firestore, user]);

  const { data: budgets, isLoading } = useCollection<Budget>(budgetsQuery);

  const clientsQuery = useMemoFirebase(() =>
    user && firestore ? query(collection(firestore, 'users', user.uid, 'clients')) : null
  , [firestore, user]);
  
  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);

  const sortedClients = useMemo(() => {
    if (!clients) return [];
    return [...clients].sort((a, b) => a.name.localeCompare(b.name));
  }, [clients]);

  const filteredBudgets = useMemo(() => {
    if (!budgets) return [];
    return budgets.filter(budget => {
      const clientMatch = clientFilter ? budget.clientId === clientFilter : true;
      const taskMatch = taskFilter ? (budget.task || '').toLowerCase().includes(taskFilter.toLowerCase()) : true;
      const statusMatch = statusFilter ? budget.status === statusFilter : true;
      const observationMatch = observationFilter ? (budget.clientDescription || '').toLowerCase().includes(observationFilter.toLowerCase()) : true;
      return clientMatch && taskMatch && statusMatch && observationMatch;
    })
  }, [budgets, clientFilter, taskFilter, statusFilter, observationFilter]);
  
  const filteredSummary = useMemo(() => {
    if (!filteredBudgets || filteredBudgets.length === 0) {
      return null;
    }
    
    const total = filteredBudgets.reduce((sum, b) => sum + b.total, 0);

    if (total > 0) {
      const clientName = clientFilter && clients ? clients.find(c => c.id === clientFilter)?.name : null;
      let label = 'Total dos Filtros:';
      if(clientName && !statusFilter) {
          label = `Total (${clientName}):`;
      } else if (statusFilter && !clientFilter) {
          label = `Total (${statusFilter}):`;
      } else if (statusFilter && clientName) {
          label = `Total (${clientName} / ${statusFilter}):`;
      }


      return (
        <div className="flex items-center text-sm font-medium">
          {label} 
          <span className="ml-2 font-bold text-lg">{formatCurrency(total)}</span>
        </div>
      );
    }
    return null;
  }, [filteredBudgets, clientFilter, statusFilter, clients]);

  const getClientNameFromBudget = (budget: Budget) => {
    if (budget.clientName) return budget.clientName;
    return 'Cliente não informado';
  }

  const getTaskFromBudget = (budget: Budget) => {
    if (budget.task) return budget.task;
    return 'Tarefa não informada';
  }

  const getPaymentStatus = (budget: Budget) => {
    const totalPaid = budget.paymentHistory?.reduce((acc, p) => acc + p.amount, 0) || 0;

    if (budget.status === 'cancelado') {
        return 'N/A';
    }

    if (totalPaid >= budget.total && budget.total > 0) {
        return 'Pago';
    }
    
    if (totalPaid > 0) {
        return 'Parcial';
    }

    if (budget.status === 'ativo' || budget.status === 'concluído') {
      return 'Aguardando';
    }

    return 'N/A';
  };
  
  const handleDeleteClick = (budgetId: string) => {
    setSelectedBudgetId(budgetId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedBudgetId || !user || !firestore) return;
    try {
      await deleteBudget(firestore, user.uid, selectedBudgetId);
      toast({
        title: 'Orçamento Deletado',
        description: 'O orçamento foi removido com sucesso.',
      });
    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Erro ao Deletar',
        description: 'Não foi possível remover o orçamento.',
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedBudgetId(null);
    }
  };


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Orçamentos
        </h1>
        <Button asChild>
          <Link href="/orcamentos/novo">
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Orçamento
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lista de Orçamentos</CardTitle>
          <CardDescription>
            Gerencie e filtre todos os seus orçamentos em um só lugar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4 items-center">
            <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isComboboxOpen}
                      className="w-full sm:w-auto md:w-[200px] justify-between"
                      disabled={isLoadingClients}
                    >
                      {isLoadingClients
                        ? "Carregando..."
                        : clientFilter
                        ? sortedClients?.find(c => c.id === clientFilter)?.name
                        : "Filtrar por cliente..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Procurar cliente..." />
                    <CommandList>
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem onSelect={() => {setClientFilter(null); setIsComboboxOpen(false);}}>
                            <Check className={cn("mr-2 h-4 w-4", !clientFilter ? "opacity-100" : "opacity-0")}/>
                            Todos os clientes
                        </CommandItem>
                        {sortedClients?.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.name}
                            onSelect={() => {
                              setClientFilter(client.id === clientFilter ? null : client.id);
                              setIsComboboxOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", client.id === clientFilter ? "opacity-100" : "opacity-0")}/>
                            {client.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
            </Popover>
            <Input
              placeholder="Filtrar por tarefa..."
              value={taskFilter}
              onChange={(e) => setTaskFilter(e.target.value)}
              className="w-full sm:w-auto md:w-[200px]"
            />
            <Input
              placeholder="Filtrar por observação..."
              value={observationFilter}
              onChange={(e) => setObservationFilter(e.target.value)}
              className="w-full sm:w-auto md:w-[200px]"
            />
            <Select value={statusFilter ?? 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? null : value as BudgetStatus)}>
              <SelectTrigger className="w-full sm:w-auto md:w-[180px]">
                <SelectValue placeholder="Filtrar por status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="prospecção">Prospecção</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="concluído">Concluído</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            {filteredSummary && (
                <div className="ml-auto">
                    {filteredSummary}
                </div>
            )}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Tarefa</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Pagamento</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center">Carregando...</TableCell></TableRow>}
              {!isLoading && filteredBudgets && filteredBudgets.map((budget) => {
                const paymentStatus = getPaymentStatus(budget);
                return (
                  <TableRow key={budget.id}>
                    <TableCell className="font-medium">
                      {getClientNameFromBudget(budget)}
                    </TableCell>
                    <TableCell>{getTaskFromBudget(budget)}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`capitalize ${statusStyles[budget.status]}`}
                      >
                        {budget.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`capitalize ${paymentStatusStyles[paymentStatus]}`}
                      >
                        {paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(budget.total)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => budget.id && navigator.clipboard.writeText(budget.id)}
                          >
                            Copiar ID
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/orcamentos/${budget.id}`}>Ver detalhes</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/orcamentos/${budget.id}/editar`}>Editar</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteClick(budget.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Deletar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
              {!isLoading && (!filteredBudgets || filteredBudgets.length === 0) && <TableRow><TableCell colSpan={6} className="text-center">Nenhum orçamento encontrado.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Isso excluirá permanentemente o
              orçamento e removerá seus dados de nossos servidores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Deletar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function OrcamentosPage() {
  return (
    <Suspense fallback={<div>Carregando filtros...</div>}>
      <OrcamentosPageComponent />
    </Suspense>
  )
}
