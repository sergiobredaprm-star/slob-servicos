import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { budgets } from '@/lib/data';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function RecentBudgets() {
  return (
    <div className="space-y-8">
      {budgets.slice(0, 5).map((budget, index) => (
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
            <p className="text-sm text-muted-foreground">{budget.email}</p>
          </div>
          <div className="ml-auto font-medium">
            {formatCurrency(budget.total)}
          </div>
        </div>
      ))}
    </div>
  );
}
