'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { Budget } from '@/lib/types';
import { collection, query, orderBy, limit } from 'firebase/firestore';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function RecentBudgets() {
  const { firestore, user } = useFirebase();

  const recentBudgetsQuery = useMemoFirebase(
    () =>
      user && firestore
        ? query(
            collection(firestore, 'users', user.uid, 'budgets'),
            orderBy('period.from', 'desc'),
            limit(5)
          )
        : null,
    [firestore, user]
  );
  
  const { data: budgets, isLoading } = useCollection<Budget>(recentBudgetsQuery);

  if (isLoading) {
    return <div>Carregando orçamentos recentes...</div>;
  }


  return (
    <div className="space-y-8">
      {budgets?.map((budget, index) => (
        <div key={budget.id} className="flex items-center">
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={`https://picsum.photos/seed/${index + 10}/40/40`}
              alt="Avatar"
              data-ai-hint="company logo"
            />
            <AvatarFallback>
              {budget.clientName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">
              {budget.clientName}
            </p>
            <p className="text-sm text-muted-foreground">{budget.task}</p>
          </div>
          <div className="ml-auto font-medium">
            {formatCurrency(budget.total)}
          </div>
        </div>
      ))}
       {!budgets || budgets.length === 0 && (
        <p className="text-sm text-muted-foreground text-center">Nenhum orçamento recente.</p>
      )}
    </div>
  );
}
