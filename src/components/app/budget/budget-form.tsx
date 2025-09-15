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

const formSchema = z.object({
  clientName: z.string().min(2, {
    message: 'O nome do cliente deve ter pelo menos 2 caracteres.',
  }),
  clientDescription: z.string().optional(),
  task: z.string().min(5, {
    message: 'A descrição da tarefa deve ter pelo menos 5 caracteres.',
  }),
  period: z
    .object({
      from: z.date(),
      to: z.date(),
    })
    .refine((data) => data.from < data.to, {
      message: 'A data de início deve ser anterior à data de término.',
      path: ['from'],
    }),
  dailyRate: z.coerce.number().min(1, { message: 'O valor deve ser maior que 0.' }),
});

export function BudgetForm() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 5),
  });
  const [isAiPending, startAiTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: '',
      clientDescription: '',
      task: '',
      dailyRate: 150,
      period: {
        from: new Date(),
        to: addDays(new Date(), 5),
      },
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    console.log(values);
    toast({
      title: 'Orçamento Criado!',
      description: 'O novo orçamento foi salvo com sucesso.',
      className: 'bg-accent text-accent-foreground',
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

  const workDays = date?.from && date?.to ? differenceInCalendarDays(date.to, date.from) + 1 : 0;
  const dailyRateValue = form.watch('dailyRate');
  const total = workDays * (dailyRateValue || 0);

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
                    <Input type="number" placeholder="150" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <Card className="bg-muted/50">
            <CardHeader>
                <CardTitle className="text-lg">Resumo do Orçamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Diárias:</span>
                    <span>{workDays} dia(s)</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor da diária:</span>
                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dailyRateValue)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}</span>
                </div>
            </CardContent>
        </Card>

        <Button type="submit">Criar Orçamento</Button>
      </form>
    </Form>
  );
}
