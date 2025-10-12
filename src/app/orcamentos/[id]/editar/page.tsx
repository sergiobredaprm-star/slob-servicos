'use client';

import { BudgetForm } from '@/components/app/budget/budget-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { Budget } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { useParams } from 'next/navigation';

export default function EditBudgetPage() {
  const params = useParams();
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
    return <div className="flex h-screen items-center justify-center">Carregando orçamento...</div>;
  }

  if (!budget) {
    return <div className="flex h-screen items-center justify-center">Orçamento não encontrado.</div>;
  }

  const budgetWithDates = {
    ...budget,
    registrationDate: budget.registrationDate ? (budget.registrationDate as any).toDate() : undefined,
    period: {
      from: budget.period?.from ? (budget.period.from as any).toDate() : undefined,
      to: budget.period?.to ? (budget.period.to as any).toDate() : undefined,
    },
    deadline: budget.deadline ? (budget.deadline as any).toDate() : undefined,
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">
            Editar Orçamento
          </CardTitle>
          <CardDescription>
            Ajuste os detalhes do seu orçamento abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BudgetForm initialData={budgetWithDates as Budget} budgetId={id as string} />
        </CardContent>
      </Card>
    </div>
  );
}
