'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCollection, useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { Budget, Client } from '@/lib/types';
import { collection, doc, query, where } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail, Phone, User } from 'lucide-react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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


export default function ClientDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  const { firestore, user } = useFirebase();

  const clientDocRef = useMemoFirebase(
    () =>
      user && firestore && id
        ? doc(firestore, 'users', user.uid, 'clients', id as string)
        : null,
    [firestore, user, id]
  );

  const { data: client, isLoading: isLoadingClient } = useDoc<Client>(clientDocRef);

  const budgetsQuery = useMemoFirebase(() =>
    user && firestore && id
        ? query(
            collection(firestore, 'users', user.uid, 'budgets'),
            where('clientId', '==', id)
        )
        : null
  , [firestore, user, id]);

  const {data: budgets, isLoading: isLoadingBudgets} = useCollection<Budget>(budgetsQuery);


  if (isLoadingClient) {
    return <div className="flex h-screen items-center justify-center">Carregando detalhes do cliente...</div>;
  }

  if (!client) {
    return <div className="flex h-screen items-center justify-center">Cliente não encontrado.</div>;
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
                        <CardTitle className="font-headline text-2xl flex items-center gap-2">
                           <User className="h-6 w-6" /> {client.name}
                        </CardTitle>
                        <CardDescription>
                            Detalhes e histórico do cliente.
                        </CardDescription>
                    </div>
                     <Button asChild>
                        <Link href={`/clientes/${id}/editar`}>Editar Cliente</Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6 text-sm">
               <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="font-medium text-muted-foreground flex items-center gap-2"><Mail className="h-4 w-4" /> Email</p>
                        <p>{client.contactEmail || 'Não informado'}</p>
                    </div>
                     <div className="space-y-1">
                        <p className="font-medium text-muted-foreground flex items-center gap-2"><Phone className="h-4 w-4" /> Telefone</p>
                        <p>{client.contactPhone || 'Não informado'}</p>
                    </div>
                </div>
                 <div className="space-y-1">
                    <p className="font-medium text-muted-foreground">Observações</p>
                    <p className="whitespace-pre-wrap">{client.notes || 'Nenhuma observação.'}</p>
                </div>

            </CardContent>
        </Card>

         <Card>
            <CardHeader>
                <CardTitle>Orçamentos do Cliente</CardTitle>
                <CardDescription>Lista de todos os orçamentos associados a este cliente.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tarefa</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead><span className="sr-only">Ações</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoadingBudgets && <TableRow><TableCell colSpan={5} className="text-center">Carregando orçamentos...</TableCell></TableRow>}
                        {!isLoadingBudgets && budgets && budgets.map(budget => (
                             <TableRow key={budget.id}>
                                <TableCell className="font-medium">{budget.task}</TableCell>
                                <TableCell>{formatDate(budget.registrationDate)}</TableCell>
                                <TableCell><Badge variant="outline">{budget.status}</Badge></TableCell>
                                <TableCell className="text-right">{formatCurrency(budget.total)}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={`/orcamentos/${budget.id}`}>Ver</Link>
                                    </Button>
                                </TableCell>
                             </TableRow>
                        ))}
                         {!isLoadingBudgets && (!budgets || budgets.length === 0) && <TableRow><TableCell colSpan={5} className="text-center">Nenhum orçamento encontrado para este cliente.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </CardContent>
         </Card>
    </div>
  );
}
