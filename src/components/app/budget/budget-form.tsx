'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CalendarIcon, Sparkles, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { useState, useTransition } from 'react';
import { getTaskSuggestionsAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { addDays, differenceInCalendarDays } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Budget } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useFirebase, useUser } from '@/firebase';
import { saveBudget } from '@/lib/firebase/services';

const formSchema = z.object({
  clientName: z.string().min(2, {
    message: 'O nome do cliente deve ter pelo menos 2 caracteres.',
  }),
  clientDescription: z.string().optional(),
  budgetType: z.enum(['daily', 'task'], {
    required_error: 'Você precisa selecionar um tipo de orçamento.',
  }),
  deadline: z.date().optional(),
  task: z.string().min(5, {
    message: 'A descrição da tarefa deve ter pelo menos 5 caracteres.',
  }),
  period: z
    .object({
      from: z.date(),
      to: z.date(),
    })
    .optional(),
  dailyRate: z.coerce.number().optional(),
  total: z.coerce.number().optional(),
}).refine(data => {
  if (data.budgetType === 'daily') {
    return !!data.period && !!data.dailyRate && data.dailyRate > 0 && !!data.period.from && !!data.period.to && data.period.from < data.period.to;
  }
  return true;
}, {
  message: 'Para orçamento por diária, o período e o valor da diária são obrigatórios.',
  path: ['budgetType'],
}).refine(data => {
    if (data.budgetType === 'task') {
        return !!data.total && data.total > 0;
    }
    return true;
}, {
    message: 'Para orçamento por tarefa, o valor total é obrigatório.',
    path: ['budgetType'],
});


