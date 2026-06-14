'use client';
import { useState, useTransition, useEffect } from 'react';
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
import { cn, parseDate } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Loader2, QrCode, Coins, CreditCard, Wallet } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { addPaymentToBudget, updatePaymentInBudget } from '@/lib/firebase/services';
import { Payment } from '@/lib/types';

const paymentSchema = z.object({
  amount: z.coerce
    .number()
    .positive({ message: 'O valor deve ser maior que zero.' }),
  date: z.date({ required_error: 'A data do pagamento é obrigatória.' }),
  method: z.enum(['pix', 'dinheiro', 'cartão', 'outro'], {
    required_error: 'Selecione o método de pagamento.',
  }),
  notes: z.string().optional(),
});

type AddPaymentDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  maxAmount: number;
  paymentToEdit?: Payment | null;
};

export function AddPaymentDialog({
  isOpen,
  onOpenChange,
  budgetId,
  maxAmount,
  paymentToEdit,
}: AddPaymentDialogProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const isEditing = !!paymentToEdit;
  
  const validationSchema = paymentSchema.refine(data => data.amount <= maxAmount + (isEditing ? paymentToEdit.amount : 0), {
    message: `O valor não pode ser maior que o saldo devedor.`,
    path: ['amount'],
  });

  const form = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      amount: '' as any,
      date: new Date(),
      method: 'pix',
      notes: '',
    },
  });

  useEffect(() => {
    if (paymentToEdit && isOpen) {
      form.reset({
        amount: paymentToEdit.amount,
        date: parseDate(paymentToEdit.date) || new Date(),
        method: paymentToEdit.method || 'pix',
        notes: paymentToEdit.notes || '',
      });
    } else if (!isOpen) {
       form.reset({
        amount: '' as any,
        date: new Date(),
        method: 'pix',
        notes: '',
      });
    }
  }, [paymentToEdit, isOpen, form]);

  const onSubmit = (values: z.infer<typeof paymentSchema>) => {
    if (!user || !firestore) return;

    startTransition(async () => {
      try {
        if (isEditing && paymentToEdit) {
            const updatedPayment = { ...paymentToEdit, ...values };
            await updatePaymentInBudget(firestore, user.uid, budgetId, updatedPayment);
            toast({
              title: 'Pagamento Atualizado!',
              description: 'O pagamento foi atualizado com sucesso.',
            });
        } else {
            await addPaymentToBudget(firestore, user.uid, budgetId, values);
            toast({
              title: 'Pagamento Adicionado!',
              description: 'O novo pagamento foi registrado com sucesso.',
            });
        }
        
        onOpenChange(false);
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: `Não foi possível ${isEditing ? 'atualizar' : 'adicionar'} o pagamento.`,
        });
      }
    });
  };
  
  const handlePayTotal = () => {
    const totalPayable = isEditing ? maxAmount + paymentToEdit.amount : maxAmount;
    const roundedTotalAmount = parseFloat(totalPayable.toFixed(2));
    form.setValue('amount', roundedTotalAmount, { shouldValidate: true });
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Pagamento' : 'Adicionar Pagamento'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize os detalhes do pagamento.' : 'Registre um novo pagamento para este orçamento.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Método de Pagamento</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-2 sm:grid-cols-4 gap-2"
                    >
                      <FormItem>
                        <FormControl>
                          <RadioGroupItem value="pix" className="sr-only" />
                        </FormControl>
                        <FormLabel className={cn(
                          "flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all duration-200",
                          field.value === 'pix' && "border-primary bg-primary/5 shadow-md shadow-primary/10"
                        )}>
                          <QrCode className={cn("mb-2 h-5 w-5", field.value === 'pix' ? "text-primary" : "text-muted-foreground")} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">PIX</span>
                        </FormLabel>
                      </FormItem>

                      <FormItem>
                        <FormControl>
                          <RadioGroupItem value="dinheiro" className="sr-only" />
                        </FormControl>
                        <FormLabel className={cn(
                          "flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all duration-200",
                          field.value === 'dinheiro' && "border-emerald-500 bg-emerald-500/5 shadow-md shadow-emerald-500/10"
                        )}>
                          <Coins className={cn("mb-2 h-5 w-5", field.value === 'dinheiro' ? "text-emerald-500" : "text-muted-foreground")} />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-center">Dinheiro</span>
                        </FormLabel>
                      </FormItem>

                      <FormItem>
                        <FormControl>
                          <RadioGroupItem value="cartão" className="sr-only" />
                        </FormControl>
                        <FormLabel className={cn(
                          "flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all duration-200",
                          field.value === 'cartão' && "border-blue-500 bg-blue-500/5 shadow-md shadow-blue-500/10"
                        )}>
                          <CreditCard className={cn("mb-2 h-5 w-5", field.value === 'cartão' ? "text-blue-500" : "text-muted-foreground")} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Cartão</span>
                        </FormLabel>
                      </FormItem>

                      <FormItem>
                        <FormControl>
                          <RadioGroupItem value="outro" className="sr-only" />
                        </FormControl>
                        <FormLabel className={cn(
                          "flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all duration-200",
                          field.value === 'outro' && "border-orange-500 bg-orange-500/5 shadow-md shadow-orange-500/10"
                        )}>
                          <Wallet className={cn("mb-2 h-5 w-5", field.value === 'outro' ? "text-orange-500" : "text-muted-foreground")} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Outro</span>
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Valor do Pagamento</FormLabel>
                    {maxAmount > 0 && (
                      <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={handlePayTotal}>
                        Pagamento Total
                      </Button>
                    )}
                  </div>
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
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
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
                        onSelect={(date) => {
                          field.onChange(date);
                          setIsCalendarOpen(false);
                        }}
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
                {isEditing ? 'Salvar Alterações' : 'Salvar Pagamento'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
