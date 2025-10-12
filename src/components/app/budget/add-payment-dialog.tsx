'use client';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { addPaymentToBudget } from '@/lib/firebase/services';

const paymentSchema = z.object({
  amount: z.coerce
    .number()
    .positive({ message: 'O valor deve ser maior que zero.' }),
  date: z.date({ required_error: 'A data do pagamento é obrigatória.' }),
  notes: z.string().optional(),
});

type AddPaymentDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  maxAmount: number;
};

export function AddPaymentDialog({
  isOpen,
  onOpenChange,
  budgetId,
  maxAmount,
}: AddPaymentDialogProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema.refine(data => data.amount <= maxAmount, {
        message: `O valor não pode ser maior que o saldo devedor de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(maxAmount)}.`,
        path: ['amount'],
    })),
    defaultValues: {
      amount: undefined,
      date: new Date(),
      notes: '',
    },
  });

  const onSubmit = (values: z.infer<typeof paymentSchema>) => {
    if (!user || !firestore) return;

    startTransition(async () => {
      try {
        await addPaymentToBudget(firestore, user.uid, budgetId, values);
        toast({
          title: 'Pagamento Adicionado!',
          description: 'O novo pagamento foi registrado com sucesso.',
        });
        onOpenChange(false);
        form.reset();
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Não foi possível adicionar o pagamento.',
        });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Pagamento</DialogTitle>
          <DialogDescription>
            Registre um novo pagamento para este orçamento.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor do Pagamento</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0,00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data do Pagamento</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP', { locale: ptBR })
                          ) : (
                            <span>Escolha uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Pagamento da primeira parcela"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Pagamento
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