export function BudgetForm() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const router = useRouter();
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 5),
  });
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [isAiPending, startAiTransition] = useTransition();
  const [isSubmitPending, startSubmitTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: '',
      clientDescription: '',
      task: '',
      budgetType: 'daily',
      dailyRate: 150,
      period: {
        from: new Date(),
        to: addDays(new Date(), 5),
      },
      total: 0,
    },
  });

  const budgetType = form.watch('budgetType');

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Erro de Autenticação',
        description: 'Você precisa estar logado para criar um orçamento.',
      });
      return;
    }

    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Erro de Configuração',
        description: 'O Firestore não está disponível. Verifique sua conexão.',
      });
      return;
    }

    startSubmitTransition(async () => {
      let finalTotal = 0;
      if (values.budgetType === 'daily' && values.period?.from && values.period?.to && values.dailyRate) {
        const workDays = differenceInCalendarDays(values.period.to, values.period.from) + 1;
        finalTotal = workDays * values.dailyRate;
      } else if (values.budgetType === 'task' && values.total) {
        finalTotal = values.total;
      }

      const budgetData: Omit<Budget, 'id' | 'userId'> = {
        clientName: values.clientName,
        clientDescription: values.clientDescription,
        task: values.task,
        budgetType: values.budgetType,
        dailyRate: values.dailyRate,
        period: values.period,
        deadline: values.deadline,
        total: finalTotal,
        status: 'ativo',
      };

      try {
        await saveBudget(firestore, user.uid, budgetData);
        toast({
          title: 'Orçamento Criado!',
          description: 'O novo orçamento foi salvo com sucesso.',
          className: 'bg-accent text-accent-foreground',
        });
        router.push('/orcamentos');
      } catch (error) {
         toast({
          variant: 'destructive',
          title: 'Erro ao Salvar',
          description: 'Não foi possível salvar o orçamento. Tente novamente.',
        });
      }
    });
  };

  const handleGetSuggestions = () => {
    const clientName = form.getValues('clientName');
    const clientDescription = form.getValues('clientDescription');

    if (!clientName || !clientDescription) {
      toast({
        variant: 'destructive',
        title: 'Faltam informações',
        description:
          'Preencha o nome e a descrição do cliente para obter sugestões.',
      });
      return;
    }
    startAiTransition(async () => {
      const result = await getTaskSuggestionsAction({
        clientName,
        clientDescription,
      });
      if (result.error) {
        toast({ variant: 'destructive', title: 'Erro', description: result.error });
      } else if (result.suggestions) {
        setSuggestions(result.suggestions);
      }
    });
  };

  const workDays = budgetType === 'daily' && date?.from && date?.to ? differenceInCalendarDays(date.to, date.from) + 1 : 0;
  const dailyRateValue = form.watch('dailyRate') || 0;
  const taskTotal = form.watch('total') || 0;
  const total = budgetType === 'daily' ? workDays * dailyRateValue : taskTotal;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="clientName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Cliente</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Tech Solutions" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="clientDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição do Cliente</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descreva o cliente e suas necessidades..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
            control={form.control}
            name="budgetType"
            render={({ field }) => (
                <FormItem className="space-y-3">
                <FormLabel>Tipo de Orçamento</FormLabel>
                <FormControl>
                    <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                    >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                        <RadioGroupItem value="daily" />
                        </FormControl>
                        <FormLabel className="font-normal">
                        Por Diária
                        </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                        <RadioGroupItem value="task" />
                        </FormControl>
                        <FormLabel className="font-normal">
                        Por Tarefa (Valor Fechado)
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
              name="deadline"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Prazo de Entrega (Opcional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'pl-3 text-left font-normal',
                            !deadline && 'text-muted-foreground'
                          )}
                        >
                          {deadline ? (
                            format(deadline, 'PPP', { locale: ptBR })
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
                        selected={deadline}
                        onSelect={(date) => {
                          setDeadline(date);
                          if(date) field.onChange(date);
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
        </div>
        
        <FormField
          control={form.control}
          name="task"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tarefa a ser Realizada</FormLabel>
              <FormControl>
                <Textarea placeholder="Descreva a tarefa em detalhes..." {...field} />
              </FormControl>
              <FormDescription className="flex items-center justify-between pt-2">
                <span>
                  Precisando de ideias? Use nosso assistente de IA.
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGetSuggestions}
                  disabled={isAiPending}
                >
                  {isAiPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4 text-primary" />
                  )}
                  Sugerir Tarefas
                </Button>
              </FormDescription>
              {suggestions.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-sm font-medium">Sugestões da IA:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s, i) => (
                      <Button
                        key={i}
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => form.setValue('task', s)}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {budgetType === 'daily' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormField
              control={form.control}
              name="period"
              render={({ field }) => (
                  <FormItem className="flex flex-col">
                  <FormLabel>Período de Trabalho</FormLabel>
                  <Popover>
                      <PopoverTrigger asChild>
                      <FormControl>
                          <Button
                          variant={'outline'}
                          className={cn(
                              'pl-3 text-left font-normal',
                              !date && 'text-muted-foreground'
                          )}
                          >
                          {date?.from ? (
                              date.to ? (
                              <>
                                  {format(date.from, 'LLL dd, y', { locale: ptBR })} -{' '}
                                  {format(date.to, 'LLL dd, y', { locale: ptBR })}
                              </>
                              ) : (
                              format(date.from, 'LLL dd, y', { locale: ptBR })
                              )
                          ) : (
                              <span>Escolha um período</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                      </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={date?.from}
                          selected={date}
                          onSelect={(range) => {
                              setDate(range);
                              if(range) field.onChange(range);
                          }}
                          numberOfMonths={2}
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
              name="dailyRate"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Valor da Diária (R$)</FormLabel>
                  <FormControl>
                      <Input type="number" placeholder="150" {...field} value={field.value ?? ''}/>
                  </FormControl>
                  <FormMessage />
                  </FormItem>
              )}
              />
          </div>
        )}

        {budgetType === 'task' && (
            <FormField
            control={form.control}
            name="total"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Valor Total da Tarefa (R$)</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="500" {...field} value={field.value ?? ''}/>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        )}


        <Card className="bg-muted/50">
            <CardHeader>
                <CardTitle className="text-lg">Resumo do Orçamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {budgetType === 'daily' && (
                  <>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Diárias:</span>
                        <span>{workDays} dia(s)</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor da diária:</span>
                        <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dailyRateValue)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}</span>
                </div>
            </CardContent>
        </Card>

        <Button type="submit" disabled={isSubmitPending}>
          {isSubmitPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Criar Orçamento
        </Button>
      </form>
    </Form>
  );
}
