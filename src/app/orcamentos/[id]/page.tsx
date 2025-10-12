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
import { Budget, BudgetStatus } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

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

  const budgetDocRef = useMemoFirebase(
    () =>
      user && firestore && id
        ? doc(firestore, 'users', user.uid, 'budgets', id as string)
        : null,
    [firestore, user, id]
  );

  const { data: budget, isLoading } = useDoc<Budget>(budgetDocRef);

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
            </CardContent>
            <CardFooter className="bg-muted/50 p-6 flex justify-end">
                 <div className="text-right space-y-1">
                    <p className="font-medium text-muted-foreground">Valor Total do Orçamento</p>
                    <p className="font-bold text-2xl">{formatCurrency(budget.total)}</p>
                </div>
            </CardFooter>
        </Card>
    </div>
  );
}
