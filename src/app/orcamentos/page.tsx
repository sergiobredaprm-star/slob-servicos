'use client';

import { Budget, BudgetStatus } from '@/lib/types';
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
import { MoreHorizontal, PlusCircle, Trash2 } from 'lucide-react';
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
import { useState } from 'react';
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

export default function OrcamentosPage() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);

  const budgetsQuery = useMemoFirebase(() => 
    user && firestore ? query(collection(firestore, 'users', user.uid, 'budgets')) : null
  , [firestore, user]);

  const { data: budgets, isLoading } = useCollection<Budget>(budgetsQuery);

  const getClientNameFromBudget = (budget: Budget) => {
    if (budget.clientName) return budget.clientName;
    return 'Cliente não informado';
  }

  const getTaskFromBudget = (budget: Budget) => {
    if (budget.task) return budget.task;
    return 'Tarefa não informada';
  }

  const getPaymentStatus = (budget: Budget) => {
    if (budget.status === 'prospecção' || budget.status === 'cancelado' || budget.status === 'concluído') {
      const totalPaid = budget.paymentHistory?.reduce((acc, p) => acc + p.amount, 0) || 0;
      if (totalPaid >= budget.total) return 'Pago';
      return 'N/A';
    }

    const totalPaid = budget.paymentHistory?.reduce((acc, p) => acc + p.amount, 0) || 0;
    if (totalPaid >= budget.total) {
      return 'Pago';
    }
    if (totalPaid > 0) {
      return 'Parcial';
    }
    return 'Aguardando';
  }
  
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
            Gerencie todos os seus orçamentos em um só lugar.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              {!isLoading && budgets && budgets.map((budget) => {
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
              {!isLoading && (!budgets || budgets.length === 0) && <TableRow><TableCell colSpan={6} className="text-center">Nenhum orçamento encontrado.</TableCell></TableRow>}
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
