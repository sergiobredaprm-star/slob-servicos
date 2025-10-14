'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Client } from '@/lib/types';
import { useFirebase, useUser } from '@/firebase';
import { saveClient } from '@/lib/firebase/client-services';
import { Loader2 } from 'lucide-react';
import { formatPhoneNumber } from '@/lib/utils';

const phoneRegex = new RegExp(
  /^\(\d{2}\)\s\d{4,5}-\d{4}$/
);

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'O nome do cliente deve ter pelo menos 2 caracteres.',
  }),
  contactEmail: z.string().email({ message: 'Por favor, insira um e-mail válido.' }).optional().or(z.literal('')),
  contactPhone: z.string().regex(phoneRegex, 'Número de telefone inválido. Use (xx) xxxxx-xxxx.').optional().or(z.literal('')),
  notes: z.string().optional(),
});

type ClientFormProps = {
  initialData?: Client;
  clientId?: string;
};

export function ClientForm({ initialData, clientId }: ClientFormProps) {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isSubmitPending, startSubmitTransition] = useTransition();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: '',
      contactEmail: '',
      contactPhone: '',
      notes: '',
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Você precisa estar logado para salvar um cliente.',
      });
      return;
    }

    startSubmitTransition(async () => {
      const clientData: Omit<Client, 'id'> = {
        ...values,
        userId: user.uid,
      };

      try {
        await saveClient(firestore, user.uid, clientData, clientId);
        toast({
          title: `Cliente ${clientId ? 'Atualizado' : 'Criado'}!`,
          description: `O cliente foi salvo com sucesso.`,
          className: 'bg-accent text-accent-foreground',
        });
        router.push('/clientes');
      } catch (error) {
         toast({
          variant: 'destructive',
          title: 'Erro ao Salvar',
          description: `Não foi possível salvar o cliente. Tente novamente.`,
        });
      }
    });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedNumber = formatPhoneNumber(e.target.value);
    form.setValue('contactPhone', formattedNumber);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Cliente</FormLabel>
              <FormControl>
                <Input placeholder="Nome completo ou da empresa" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contactEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email de Contato</FormLabel>
              <FormControl>
                <Input type="email" placeholder="email@exemplo.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contactPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone de Contato</FormLabel>
              <FormControl>
                <Input
                  placeholder="(xx) xxxxx-xxxx"
                  {...field}
                  onChange={handlePhoneChange}
                  maxLength={15}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Qualquer informação adicional sobre o cliente..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitPending}>
          {isSubmitPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {clientId ? 'Salvar Alterações' : 'Criar Cliente'}
        </Button>
      </form>
    </Form>
  );
}
