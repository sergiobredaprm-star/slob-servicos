'use client';

import { ClientForm } from '@/components/app/client/client-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { Client } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { useParams } from 'next/navigation';

export default function EditClientPage() {
  const params = useParams();
  const { id } = params;
  const { firestore, user } = useFirebase();

  const clientDocRef = useMemoFirebase(
    () =>
      user && firestore && id
        ? doc(firestore, 'users', user.uid, 'clients', id as string)
        : null,
    [firestore, user, id]
  );

  const { data: client, isLoading } = useDoc<Client>(clientDocRef);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Carregando cliente...</div>;
  }

  if (!client) {
    return <div className="flex h-screen items-center justify-center">Cliente não encontrado.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">
            Editar Cliente
          </CardTitle>
          <CardDescription>
            Ajuste os detalhes do seu cliente abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientForm initialData={client} clientId={id as string} />
        </CardContent>
      </Card>
    </div>
  );
}
