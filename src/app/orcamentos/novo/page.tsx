'use client';

import { BudgetForm } from '@/components/app/budget/budget-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function NewBudgetPageContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId');
  const clientName = searchParams.get('clientName');
  const clientDescription = searchParams.get('clientDescription');

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">
            Criar Novo Orçamento
          </CardTitle>
          <CardDescription>
            Preencha os detalhes abaixo para criar um novo orçamento.
            {clientName && ` para ${decodeURIComponent(clientName)}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BudgetForm
            preselectedClientId={clientId ?? undefined}
            preselectedClientName={clientName ? decodeURIComponent(clientName) : undefined}
            preselectedClientDescription={clientDescription ? decodeURIComponent(clientDescription) : undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}


export default function NewBudgetPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <NewBudgetPageContent />
    </Suspense>
  )
}
