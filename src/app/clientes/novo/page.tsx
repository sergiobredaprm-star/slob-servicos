'use client';

import { ClientForm } from '@/components/app/client/client-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function NewClientPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">
            Criar Novo Cliente
          </CardTitle>
          <CardDescription>
            Preencha os detalhes abaixo para adicionar um novo cliente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientForm />
        </CardContent>
      </Card>
    </div>
  );
}
