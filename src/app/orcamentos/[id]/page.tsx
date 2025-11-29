'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { Budget, BudgetStatus, Payment } from '@/lib/types';
import { doc, Timestamp } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Trash2, MoreHorizontal, Edit } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AddPaymentDialog } from '@/components/app/budget/add-payment-dialog';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { deletePaymentFromBudget } from '@/lib/firebase/services';
import { useToast } from '@/hooks/use-toast';

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
  }).format(value || 0);
};

const formatDate = (date: any) => {
  if (!date) return 'N/A';
  const d = (date as any).toDate ? (date as any).toDate() : new Date(date);
  return format(d, 'dd/MM/yyyy', { locale: ptBR });
}

export default function BudgetDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);


  const budgetDocRef = useMemoFirebase(
    () =>
      user && firestore && id
        ? doc(firestore, 'users', user.uid, 'budgets', id as string)
        : null,
    [firestore, user, id]
  );

  const { data: budget, isLoading } = useDoc<Budget>(budgetDocRef);

  const { totalPaid, remainingBalance, paymentPercentage } = useMemo(() => {
    if (!budget) {
      return { totalPaid: 0, remainingBalance: 0, paymentPercentage: 0 };
    }
    const totalPaid = budget.paymentHistory?.reduce((acc, p) => acc + p.amount, 0) || 0;
    const remainingBalance = budget.total - totalPaid;
    const paymentPercentage = budget.total > 0 ? (totalPaid / budget.total) * 100 : 0;
    return { totalPaid, remainingBalance, paymentPercentage };
  }, [budget]);

  const handleAddPayment = () => {
    setSelectedPayment(null);
    setIsPaymentDialogOpen(true);
  };

  const handleEditPayment = (payment: Payment) => {
    const paymentWithDate = {
      ...payment,
      date: (payment.date as Timestamp).toDate(),
    }
    setSelectedPayment(paymentWithDate);
    setIsPaymentDialogOpen(true);
  };
  
  const handleDeletePayment = (payment: Payment) => {
    setPaymentToDelete(payment);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDeletePayment = async () => {
    if (!user || !firestore || !paymentToDelete || !id) return;

    try {
      await deletePaymentFromBudget(firestore, user.uid, id as string, paymentToDelete);
      toast({
        title: "Pagamento Removido",
        description: "O pagamento foi removido do histórico.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível remover o pagamento.",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setPaymentToDelete(null);
    }
  };


  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Carregando detalhes...</div>;
  }

  if (!budget) {
    return <div className="flex h-screen items-center justify-center">Orçamento não encontrado.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
        <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
        </Button>
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="font-headline text-2xl">
                           Detalhes do Orçamento
                        </CardTitle>
                        <CardDescription>
                            ID do Orçamento: {budget.id}
                        </CardDescription>
                    </div>
                     <Badge
                      variant="outline"
                      className={`capitalize text-base ${statusStyles[budget.status]}`}
                    >
                      {budget.status}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6 text-sm">
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="font-medium text-muted-foreground">Cliente</p>
                        <p className="font-semibold text-lg">{budget.clientName}</p>
                    </div>
                     <div className="space-y-1">
                        <p className="font-medium text-muted-foreground">Descrição do Cliente</p>
                        <p>{budget.clientDescription || 'Não informado'}</p>
                    </div>
                </div>
                 <div className="space-y-1">
                    <p className="font-medium text-muted-foreground">Tarefa a ser Realizada</p>
                    <p className="whitespace-pre-wrap">{budget.task}</p>
                </div>

                <div className="grid md:grid-cols-3 gap-4 border-t pt-4">
                     <div className="space-y-1">
                        <p className="font-medium text-muted-foreground">Tipo de Orçamento</p>
                        <p>{budget.budgetType === 'daily' ? 'Por Diária' : 'Por Tarefa'}</p>
                    </div>
                    {budget.budgetType === 'daily' && (
                        <>
                             <div className="space-y-1">
                                <p className="font-medium text-muted-foreground">Período de Trabalho</p>
                                <p>{formatDate(budget.period?.from)} - {formatDate(budget.period?.to)}</p>
                            </div>
                             <div className="space-y-1">
                                <p className="font-medium text-muted-foreground">Valor da Diária</p>
                                <p>{formatCurrency(budget.dailyRate || 0)}</p>
                            </div>
                        </>
                    )}
                     <div className="space-y-1">
                        <p className="font-medium text-muted-foreground">Prazo de Entrega</p>
                        <p>{formatDate(budget.deadline)}</p>
                    </div>
                     <div className="space-y-1">
                        <p className="font-medium text-muted-foreground">Data de Registro</p>
                        <p>{formatDate(budget.registrationDate)}</p>
                    </div>
                </div>

                 <Separator />

                 <div className="space-y-4">
                     <div className="grid md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Valor Bruto do Projeto</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xl font-bold">{formatCurrency(budget.total)}</p>
                            </CardContent>
                        </Card>
                        <Card>
                             <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Custo com Material</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xl font-bold text-red-600">{formatCurrency(budget.materialCost || 0)}</p>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Lucro do Projeto</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xl font-bold text-green-600">{formatCurrency(budget.profit || 0)}</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <Separator />

                <div>
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold font-headline">Pagamentos</h3>
                      <Button size="sm" onClick={handleAddPayment}>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Adicionar Pagamento
                      </Button>
                  </div>
                  <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                          <Card>
                              <CardHeader className="pb-2">
                                  <CardTitle className="text-sm font-medium">Valor Total (Líquido)</CardTitle>
                              </CardHeader>
                              <CardContent>
                                  <p className="text-xl font-bold">{formatCurrency(budget.total)}</p>
                              </CardContent>
                          </Card>
                          <Card>
                              <CardHeader className="pb-2">
                                  <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
                              </CardHeader>
                              <CardContent>
                                  <p className="text-xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
                              </CardContent>
                          </Card>
                          <Card>
                              <CardHeader className="pb-2">
                                  <CardTitle className="text-sm font-medium">Saldo Devedor</CardTitle>
                              </CardHeader>
                              <CardContent>
                                  <p className="text-xl font-bold text-red-600">{formatCurrency(remainingBalance)}</p>
                              </CardContent>
                          </Card>
                      </div>
                      <div>
                          <Progress value={paymentPercentage} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1 text-right">{paymentPercentage.toFixed(0)}% pago</p>
                      </div>
                      
                      <Card>
                          <CardHeader>
                              <CardTitle className="text-base">Histórico de Pagamentos</CardTitle>
                          </CardHeader>
                          <CardContent>
                              <Table>
                                  <TableHeader>
                                      <TableRow>
                                          <TableHead>Data</TableHead>
                                          <TableHead>Valor</TableHead>
                                          <TableHead>Observações</TableHead>
                                          <TableHead><span className="sr-only">Ações</span></TableHead>
                                      </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                      {budget.paymentHistory && budget.paymentHistory.length > 0 ? (
                                          budget.paymentHistory.map(p => (
                                              <TableRow key={p.id}>
                                                  <TableCell>{formatDate(p.date)}</TableCell>
                                                  <TableCell>{formatCurrency(p.amount)}</TableCell>
                                                  <TableCell>{p.notes || '-'}</TableCell>
                                                  <TableCell className="text-right">
                                                      <DropdownMenu>
                                                          <DropdownMenuTrigger asChild>
                                                              <Button variant="ghost" className="h-8 w-8 p-0">
                                                                  <span className="sr-only">Abrir menu</span>
                                                                  <MoreHorizontal className="h-4 w-4" />
                                                              </Button>
                                                          </DropdownMenuTrigger>
                                                          <DropdownMenuContent align="end">
                                                              <DropdownMenuItem onClick={() => handleEditPayment(p)}>
                                                                  <Edit className="mr-2 h-4 w-4" />
                                                                  Editar
                                                              </DropdownMenuItem>
                                                              <DropdownMenuItem
                                                                  className="text-destructive"
                                                                  onClick={() => handleDeletePayment(p)}
                                                              >
                                                                  <Trash2 className="mr-2 h-4 w-4" />
                                                                  Excluir
                                                              </DropdownMenuItem>
                                                          </DropdownMenuContent>
                                                      </DropdownMenu>
                                                  </TableCell>
                                              </TableRow>
                                          ))
                                      ) : (
                                          <TableRow>
                                              <TableCell colSpan={4} className="text-center">
                                                  Nenhum pagamento registrado.
                                              </TableCell>
                                          </TableRow>
                                      )}
                                  </TableBody>
                              </Table>
                          </CardContent>
                      </Card>
                  </div>
                </div>

            </CardContent>
        </Card>
        <AddPaymentDialog
            isOpen={isPaymentDialogOpen}
            onOpenChange={setIsPaymentDialogOpen}
            budgetId={id as string}
            maxAmount={remainingBalance}
            paymentToEdit={selectedPayment}
        />
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tem certeza que deseja excluir este pagamento? Esta ação não poderá ser desfeita.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDeletePayment}>Excluir</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
