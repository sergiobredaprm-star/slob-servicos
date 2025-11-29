'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CalendarIcon, Sparkles, Loader2, Check, ChevronsUpDown, Trash2, PlusCircle } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { useState, useTransition, useEffect, useMemo } from 'react';
import { getTaskSuggestionsAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { addDays, differenceInCalendarDays } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Budget, Client, ServiceType, ElectricalItem, ElectricalServiceItem, HydraulicItem, HydraulicServiceItem } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCollection, useFirebase, useMemoFirebase, useUser } from '@/firebase';
import { saveBudget } from '@/lib/firebase/services';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { collection, query } from 'firebase/firestore';

const serviceTypes: ServiceType[] = ['Pintura', 'Elétrica', 'Hidráulica', 'Alvenaria', 'Outro'];

const electricalItemSchema = z.object({
  name: z.string().min(1, 'A descrição do item é obrigatória.'),
  quantity: z.coerce.number().min(1, 'A quantidade deve ser pelo menos 1.'),
  value: z.coerce.number().min(0, 'O valor deve ser positivo.'),
});

const hydraulicItemSchema = z.object({
  name: z.string().min(1, 'A descrição do item é obrigatória.'),
  quantity: z.coerce.number().min(1, 'A quantidade deve ser pelo menos 1.'),
  value: z.coerce.number().min(0, 'O valor deve ser positivo.'),
});

const formSchema = z.object({
  clientId: z.string().min(1, {
    message: 'Selecione um cliente.',
  }),
  clientName: z.string(),
  clientDescription: z.string().optional(),
  serviceType: z.string().min(1, { message: 'Selecione um tipo de serviço.'}),
  registrationDate: z.date({
    required_error: "A data de registro é obrigatória.",
  }),
  budgetType: z.enum(['daily', 'task'], {
    required_error: 'Você precisa selecionar um tipo de orçamento.',
  }),
  deadline: z.date().optional(),
  task: z.string().min(5, {
    message: 'A descrição da tarefa deve ter pelo menos 5 caracteres.',
  }),
  period: z
    .object({
      from: z.date().optional(),
      to: z.date().optional(),
    })
    .optional(),
  dailyRate: z.coerce.number().optional(),
  total: z.coerce.number().optional(),
  materialCost: z.coerce.number().optional(),
  status: z.enum(['prospecção', 'ativo', 'concluído', 'cancelado']),
  wallWidth: z.coerce.number().optional(),
  wallHeight: z.coerce.number().optional(),
  sqMetersPrice: z.coerce.number().optional(),
  paintCoats: z.coerce.number().optional(),
  electricalItems: z.array(electricalItemSchema).optional(),
  hydraulicItems: z.array(hydraulicItemSchema).optional(),
}).refine(data => {
  if (data.budgetType === 'daily') {
    return !!data.period && !!data.dailyRate && data.dailyRate > 0 && !!data.period.from && !!data.period.to && data.period.from < data.period.to;
  }
  return true;
}, {
  message: 'Para orçamento por diária, o período e o valor da diária são obrigatórios.',
  path: ['budgetType'],
}).refine(data => {
    if (data.budgetType === 'task' && data.serviceType !== 'Pintura' && data.serviceType !== 'Elétrica' && data.serviceType !== 'Hidráulica') {
        return !!data.total && data.total > 0;
    }
    return true;
}, {
    message: 'Para orçamento por tarefa, o valor total é obrigatório.',
    path: ['total'],
});

type BudgetFormProps = {
  initialData?: Budget;
  budgetId?: string;
  preselectedClientId?: string;
  preselectedClientName?: string;
};

