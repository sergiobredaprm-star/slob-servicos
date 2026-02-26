
'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, FieldErrors } from 'react-hook-form';
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
  CardDescription
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CalendarIcon, Sparkles, Loader2, Check, ChevronsUpDown, Trash2, PlusCircle, Search } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { useState, useTransition, useEffect, useMemo } from 'react';
import { getTaskSuggestionsAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { addDays, differenceInCalendarDays } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Budget, Client, ServiceType, ElectricalItem, ElectricalServiceItem, HydraulicItem, HydraulicServiceItem, PaintingServiceItem, ServiceTypeItem, PaintingRoom } from '@/lib/types';
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

// Tornamos os esquemas base mais flexíveis para evitar erros de validação em abas não selecionadas
// A validação real de obrigatoriedade será feita no superRefine
const electricalItemSchema = z.object({
  name: z.string().optional(),
  quantity: z.coerce.number().optional(),
  value: z.coerce.number().optional(),
});

const hydraulicItemSchema = z.object({
  name: z.string().optional(),
  quantity: z.coerce.number().optional(),
  value: z.coerce.number().optional(),
});

const paintingRoomSchema = z.object({
  name: z.string().optional(),
  type: z.enum(['completo', 'paredes', 'teto']),
  wallPerimeter: z.coerce.number().optional(),
  wallHeight: z.coerce.number().optional(),
  ceilingWidth: z.coerce.number().optional(),
  ceilingLength: z.coerce.number().optional(),
  deductionsArea: z.coerce.number().optional(),
  calculatedArea: z.coerce.number().optional(),
});

const baseFormSchema = z.object({
  clientId: z.string().min(1, { message: 'Selecione um cliente.' }),
  clientName: z.string(),
  clientDescription: z.string().optional(),
  serviceType: z.string().min(1, { message: 'Selecione um tipo de serviço.'}),
  registrationDate: z.date({ required_error: "A data de registro é obrigatória." }),
  deadline: z.date().optional(),
  task: z.string().min(5, { message: 'A descrição da tarefa deve ter pelo menos 5 caracteres.' }),
  materialCost: z.coerce.number().optional(),
  status: z.enum(['prospecção', 'ativo', 'concluído', 'cancelado']),
  issueInvoice: z.boolean().optional(),
  invoiceTaxRate: z.coerce.number().optional(),
});

const dailyBudgetSchema = baseFormSchema.extend({
  budgetType: z.literal('daily'),
  period: z.object({
    from: z.date({ required_error: 'A data inicial é obrigatória.' }),
    to: z.date({ required_error: 'A data final é obrigatória.' }),
  }),
  dailyRate: z.coerce.number().positive('O valor da diária deve ser maior que zero.'),
});

const taskBudgetSchema = baseFormSchema.extend({
  budgetType: z.literal('task'),
  profit: z.coerce.number().optional(),
  sqMetersPrice: z.coerce.number().optional(),
  paintCoats: z.coerce.number().optional(),
  paintingRooms: z.array(paintingRoomSchema).optional(),
  electricalItems: z.array(electricalItemSchema).optional(),
  hydraulicItems: z.array(hydraulicItemSchema).optional(),
});

