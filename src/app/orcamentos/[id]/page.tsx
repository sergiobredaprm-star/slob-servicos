'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { Budget, BudgetStatus, Payment, CompanyProfile, Client } from '@/lib/types';
import { doc, Timestamp } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { format, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  PlusCircle,
  Trash2,
  MoreHorizontal,
  Edit,
  Share2,
  Copy,
} from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { deletePaymentFromBudget } from '@/lib/firebase/services';
import { useToast } from '@/hooks/use-toast';
import { getCompanyProfile } from '@/lib/firebase/company-services';
import Link from 'next/link';

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
  }).format(value || 0);
};

const formatDate = (date: any) => {
  if (!date) return 'N/A';
  const d = (date as any).toDate ? (date as any).toDate() : new Date(date);
  return format(d, 'dd/MM/yyyy', { locale: ptBR });
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
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);

  const budgetDocRef = useMemoFirebase(
    () =>
      user && firestore && id
        ? doc(firestore, 'users', user.uid, 'budgets', id as string)
        : null,
    [firestore, user, id]
  );

  const { data: budget, isLoading } = useDoc<Budget>(budgetDocRef);

  const clientDocRef = useMemoFirebase(
    () =>
      user && firestore && budget?.clientId
        ? doc(firestore, 'users', user.uid, 'clients', budget.clientId)
        : null,
    [firestore, user, budget?.clientId]
  );
  const { data: client } = useDoc<Client>(clientDocRef);

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

  const { totalPaid, remainingBalance, paymentPercentage } = useMemo(() => {
    if (!budget) {
      return { totalPaid: 0, remainingBalance: 0, paymentPercentage: 0 };
    }
    const totalPaid =
      budget.paymentHistory?.reduce((acc, p) => acc + p.amount, 0) || 0;
    const remainingBalance = budget.total - totalPaid;
    const paymentPercentage =
      budget.total > 0 ? (totalPaid / budget.total) * 100 : 0;
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
    };
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
      await deletePaymentFromBudget(
        firestore,
        user.uid,
        id as string,
        paymentToDelete
      );
      toast({
        title: 'Pagamento Removido',
        description: 'O pagamento foi removido do histórico.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível remover o pagamento.',
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setPaymentToDelete(null);
    }
  };

  const generateShareableMessage = (
    budget: Budget,
    companyProfile: CompanyProfile | null
  ): string => {
    if (!budget) return 'Carregando detalhes do orçamento...';

    let message = '';

    if (companyProfile?.companyName) {
      message += `*${companyProfile.companyName.toUpperCase()}*\n`;
      if (companyProfile.companyTaxId)
        message += `CNPJ: ${companyProfile.companyTaxId}\n`;
      if (companyProfile.companyPhone)
        message += `Tel: ${companyProfile.companyPhone}\n`;
      if (companyProfile.companyEmail)
        message += `Email: ${companyProfile.companyEmail}\n`;
      message += '---------------------------------\n\n';
    }

    message += '*ORÇAMENTO DE SERVIÇOS*\n\n';
    message += `*Cliente:* ${budget.clientName}\n`;
    if (budget.clientDescription) {
      message += `*Observações do Cliente:* ${budget.clientDescription}\n`;
    }
    message += '\n';

    message += `*Data de Emissão:* ${formatDate(budget.registrationDate)}\n`;
    if (budget.deadline) {
      message += `*Prazo de Entrega:* ${formatDate(budget.deadline)}\n`;
    }
    message += `*Serviço:* ${budget.serviceType}\n`;
    message += `*Tarefa:* ${budget.task}\n\n`;

    message += '---------------------------------\n';
    message += '*DETALHES DO ORÇAMENTO*\n';
    message += '---------------------------------\n\n';

    if (budget.budgetType === 'daily') {
      const workDays =
        budget.period?.from && budget.period?.to
          ? differenceInCalendarDays(
              (budget.period.to as any).toDate(),
              (budget.period.from as any).toDate()
            ) + 1
          : 0;
      message += `*Tipo:* Por Diária\n`;
      message += `*Período:* ${formatDate(budget.period?.from)} a ${formatDate(
        budget.period?.to
      )}\n`;
      message += `*Total de diárias:* ${workDays}\n`;
      message += `*Valor da diária:* ${formatCurrency(budget.dailyRate || 0)}\n\n`;
    } else {
      message += `*Tipo:* Por Tarefa (Valor Fechado)\n\n`;
      if (
        budget.serviceType === 'Pintura' &&
        budget.wallHeight &&
        budget.wallWidth
      ) {
        const area = budget.wallHeight * budget.wallWidth;
        message += `*Detalhes da Pintura:*\n`;
        message += ` • Área: ${budget.wallHeight}m (altura) x ${
          budget.wallWidth
        }m (largura) = ${area.toFixed(2)} m²\n`;
        message += ` • Valor por m²: ${formatCurrency(
          budget.sqMetersPrice || 0
        )}\n`;
        message += ` • Número de Demãos: ${budget.paintCoats || 1}\n\n`;
      }

      if (
        budget.serviceType === 'Elétrica' &&
        budget.electricalItems &&
        budget.electricalItems.length > 0
      ) {
        message += '*Itens de Elétrica:*\n';
        budget.electricalItems.forEach((item) => {
          const itemTotal = item.quantity * item.value;
          message += ` • ${item.name} (Qtd: ${
            item.quantity
          }, V.Un: ${formatCurrency(item.value)}) = *${formatCurrency(
            itemTotal
          )}*\n`;
        });
        message += '\n';
      }

      if (
        budget.serviceType === 'Hidráulica' &&
        budget.hydraulicItems &&
        budget.hydraulicItems.length > 0
      ) {
        message += '*Itens de Hidráulica:*\n';
        budget.hydraulicItems.forEach((item) => {
          const itemTotal = item.quantity * item.value;
          message += ` • ${item.name} (Qtd: ${
            item.quantity
          }, V.Un: ${formatCurrency(item.value)}) = *${formatCurrency(
            itemTotal
          )}*\n`;
        });
        message += '\n';
      }
    }

    message += '---------------------------------\n';
    message += '*RESUMO FINANCEIRO*\n';
    message += '---------------------------------\n\n';

    if (budget.materialCost && budget.materialCost > 0) {
      const laborCost = budget.profit || budget.total - budget.materialCost;
      message += `*Valor da Mão de Obra:* ${formatCurrency(laborCost)}\n`;
      message += `*Custo com Materiais:* ${formatCurrency(
        budget.materialCost
      )}\n\n`;
    }

    message += `*VALOR TOTAL:* *${formatCurrency(budget.total)}*\n\n`;
    message += `_Este orçamento é válido por 15 dias._\n`;
    if (companyProfile?.companyName) {
      message += `\nAtenciosamente,\n*${companyProfile.companyName}*`;
    }

    return message;
  };

  const handleCopyToClipboard = () => {
    if (!budget) return;
    const message = generateShareableMessage(budget, companyProfile);
    navigator.clipboard.writeText(message);
    toast({
      title: 'Texto Copiado!',
      description:
        'Os detalhes do orçamento foram copiados para a área de transferência.',
    });
  };

  const handleShareWhatsApp = () => {
    if (!budget) return;
    if (!client?.contactPhone) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Este cliente não possui um número de telefone cadastrado.',
      });
      return;
    }
    const message = generateShareableMessage(budget, companyProfile);
    const cleanPhone = client.contactPhone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(
      message
    )}`;
    window.open(whatsappUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Carregando detalhes...
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="flex h-screen items-center justify-center">
        Orçamento não encontrado.
      </div>
    );
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
              <CardTitle className="font-headline text-2xl flex items-center gap-4">
                <span>Detalhes do Orçamento</span>
                <Badge
                  variant="outline"
                  className={`capitalize text-base ${statusStyles[budget.status]}`}
                >
                  {budget.status}
                </Badge>
              </CardTitle>
              <CardDescription>ID do Orçamento: {budget.id}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsShareDialogOpen(true)}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Compartilhar
              </Button>
              <Button asChild size="sm">
                  <Link href={`/orcamentos/${id}/editar`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                  </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="font-medium text-muted-foreground">Cliente</p>
              <p className="font-semibold text-lg">{budget.clientName}</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-muted-foreground">
                Descrição do Cliente
              </p>
              <p>{budget.clientDescription || 'Não informado'}</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-muted-foreground">
              Tarefa a ser Realizada
            </p>
            <p className="whitespace-pre-wrap">{budget.task}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 border-t pt-4">
            <div className="space-y-1">
              <p className="font-medium text-muted-foreground">
                Tipo de Orçamento
              </p>
              <p>{budget.budgetType === 'daily' ? 'Por Diária' : 'Por Tarefa'}</p>
            </div>
            {budget.budgetType === 'daily' && (
              <>
                <div className="space-y-1">
                  <p className="font-medium text-muted-foreground">
                    Período de Trabalho
                  </p>
                  <p>
                    {formatDate(budget.period?.from)} -{' '}
                    {formatDate(budget.period?.to)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-muted-foreground">
                    Valor da Diária
                  </p>
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
                  <CardTitle className="text-sm font-medium">
                    Valor Bruto do Projeto
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold">
                    {formatCurrency(budget.total)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Custo com Material
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(budget.materialCost || 0)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Lucro do Projeto
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(budget.profit || 0)}
                  </p>
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
                    <CardTitle className="text-sm font-medium">
                      Valor Total (Líquido)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold">
                      {formatCurrency(budget.total)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(totalPaid)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Saldo Devedor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold text-red-600">
                      {formatCurrency(remainingBalance)}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <div>
                <Progress value={paymentPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {paymentPercentage.toFixed(0)}% pago
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Histórico de Pagamentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Observações</TableHead>
                        <TableHead>
                          <span className="sr-only">Ações</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {budget.paymentHistory && budget.paymentHistory.length > 0 ? (
                        budget.paymentHistory.map((p) => (
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
                                  <DropdownMenuItem
                                    onClick={() => handleEditPayment(p)}
                                  >
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
              Tem certeza que deseja excluir este pagamento? Esta ação não poderá
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePayment}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Compartilhar Orçamento</DialogTitle>
                <DialogDescription>
                    Copie o texto abaixo ou compartilhe diretamente no WhatsApp.
                </DialogDescription>
            </DialogHeader>
            <div className="mt-4 bg-muted/50 p-4 rounded-md max-h-[50vh] overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap font-sans">
                    {generateShareableMessage(budget, companyProfile)}
                </pre>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={handleCopyToClipboard}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar Texto
                </Button>
                <Button onClick={handleShareWhatsApp}>
                    <WhatsappIcon className="mr-2 h-4 w-4" />
                    Compartilhar no WhatsApp
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