export function BudgetForm({ initialData, budgetId, preselectedClientId, preselectedClientName }: BudgetFormProps) {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isAiPending, startAiTransition] = useTransition();
  const [isSubmitPending, startSubmitTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const [isRegistrationDateOpen, setIsRegistrationDateOpen] = useState(false);
  const [isDeadlineOpen, setIsDeadlineOpen] = useState(false);
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);
  
  const clientsQuery = useMemoFirebase(() => 
    user && firestore ? query(collection(firestore, 'users', user.uid, 'clients')) : null
  , [firestore, user]);

  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);
  
  const electricalItemsQuery = useMemoFirebase(
    () => user && firestore ? query(collection(firestore, 'users', user.uid, 'electricalServiceItems')) : null,
    [firestore, user]
  );
  
  const { data: electricalServiceItems, isLoading: isLoadingElectricalItems } = useCollection<ElectricalServiceItem>(electricalItemsQuery);
  
  const hydraulicItemsQuery = useMemoFirebase(
    () => user && firestore ? query(collection(firestore, 'users', user.uid, 'hydraulicServiceItems')) : null,
    [firestore, user]
  );

  const { data: hydraulicServiceItems, isLoading: isLoadingHydraulicItems } = useCollection<HydraulicServiceItem>(hydraulicItemsQuery);


  const sortedClients = useMemo(() => {
    if (!clients) return [];
    return [...clients].sort((a, b) => a.name.localeCompare(b.name));
  }, [clients]);

  const sortedElectricalServiceItems = useMemo(() => {
    if (!electricalServiceItems) return [];
    return [...electricalServiceItems].sort((a, b) => a.name.localeCompare(b.name));
  }, [electricalServiceItems]);
  
  const sortedHydraulicServiceItems = useMemo(() => {
    if (!hydraulicServiceItems) return [];
    return [...hydraulicServiceItems].sort((a, b) => a.name.localeCompare(b.name));
  }, [hydraulicServiceItems]);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      ...initialData,
       registrationDate: initialData.registrationDate as Date | undefined,
       period: {
        from: initialData.period?.from as Date | undefined,
        to: initialData.period?.to as Date | undefined,
      },
      deadline: initialData.deadline as Date | undefined,
      clientId: initialData.clientId || '',
      electricalItems: initialData.electricalItems && initialData.electricalItems.length > 0 ? initialData.electricalItems : [{ name: '', quantity: 1, value: 0 }],
      hydraulicItems: initialData.hydraulicItems && initialData.hydraulicItems.length > 0 ? initialData.hydraulicItems : [{ name: '', quantity: 1, value: 0 }],
    } : {
      clientId: preselectedClientId || '',
      clientName: preselectedClientName || '',
      clientDescription: '',
      serviceType: undefined,
      registrationDate: new Date(),
      task: '',
      budgetType: 'daily',
      dailyRate: 150,
      period: {
        from: new Date(),
        to: addDays(new Date(), 5),
      },
      total: 0,
      materialCost: 0,
      status: 'prospecção',
      wallHeight: 0,
      wallWidth: 0,
      sqMetersPrice: 0,
      paintCoats: 2,
      electricalItems: [{ name: '', quantity: 1, value: 0 }],
      hydraulicItems: [{ name: '', quantity: 1, value: 0 }],
    },
  });

  const { fields: electricalFields, append: electricalAppend, remove: electricalRemove, update: electricalUpdate } = useFieldArray({
    control: form.control,
    name: 'electricalItems',
  });
  
  const { fields: hydraulicFields, append: hydraulicAppend, remove: hydraulicRemove, update: hydraulicUpdate } = useFieldArray({
    control: form.control,
    name: 'hydraulicItems',
  });

   useEffect(() => {
    if (initialData && clients) {
        const client = clients.find(c => c.id === initialData.clientId);
        if (client) {
            form.setValue('clientId', client.id);
            form.setValue('clientName', client.name);
        }
    }
   }, [initialData, clients, form]);
  
  const [date, setDate] = useState<DateRange | undefined>(form.getValues('period'));
  const [deadline, setDeadline] = useState<Date | undefined>(form.getValues('deadline'));
  const [registrationDate, setRegistrationDate] = useState<Date | undefined>(form.getValues('registrationDate'));

  const budgetType = form.watch('budgetType');
  const serviceType = form.watch('serviceType');

  const wallWidth = form.watch('wallWidth') || 0;
  const wallHeight = form.watch('wallHeight') || 0;
  const sqMetersPrice = form.watch('sqMetersPrice') || 0;
  const paintCoats = form.watch('paintCoats') || 0;
  const totalArea = wallWidth * wallHeight;

  const electricalItems = form.watch('electricalItems');
  const hydraulicItems = form.watch('hydraulicItems');

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Você precisa estar logado e o Firestore deve estar disponível.',
      });
      return;
    }

    startSubmitTransition(async () => {
      let finalTotal = 0;
      if (values.budgetType === 'daily' && values.period?.from && values.period?.to && values.dailyRate) {
        const workDays = differenceInCalendarDays(values.period.to, values.period.from) + 1;
        finalTotal = workDays * values.dailyRate;
      } else if (values.budgetType === 'task') {
        if (values.serviceType === 'Pintura' && values.wallWidth && values.wallHeight && values.sqMetersPrice && values.paintCoats) {
          finalTotal = values.wallWidth * values.wallHeight * values.sqMetersPrice * values.paintCoats;
        } else if (values.serviceType === 'Elétrica' && values.electricalItems) {
            finalTotal = values.electricalItems.reduce((acc, item) => acc + (item.quantity * item.value), 0);
        } else if (values.serviceType === 'Hidráulica' && values.hydraulicItems) {
            finalTotal = values.hydraulicItems.reduce((acc, item) => acc + (item.quantity * item.value), 0);
        } else if (values.total) {
          finalTotal = values.total;
        }
      }

      const materialCost = values.materialCost || 0;
      const profit = finalTotal - materialCost;

      const budgetData: Omit<Budget, 'id'> = {
        ...values,
        clientId: values.clientId, // Ensure clientId is included
        total: finalTotal,
        materialCost: materialCost,
        profit: profit,
        userId: user.uid,
        serviceType: values.serviceType as ServiceType,
        electricalItems: values.serviceType === 'Elétrica' ? values.electricalItems : [],
        hydraulicItems: values.serviceType === 'Hidráulica' ? values.hydraulicItems : [],
        registrationDate: values.registrationDate || new Date(),
      };

      try {
        await saveBudget(firestore, user.uid, budgetData, budgetId);
        toast({
          title: `Orçamento ${budgetId ? 'Atualizado' : 'Criado'}!`,
          description: `O orçamento foi salvo com sucesso.`,
          className: 'bg-accent text-accent-foreground',
        });
        router.push('/orcamentos');
      } catch (error) {
         toast({
          variant: 'destructive',
          title: 'Erro ao Salvar',
          description: `Não foi possível salvar o orçamento. Tente novamente.`,
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

  let total = 0;
  if (budgetType === 'daily') {
    total = workDays * dailyRateValue;
  } else if (budgetType === 'task') {
    if (serviceType === 'Pintura') {
      total = wallWidth * wallHeight * sqMetersPrice * paintCoats;
    } else if (serviceType === 'Elétrica') {
        total = electricalItems?.reduce((acc, item) => acc + ((item.quantity || 0) * (item.value || 0)), 0) || 0;
    } else if (serviceType === 'Hidráulica') {
        total = hydraulicItems?.reduce((acc, item) => acc + ((item.quantity || 0) * (item.value || 0)), 0) || 0;
    } else {
      total = taskTotal;
    }
  }
  
  const materialCost = form.watch('materialCost') || 0;
  const profit = total - materialCost;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="clientId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Nome do Cliente</FormLabel>
               <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={isLoadingClients || !!preselectedClientId}
                    >
                      {isLoadingClients
                        ? "Carregando clientes..."
                        : field.value
                        ? sortedClients?.find(
                            (client) => client.id === field.value
                          )?.name
                        : "Selecione um cliente"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Procurar cliente..." />
                    <CommandList>
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandGroup>
                        {sortedClients?.map((client) => (
                          <CommandItem
                            value={client.name}
                            key={client.id}
                            onSelect={() => {
                              form.setValue('clientId', client.id);
                              form.setValue('clientName', client.name);
                              form.setValue('clientDescription', client.notes || '');
                              setIsComboboxOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                client.id === field.value
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {client.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
          name="serviceType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Serviço</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de serviço" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {serviceTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {budgetType === 'task' && serviceType === 'Pintura' && (
           <Card className="bg-muted/50 p-6">
             <CardHeader className="p-0 pb-4">
                <CardTitle className="text-lg">Cálculo de Pintura</CardTitle>
            </CardHeader>
             <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <FormField
                  control={form.control}
                  name="wallHeight"
                  render={({ field }) => (
                      <FormItem>
                        <FormLabel>Altura (m)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="2.7" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="wallWidth"
                  render={({ field }) => (
                      <FormItem>
                        <FormLabel>Largura (m)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="10" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                  )}
                />
                <div className="space-y-2">
                    <FormLabel>Área Total (m²)</FormLabel>
                    <div className="flex h-10 w-full items-center rounded-md border border-input bg-background/50 px-3 py-2 text-sm">
                        {totalArea.toFixed(2)} m²
                    </div>
                </div>
                <FormField
                  control={form.control}
                  name="sqMetersPrice"
                  render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor/m² (R$)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="25" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="paintCoats"
                  render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nº de Demãos</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="2" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                  )}
                />
             </div>
           </Card>
        )}

        {budgetType === 'task' && serviceType === 'Elétrica' && (
          <Card className="bg-muted/50 p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-lg">Itens do Serviço de Elétrica</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              {electricalFields.map((field, index) => {
                const item = electricalItems?.[index];
                const quantity = item?.quantity || 0;
                const value = item?.value || 0;
                const itemTotal = quantity * value;

                return (
                    <div key={field.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-end gap-4">
                      <FormField
                        control={form.control}
                        name={`electricalItems.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={cn(index > 0 && "sr-only")}>Item</FormLabel>
                             <Select
                              onValueChange={(value) => {
                                const selectedItem = sortedElectricalServiceItems?.find(item => item.name === value);
                                if (selectedItem) {
                                  electricalUpdate(index, { 
                                    name: selectedItem.name, 
                                    value: selectedItem.defaultValue,
                                    quantity: 1,
                                  });
                                }
                              }}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={isLoadingElectricalItems ? "Carregando..." : "Selecione um item ou digite"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {sortedElectricalServiceItems?.map(item => (
                                  <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`electricalItems.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={cn(index > 0 && "sr-only")}>Qtd.</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="1" {...field} className="w-20" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`electricalItems.${index}.value`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={cn(index > 0 && "sr-only")}>Valor Unit. (R$)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="50.00" {...field} className="w-28" />
                            </FormControl>
                             <FormMessage />
                          </FormItem>
                        )}
                      />
                       <div className="space-y-2">
                        <FormLabel className={cn(index > 0 && "sr-only")}>Valor Total (R$)</FormLabel>
                        <div className="flex h-10 w-28 items-center rounded-md border border-input bg-background/50 px-3 py-2 text-sm">
                           {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(itemTotal)}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => electricalRemove(index)}
                        disabled={electricalFields.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                )
              })}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => electricalAppend({ name: '', quantity: 1, value: 0 })}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Item
              </Button>
            </div>
          </Card>
        )}

        {budgetType === 'task' && serviceType === 'Hidráulica' && (
          <Card className="bg-muted/50 p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-lg">Itens do Serviço de Hidráulica</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              {hydraulicFields.map((field, index) => {
                const item = hydraulicItems?.[index];
                const quantity = item?.quantity || 0;
                const value = item?.value || 0;
                const itemTotal = quantity * value;

                return (
                    <div key={field.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-end gap-4">
                      <FormField
                        control={form.control}
                        name={`hydraulicItems.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={cn(index > 0 && "sr-only")}>Item</FormLabel>
                             <Select
                              onValueChange={(value) => {
                                const selectedItem = sortedHydraulicServiceItems?.find(item => item.name === value);
                                if (selectedItem) {
                                  hydraulicUpdate(index, { 
                                    name: selectedItem.name, 
                                    value: selectedItem.defaultValue,
                                    quantity: 1,
                                  });
                                }
                              }}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={isLoadingHydraulicItems ? "Carregando..." : "Selecione um item ou digite"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {sortedHydraulicServiceItems?.map(item => (
                                  <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`hydraulicItems.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={cn(index > 0 && "sr-only")}>Qtd.</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="1" {...field} className="w-20" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`hydraulicItems.${index}.value`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={cn(index > 0 && "sr-only")}>Valor Unit. (R$)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="50.00" {...field} className="w-28" />
                            </FormControl>
                             <FormMessage />
                          </FormItem>
                        )}
                      />
                       <div className="space-y-2">
                        <FormLabel className={cn(index > 0 && "sr-only")}>Valor Total (R$)</FormLabel>
                        <div className="flex h-10 w-28 items-center rounded-md border border-input bg-background/50 px-3 py-2 text-sm">
                           {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(itemTotal)}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => hydraulicRemove(index)}
                        disabled={hydraulicFields.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                )
              })}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => hydraulicAppend({ name: '', quantity: 1, value: 0 })}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Item
              </Button>
            </div>
          </Card>
        )}
        
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Status do Orçamento</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex space-x-4"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="prospecção" />
                    </FormControl>
                    <FormLabel className="font-normal">Prospecção</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="ativo" />
                    </FormControl>
                    <FormLabel className="font-normal">Ativo</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="concluído" />
                    </FormControl>
                    <FormLabel className="font-normal">Concluído</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="cancelado" />
                    </FormControl>
                    <FormLabel className="font-normal">Cancelado</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
              control={form.control}
              name="registrationDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Registro</FormLabel>
                  <Popover open={isRegistrationDateOpen} onOpenChange={setIsRegistrationDateOpen}>
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
                          setIsRegistrationDateOpen(false);
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
              name="deadline"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Prazo de Entrega (Opcional)</FormLabel>
                  <Popover open={isDeadlineOpen} onOpenChange={setIsDeadlineOpen}>
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
                          setIsDeadlineOpen(false);
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
                  <Popover open={isPeriodOpen} onOpenChange={setIsPeriodOpen}>
                      <PopoverTrigger asChild>
                      <FormControl>
                          <Button
                          id="date"
                          variant={'outline'}
                          className={cn(
                              'pl-3 text-left font-normal',
                              !field.value?.from && 'text-muted-foreground'
                          )}
                          >
                          {field.value?.from ? (
                              field.value.to ? (
                              <>
                                  {format(field.value.from, 'LLL dd, y', { locale: ptBR })} -{' '}
                                  {format(field.value.to, 'LLL dd, y', { locale: ptBR })}
                              </>
                              ) : (
                              format(field.value.from, 'LLL dd, y', { locale: ptBR })
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
                          defaultMonth={field.value?.from}
                          selected={field.value}
                          onSelect={(range) => {
                            field.onChange(range);
                            if (range?.from && range?.to) {
                                setIsPeriodOpen(false);
                            }
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
                      <Input type="number" placeholder="150" {...field} value={field.value || ''}/>
                  </FormControl>
                  <FormMessage />
                  </FormItem>
              )}
              />
          </div>
        )}

        {budgetType === 'task' && serviceType !== 'Pintura' && serviceType !== 'Elétrica' && serviceType !== 'Hidráulica' && (
            <FormField
            control={form.control}
            name="total"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Valor Total da Tarefa (R$)</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="500" {...field} value={field.value || ''}/>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        )}

        <FormField
            control={form.control}
            name="materialCost"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Custo com Material (R$)</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="0" {...field} value={field.value || ''}/>
                </FormControl>
                 <FormDescription>
                    Insira o custo total com materiais para este projeto. Este valor será deduzido do total para calcular seu lucro.
                </FormDescription>
                <FormMessage />
                </FormItem>
            )}
        />


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
                 <div className="flex justify-between font-bold text-lg border-b pb-2">
                    <span>Valor Total:</span>
                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}</span>
                </div>
                <div className="flex justify-between pt-2">
                    <span className="text-muted-foreground">Custo com Material:</span>
                    <span className="text-red-600">-{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(materialCost)}</span>
                </div>
                 <div className="flex justify-between font-bold text-lg text-green-600">
                    <span>Lucro do Projeto:</span>
                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(profit)}</span>
                </div>
            </CardContent>
        </Card>

        <Button type="submit" disabled={isSubmitPending}>
          {isSubmitPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {budgetId ? 'Salvar Alterações' : 'Criar Orçamento'}
        </Button>
      </form>
    </Form>
  );
}
