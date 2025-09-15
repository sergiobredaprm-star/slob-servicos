import { BudgetForm } from '@/components/app/budget/budget-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function NewBudgetPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">
            Criar Novo Orçamento
          </CardTitle>
          <CardDescription>
            Preencha os detalhes abaixo para criar um novo orçamento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BudgetForm />
        </CardContent>
      </Card>
    </div>
  );
}