const formSchema = z.discriminatedUnion('budgetType', [
  dailyBudgetSchema,
  taskBudgetSchema,
]).superRefine((data, ctx) => {
    if (data.budgetType === 'task') {
        // Validação OBRIGATÓRIA apenas se o tipo de serviço for Elétrica
        if (data.serviceType === 'Elétrica') {
            if (!data.electricalItems || data.electricalItems.length === 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Adicione pelo menos um item de elétrica.',
                    path: ['electricalItems'],
                });
            } else {
                data.electricalItems.forEach((item, index) => {
                    if (!item.name || item.name.trim() === '') {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            message: `Item Elétrica #${index + 1}: A descrição é obrigatória.`,
                            path: ['electricalItems', index, 'name'],
                        });
                    }
                });
            }
        }
        // Validação OBRIGATÓRIA apenas se o tipo de serviço for Hidráulica
        if (data.serviceType === 'Hidráulica') {
            if (!data.hydraulicItems || data.hydraulicItems.length === 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Adicione pelo menos um item de hidráulica.',
                    path: ['hydraulicItems'],
                });
            } else {
                data.hydraulicItems.forEach((item, index) => {
                    if (!item.name || item.name.trim() === '') {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            message: `Item Hidráulica #${index + 1}: A descrição é obrigatória.`,
                            path: ['hydraulicItems', index, 'name'],
                        });
                    }
                });
            }
        }
        // Validação OBRIGATÓRIA apenas se o tipo de serviço for Pintura
        if (data.serviceType === 'Pintura') {
            if (!data.paintingRooms || data.paintingRooms.length === 0) {
                 ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Adicione pelo menos um item/cômodo para o serviço de pintura.',
                    path: ['paintingRooms'],
                });
            } else {
                 data.paintingRooms.forEach((room, index) => {
                    if (!room.name || room.name.trim() === '') {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            message: `Item Pintura #${index + 1}: A descrição/nome é obrigatória.`,
                            path: ['paintingRooms', index, 'name'],
                        });
                    }
                });
            }
        }
    }
});

type BudgetFormProps = {
  initialData?: Budget;
  budgetId?: string;
  preselectedClientId?: string;
  preselectedClientName?: string;
  preselectedClientDescription?: string;
};

export function BudgetForm({ initialData, budgetId, preselectedClientId, preselectedClientName, preselectedClientDescription }: BudgetFormProps) {
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
  
  const { data: electricalServiceItems } = useCollection<ElectricalServiceItem>(electricalItemsQuery);
  
  const hydraulicItemsQuery = useMemoFirebase(
    () => user && firestore ? query(collection(firestore, 'users', user.uid, 'hydraulicServiceItems')) : null,
    [firestore, user]
  );

  const { data: hydraulicServiceItems } = useCollection<HydraulicServiceItem>(hydraulicItemsQuery);

  const paintingItemsQuery = useMemoFirebase(
    () => user && firestore ? query(collection(firestore, 'users', user.uid, 'paintingServiceItems')) : null,
    [firestore, user]
  );
  const { data: paintingServiceItems } = useCollection<PaintingServiceItem>(paintingItemsQuery);

  const serviceTypesQuery = useMemoFirebase(
    () => user && firestore ? query(collection(firestore, 'users', user.uid, 'serviceTypes')) : null,
    [firestore, user]
  );
  const { data: customServiceTypes, isLoading: isLoadingServiceTypes } = useCollection<ServiceTypeItem>(serviceTypesQuery);

  const allServiceTypes = useMemo(() => {
      const defaultTypes: ServiceType[] = ['Pintura', 'Elétrica', 'Hidráulica', 'Alvenaria', 'Outro'];
      if (!customServiceTypes) {
          return defaultTypes;
      }
      const customTypes = customServiceTypes.map(item => item.name);
      return [...new Set([...defaultTypes, ...customTypes])];
  }, [customServiceTypes]);

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

  const sortedPaintingServiceItems = useMemo(() => {
    if (!paintingServiceItems) return [];
    return [...paintingServiceItems].sort((a, b) => a.name.localeCompare(b.name));
  }, [paintingServiceItems]);
  
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
      paintingRooms: initialData.paintingRooms && initialData.paintingRooms.length > 0 ? initialData.paintingRooms : [{ name: '', type: 'completo', calculatedArea: 0, deductionsArea: 0 }],
    } : {
      clientId: preselectedClientId || '',
      clientName: preselectedClientName || '',
      clientDescription: preselectedClientDescription || '',
      serviceType: undefined,
      registrationDate: new Date(),
      task: '',
      budgetType: 'daily',
      dailyRate: 150,
      period: {
        from: new Date(),
        to: addDays(new Date(), 5),
      },
      profit: 0,
      materialCost: 0,
      status: 'prospecção',
      sqMetersPrice: 0,
      paintCoats: 2,
      paintingRooms: [{ name: '', type: 'completo', calculatedArea: 0, deductionsArea: 0 }],
      electricalItems: [{ name: '', quantity: 1, value: 0 }],
      hydraulicItems: [{ name: '', quantity: 1, value: 0 }],
      issueInvoice: false,
      invoiceTaxRate: 0,
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

  const { fields: paintingFields, append: paintingAppend, remove: paintingRemove, update: paintingUpdate } = useFieldArray({
    control: form.control,
    name: 'paintingRooms',
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
  
  const budgetType = form.watch('budgetType');
  const serviceType = form.watch('serviceType');
  const period = form.watch('period');
  const sqMetersPrice = form.watch('sqMetersPrice') || 0;
  const paintCoats = form.watch('paintCoats') || 0;

  const electricalItems = form.watch('electricalItems');
  const hydraulicItems = form.watch('hydraulicItems');
  const paintingRooms = form.watch('paintingRooms');

  const issueInvoice = form.watch('issueInvoice');
  const invoiceTaxRate = form.watch('invoiceTaxRate') || 0;

  const calculateRoomArea = (room: Partial<PaintingRoom>) => {
    let area = 0;
    if (room.type === 'paredes' || room.type === 'completo') {
      area += (room.wallPerimeter || 0) * (room.wallHeight || 0);
    }
    if (room.type === 'teto' || room.type === 'completo') {
      area += (room.ceilingWidth || 0) * (room.ceilingLength || 0);
    }
    
    // Deduct doors/windows area
    const netArea = area - (room.deductionsArea || 0);
    
    return parseFloat(Math.max(0, netArea).toFixed(2));
  };

  const totalPaintingArea = useMemo(() => {
    return paintingRooms?.reduce((acc, room) => acc + calculateRoomArea(room), 0) || 0;
  }, [paintingRooms]);


  const getFirstErrorMessage = (errors: FieldErrors): string | undefined => {
    const findMessage = (obj: any): string | undefined => {
      if (!obj) return undefined;
      if (typeof obj.message === 'string') return obj.message;
      
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const result = findMessage(obj[key]);
          if (result) return result;
        }
      }
      return undefined;
    };
    
    return findMessage(errors);
  };
  
  function onValidationErrors(errors: FieldErrors<z.infer<typeof formSchema>>) {
    console.log('Form Validation Errors:', errors);
    const firstError = getFirstErrorMessage(errors);

    toast({
      variant: 'destructive',
      title: 'Campo Obrigatório ou Inválido',
      description: firstError || 'Por favor, verifique se todos os campos obrigatórios foram preenchidos corretamente.',
    });
  }
  
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
      let laborCost = 0;
      if (values.budgetType === 'daily' && values.period?.from && values.period?.to && values.dailyRate) {
        const workDays = differenceInCalendarDays(values.period.to, values.period.from) + 1;
        laborCost = workDays * values.dailyRate;
      } else if (values.budgetType === 'task') {
        if (values.serviceType === 'Pintura' && values.paintingRooms && values.sqMetersPrice && values.paintCoats) {
          const totalArea = values.paintingRooms.reduce((acc, room) => acc + calculateRoomArea(room), 0);
          laborCost = totalArea * values.sqMetersPrice * values.paintCoats;
        } else if (values.serviceType === 'Elétrica' && values.electricalItems) {
          laborCost = values.electricalItems.reduce((acc, item) => acc + ((item.quantity || 0) * (item.value || 0)), 0);
        } else if (values.serviceType === 'Hidráulica' && values.hydraulicItems) {
          laborCost = values.hydraulicItems.reduce((acc, item) => acc + ((item.quantity || 0) * (item.value || 0)), 0);
        } else if (values.profit) { // profit from form is the labor cost
          laborCost = values.profit;
        }
      }
      
      const materialCost = values.materialCost || 0;
      const subtotal = laborCost + materialCost;

      const total = values.issueInvoice && values.invoiceTaxRate && values.invoiceTaxRate > 0
        ? subtotal / (1 - (values.invoiceTaxRate / 100))
        : subtotal;

      const budgetData = {
        ...values,
        total: total,
        materialCost: materialCost,
        profit: laborCost,
        userId: user.uid,
        clientId: values.clientId,
        serviceType: values.serviceType as ServiceType,
        paintingRooms: values.serviceType === 'Pintura' ? values.paintingRooms?.map(r => ({ ...r, calculatedArea: calculateRoomArea(r) })) : [],
      };

      try {
        await saveBudget(firestore, user.uid, budgetData as Omit<Budget, 'id'>, budgetId);
        toast({
          title: `Orçamento ${budgetId ? 'Atualizado' : 'Criado'}!`,
          description: `O orçamento foi salvo com sucesso.`,
          className: 'bg-accent text-accent-foreground',
        });
        router.push('/orcamentos');
      } catch (error) {
         console.error("Save budget error:", error);
         toast({
          variant: 'destructive',
          title: 'Erro ao Salvar',
          description: `Não foi possível salvar o orçamento no servidor. Tente novamente mais tarde.`,
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

  const workDays = budgetType === 'daily' && period?.from && period?.to ? differenceInCalendarDays(period.to, period.from) + 1 : 0;
  const dailyRateValue = form.watch('dailyRate') || 0;
  
  const materialCost = form.watch('materialCost') || 0;
  let laborCost = 0;

  if (budgetType === 'daily') {
    laborCost = workDays * dailyRateValue;
  } else if (budgetType === 'task') {
    if (serviceType === 'Pintura') {
      laborCost = totalPaintingArea * sqMetersPrice * paintCoats;
    } else if (serviceType === 'Elétrica') {
      laborCost = electricalItems?.reduce((acc, item) => acc + ((item.quantity || 0) * (item.value || 0)), 0) || 0;
    } else if (serviceType === 'Hidráulica') {
      laborCost = hydraulicItems?.reduce((acc, item) => acc + ((item.quantity || 0) * (item.value || 0)), 0) || 0;
    } else {
      laborCost = form.watch('profit') || 0;
    }
  }

  const subtotal = laborCost + materialCost;
  const total = issueInvoice && invoiceTaxRate > 0
    ? subtotal / (1 - (invoiceTaxRate / 100))
    : subtotal;
  const taxAmount = total - subtotal;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onValidationErrors)} className="space-y-8">
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
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Anote aqui informações importantes, como 'emitir NF', detalhes do serviço, etc."
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
                    <SelectValue placeholder={isLoadingServiceTypes ? "Carregando..." : "Selecione o tipo de serviço"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {allServiceTypes.map(type => (
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
                <CardTitle className="text-lg">Detalhamento de Pintura</CardTitle>
                <CardDescription>Adicione a descrição do serviço/cômodo e as dimensões.</CardDescription>
            </CardHeader>
            <div className="space-y-6">
              {paintingFields.map((field, index) => {
                const room = paintingRooms?.[index];
                const area = calculateRoomArea(room || {});

                return (
                  <div key={field.id} className="p-4 border rounded-lg bg-background space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Item #{index + 1}</h4>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => paintingRemove(index)}
                        disabled={paintingFields.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`paintingRooms.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descrição do Item/Cômodo</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input placeholder="Ex: Pintura Quarto Casal" {...field} />
                              </FormControl>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="icon" title="Itens Salvos">
                                    <Search className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-0">
                                  <Command>
                                    <CommandInput placeholder="Procurar item..." />
                                    <CommandList>
                                      <CommandEmpty>Nenhum item salvo.</CommandEmpty>
                                      <CommandGroup heading="Serviços de Pintura">
                                        {sortedPaintingServiceItems?.map(savedItem => (
                                          <CommandItem
                                            key={savedItem.id}
                                            onSelect={() => {
                                              paintingUpdate(index, {
                                                ...paintingRooms![index],
                                                name: savedItem.name,
                                              });
                                              form.setValue('sqMetersPrice', savedItem.defaultValue);
                                            }}
                                          >
                                            {savedItem.name} ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(savedItem.defaultValue)}/m²)
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`paintingRooms.${index}.type`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Área</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="completo">Cômodo Completo (Paredes + Teto)</SelectItem>
                                <SelectItem value="paredes">Só Paredes</SelectItem>
                                <SelectItem value="teto">Só Teto</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-2">
                      {(room?.type === 'paredes' || room?.type === 'completo') && (
                        <>
                          <FormField
                            control={form.control}
                            name={`paintingRooms.${index}.wallPerimeter`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Perímetro (m)</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" placeholder="Ex: 12" {...field} value={field.value || ''} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`paintingRooms.${index}.wallHeight`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Altura (m)</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" placeholder="Ex: 2.7" {...field} value={field.value || ''} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}
                      {(room?.type === 'teto' || room?.type === 'completo') && (
                        <>
                          <FormField
                            control={form.control}
                            name={`paintingRooms.${index}.ceilingWidth`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Largura Teto (m)</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" placeholder="Ex: 3" {...field} value={field.value || ''} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`paintingRooms.${index}.ceilingLength`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Comprim. Teto (m)</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" placeholder="Ex: 4" {...field} value={field.value || ''} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}
                      <FormField
                        control={form.control}
                        name={`paintingRooms.${index}.deductionsArea`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Deduções (m²)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="Ex: 2.1" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormDescription>Portas/Janelas</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex justify-end pt-2">
                      <div className="text-sm font-semibold bg-muted px-3 py-1 rounded">
                        Área Líquida: {area.toFixed(2)} m²
                      </div>
                    </div>
                  </div>
                );
              })}
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => paintingAppend({ name: '', type: 'completo', calculatedArea: 0, deductionsArea: 0 })}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Outro Item de Pintura
              </Button>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-6">
                <div className="space-y-2">
                    <FormLabel>Área Total (m²)</FormLabel>
                    <div className="flex h-10 w-full items-center rounded-md border border-input bg-background/50 px-3 py-2 text-sm font-bold">
                        {totalPaintingArea.toFixed(2)} m²
                    </div>
                </div>
                <FormField
                  control={form.control}
                  name="sqMetersPrice"
                  render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor por m² (R$)</FormLabel>
                        <FormControl>
                            <Input type="number" step="0.01" placeholder="Ex: 25" {...field} value={field.value || ''} />
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
            </div>
           </Card>
        )}

        {budgetType === 'task' && serviceType === 'Elétrica' && (
          <Card className="bg-muted/50 p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-lg">Itens do Serviço de Elétrica</CardTitle>
              <CardDescription>Descreva cada item e seu valor unitário.</CardDescription>
            </CardHeader>
            <div className="space-y-4">
              {electricalFields.map((field, index) => {
                const item = electricalItems?.[index];
                const quantity = item?.quantity || 0;
                const value = item?.value || 0;
                const itemTotal = quantity * value;

                return (
                    <div key={field.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-end gap-2 border-b pb-4 last:border-0 last:pb-0">
                      <FormField
                        control={form.control}
                        name={`electricalItems.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={cn(index > 0 && "sr-only")}>Descrição do Item</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input placeholder="Ex: Instalação de ponto de tomada" {...field} />
                              </FormControl>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="icon" title="Itens Salvos">
                                    <Search className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-0">
                                  <Command>
                                    <CommandInput placeholder="Procurar item..." />
                                    <CommandList>
                                      <CommandEmpty>Nenhum item salvo.</CommandEmpty>
                                      <CommandGroup heading="Itens Salvos">
                                        {sortedElectricalServiceItems?.map(savedItem => (
                                          <CommandItem
                                            key={savedItem.id}
                                            onSelect={() => {
                                              electricalUpdate(index, { 
                                                name: savedItem.name, 
                                                value: savedItem.defaultValue,
                                                quantity: 1,
                                              });
                                            }}
                                          >
                                            {savedItem.name} ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(savedItem.defaultValue)})
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
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
                              <Input type="number" placeholder="1" {...field} className="w-16" />
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
                            <FormLabel className={cn(index > 0 && "sr-only")}>R$ Unit.</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="50.00" {...field} className="w-24" />
                            </FormControl>
                             <FormMessage />
                          </FormItem>
                        )}
                      />
                       <div className="space-y-2">
                        <FormLabel className={cn(index > 0 && "sr-only")}>R$ Total</FormLabel>
                        <div className="flex h-10 w-24 items-center rounded-md border border-input bg-background/50 px-3 py-2 text-sm">
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
              <CardDescription>Descreva cada item e seu valor unitário.</CardDescription>
            </CardHeader>
            <div className="space-y-4">
              {hydraulicFields.map((field, index) => {
                const item = hydraulicItems?.[index];
                const quantity = item?.quantity || 0;
                const value = item?.value || 0;
                const itemTotal = quantity * value;

                return (
                    <div key={field.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-end gap-2 border-b pb-4 last:border-0 last:pb-0">
                      <FormField
                        control={form.control}
                        name={`hydraulicItems.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={cn(index > 0 && "sr-only")}>Descrição do Item</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input placeholder="Ex: Instalação de ponto de água" {...field} />
                              </FormControl>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="icon" title="Itens Salvos">
                                    <Search className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-0">
                                  <Command>
                                    <CommandInput placeholder="Procurar item..." />
                                    <CommandList>
                                      <CommandEmpty>Nenhum item salvo.</CommandEmpty>
                                      <CommandGroup heading="Itens Salvos">
                                        {sortedHydraulicServiceItems?.map(savedItem => (
                                          <CommandItem
                                            key={savedItem.id}
                                            onSelect={() => {
                                              hydraulicUpdate(index, { 
                                                name: savedItem.name, 
                                                value: savedItem.defaultValue,
                                                quantity: 1,
                                              });
                                            }}
                                          >
                                            {savedItem.name} ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(savedItem.defaultValue)})
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
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
                              <Input type="number" placeholder="1" {...field} className="w-16" />
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
                            <FormLabel className={cn(index > 0 && "sr-only")}>R$ Unit.</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="50.00" {...field} className="w-24" />
                            </FormControl>
                             <FormMessage />
                          </FormItem>
                        )}
                      />
                       <div className="space-y-2">
                        <FormLabel className={cn(index > 0 && "sr-only")}>R$ Total</FormLabel>
                        <div className="flex h-10 w-24 items-center rounded-md border border-input bg-background/50 px-3 py-2 text-sm">
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
                  <FormLabel>Prazo de Entrega</FormLabel>
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
                          selected={field.value as DateRange | undefined}
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
              name="profit"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Valor da Mão de Obra (R$)</FormLabel>
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
                    Insira o custo total com materiais para este projeto.
                </FormDescription>
                <FormMessage />
                </FormItem>
            )}
        />
        
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>Nota Fiscal</CardTitle>
            <CardDescription>
              Cálculo de imposto para emissão de nota fiscal de serviço.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="issueInvoice"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Emitir Nota Fiscal?</FormLabel>
                    <FormDescription>
                      O valor do imposto será somado ao total do orçamento.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {issueInvoice && (
              <FormField
                control={form.control}
                name="invoiceTaxRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alíquota do Imposto (%)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ex: 5" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormDescription>
                      Insira a porcentagem do imposto (apenas números).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>


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
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">Mão de Obra:</span>
                    <span className="font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(laborCost)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Custo com Material:</span>
                    <span className="font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(materialCost)}</span>
                </div>
                 <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                    <span>Subtotal:</span>
                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal)}</span>
                </div>
                {issueInvoice && taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor da Nota ({invoiceTaxRate}%):</span>
                    <span className="font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(taxAmount)}</span>
                  </div>
                )}
                 <div className="flex justify-between font-bold text-lg">
                    <span>Valor Total:</span>
                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}</span>
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
