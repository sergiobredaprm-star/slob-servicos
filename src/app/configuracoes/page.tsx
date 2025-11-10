'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { settings } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { CompanyProfile, ElectricalServiceItem, HydraulicServiceItem } from '@/lib/types';
import { useEffect, useState, useTransition } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { getCompanyProfile, saveCompanyProfile } from '@/lib/firebase/company-services';
import { saveElectricalItem, deleteElectricalItem } from '@/lib/firebase/electrical-item-services';
import { saveHydraulicItem, deleteHydraulicItem } from '@/lib/firebase/hydraulic-item-services';
import { Loader2, Trash2, PlusCircle } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { collection, query } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const settingsSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  workload: z.coerce.number().positive(),
  defaultRate: z.coerce.number().positive(),
});

const companyProfileSchema = z.object({
  companyName: z.string().min(2, { message: 'O nome da empresa é obrigatório.'}),
  companyEmail: z.string().email({ message: 'E-mail inválido.'}).optional().or(z.literal('')),
  companyPhone: z.string().optional(),
  companyAddress: z.string().optional(),
  companyWebsite: z.string().optional(),
  companyTaxId: z.string().optional(),
});

const userProfileSchema = z.object({
  displayName: z.string().min(2, { message: 'O nome é obrigatório.' }),
  photoURL: z.string().url({ message: 'Por favor, insira uma URL válida.' }).optional().or(z.literal('')),
});

const electricalItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'A descrição é obrigatória.'),
  defaultValue: z.coerce.number().min(0, 'O valor deve ser positivo.'),
});

const electricalItemsFormSchema = z.object({
  items: z.array(electricalItemSchema),
});

const hydraulicItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'A descrição é obrigatória.'),
  defaultValue: z.coerce.number().min(0, 'O valor deve ser positivo.'),
});

const hydraulicItemsFormSchema = z.object({
  items: z.array(hydraulicItemSchema),
});


export default function SettingsPage() {
  const { toast } = useToast();
  const { firestore, user, auth } = useFirebase();
  const [companyProfileId, setCompanyProfileId] = useState<string | undefined>(undefined);
  const [isSubmitPending, startSubmitTransition] = useTransition();
  const [isUserSubmitPending, startUserSubmitTransition] = useTransition();
  const [isElectricalSubmitPending, startElectricalSubmitTransition] = useTransition();
  const [isHydraulicSubmitPending, startHydraulicSubmitTransition] = useTransition();

  const settingsForm = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings,
  });
  
  const companyForm = useForm<z.infer<typeof companyProfileSchema>>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      companyName: '',
      companyEmail: '',
      companyPhone: '',
      companyAddress: '',
      companyWebsite: '',
      companyTaxId: '',
    },
  });

  const userProfileForm = useForm<z.infer<typeof userProfileSchema>>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      displayName: '',
      photoURL: '',
    },
  });

  const electricalItemsQuery = useMemoFirebase(
    () => user && firestore ? query(collection(firestore, 'users', user.uid, 'electricalServiceItems')) : null,
    [firestore, user]
  );
  
  const { data: electricalItems, isLoading: isLoadingElectricalItems } = useCollection<ElectricalServiceItem>(electricalItemsQuery);

  const electricalItemsForm = useForm<z.infer<typeof electricalItemsFormSchema>>({
    resolver: zodResolver(electricalItemsFormSchema),
    defaultValues: {
      items: [],
    },
  });
  
  const { fields: electricalFields, append: electricalAppend, remove: electricalRemove, replace: electricalReplace } = useFieldArray({
    control: electricalItemsForm.control,
    name: 'items',
  });

  useEffect(() => {
    if (electricalItems) {
      electricalReplace(electricalItems);
    }
  }, [electricalItems, electricalReplace]);

  const hydraulicItemsQuery = useMemoFirebase(
    () => user && firestore ? query(collection(firestore, 'users', user.uid, 'hydraulicServiceItems')) : null,
    [firestore, user]
  );

  const { data: hydraulicItems, isLoading: isLoadingHydraulicItems } = useCollection<HydraulicServiceItem>(hydraulicItemsQuery);
  
  const hydraulicItemsForm = useForm<z.infer<typeof hydraulicItemsFormSchema>>({
    resolver: zodResolver(hydraulicItemsFormSchema),
    defaultValues: {
      items: [],
    },
  });

  const { fields: hydraulicFields, append: hydraulicAppend, remove: hydraulicRemove, replace: hydraulicReplace } = useFieldArray({
    control: hydraulicItemsForm.control,
    name: 'items',
  });

  useEffect(() => {
    if (hydraulicItems) {
      hydraulicReplace(hydraulicItems);
    }
  }, [hydraulicItems, hydraulicReplace]);


  useEffect(() => {
    async function fetchCompanyProfile() {
      if (user && firestore) {
        try {
          const profile = await getCompanyProfile(firestore, user.uid);
          if (profile) {
            companyForm.reset(profile);
            setCompanyProfileId(profile.id);
          }
        } catch (error) {
           // O erro de permissão já é tratado globalmente pelo errorEmitter
           // e exibido no overlay de desenvolvimento, então não precisamos
           // de um toast aqui para não duplicar as mensagens.
        }
      }
    }
    fetchCompanyProfile();
  }, [user, firestore, companyForm]);

  useEffect(() => {
    if (user) {
      userProfileForm.reset({
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
      });
    }
  }, [user, userProfileForm]);


  function onSettingsSubmit(values: z.infer<typeof settingsSchema>) {
    console.log('Settings saved:', values);
    toast({
      title: 'Configurações Salvas!',
      description: 'Suas configurações de diária foram atualizadas.',
    });
  }
  
   function onCompanySubmit(values: z.infer<typeof companyProfileSchema>) {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }
    startSubmitTransition(async () => {
      try {
        await saveCompanyProfile(firestore, user.uid, values, companyProfileId);
        toast({
          title: 'Dados da Empresa Salvos!',
          description: 'As informações da sua empresa foram atualizadas.',
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao Salvar',
          description: 'Não foi possível salvar os dados da empresa.',
        });
      }
    });
  }
  
   function onUserProfileSubmit(values: z.infer<typeof userProfileSchema>) {
    if (!auth?.currentUser) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }
    startUserSubmitTransition(async () => {
      try {
        await updateProfile(auth.currentUser, {
          displayName: values.displayName,
          photoURL: values.photoURL,
        });
        toast({
          title: 'Perfil Atualizado!',
          description: 'Suas informações de perfil foram salvas.',
        });
         // Forçar a atualização do estado do usuário no provider (opcional, mas recomendado)
        if (typeof window !== "undefined") {
            window.dispatchEvent(new Event('auth-change'));
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao Atualizar Perfil',
          description: 'Não foi possível salvar seu perfil.',
        });
      }
    });
  }

  function onElectricalItemsSubmit(values: z.infer<typeof electricalItemsFormSchema>) {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }
    startElectricalSubmitTransition(async () => {
      try {
        await Promise.all(values.items.map(item => {
          const { id, ...itemData } = item;
          return saveElectricalItem(firestore, user.uid, itemData, id);
        }));
        
        toast({
          title: 'Itens de Elétrica Salvos!',
          description: 'Sua lista de itens de serviço foi atualizada.',
        });
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Erro ao Salvar',
          description: 'Não foi possível salvar os itens de elétrica.',
        });
      }
    });
  }

  async function handleRemoveElectricalItem(index: number, itemId?: string) {
    if (!user || !firestore) return;
    if (itemId) {
      try {
        await deleteElectricalItem(firestore, user.uid, itemId);
        toast({
          title: 'Item Removido',
          description: 'O item foi removido da sua lista.',
        });
      } catch(e) {
         toast({
          variant: 'destructive',
          title: 'Erro ao Remover',
          description: 'Não foi possível remover o item.',
        });
      }
    }
    electricalRemove(index);
  }

  function onHydraulicItemsSubmit(values: z.infer<typeof hydraulicItemsFormSchema>) {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }
    startHydraulicSubmitTransition(async () => {
      try {
        await Promise.all(values.items.map(item => {
          const { id, ...itemData } = item;
          return saveHydraulicItem(firestore, user.uid, itemData, id);
        }));
        
        toast({
          title: 'Itens de Hidráulica Salvos!',
          description: 'Sua lista de itens de serviço foi atualizada.',
        });
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Erro ao Salvar',
          description: 'Não foi possível salvar os itens de hidráulica.',
        });
      }
    });
  }

  async function handleRemoveHydraulicItem(index: number, itemId?: string) {
    if (!user || !firestore) return;
    if (itemId) {
      try {
        await deleteHydraulicItem(firestore, user.uid, itemId);
        toast({
          title: 'Item Removido',
          description: 'O item foi removido da sua lista.',
        });
      } catch(e) {
         toast({
          variant: 'destructive',
          title: 'Erro ao Remover',
          description: 'Não foi possível remover o item.',
        });
      }
    }
    hydraulicRemove(index);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight font-headline">
        Configurações
      </h1>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="service-items">Itens de Serviço</TabsTrigger>
          <TabsTrigger value="daily-rate">Diária</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Perfil de Usuário</CardTitle>
                <CardDescription>
                  Informações pessoais da sua conta.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...userProfileForm}>
                  <form onSubmit={userProfileForm.handleSubmit(onUserProfileSubmit)} className="space-y-6 max-w-lg">
                    <FormField
                      control={userProfileForm.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome de Exibição</FormLabel>
                          <FormControl>
                            <Input placeholder="Seu Nome" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={userProfileForm.control}
                      name="photoURL"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL da Foto do Perfil</FormLabel>
                          <FormControl>
                            <Input type="url" placeholder="https://exemplo.com/sua-foto.jpg" {...field} />
                          </FormControl>
                          <FormDescription>
                              Cole a URL de uma imagem para usar como sua foto de perfil.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={isUserSubmitPending}>
                      {isUserSubmitPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar Perfil
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Dados da Empresa</CardTitle>
                <CardDescription>
                  Informações da sua empresa que podem ser usadas em orçamentos e relatórios.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...companyForm}>
                  <form onSubmit={companyForm.handleSubmit(onCompanySubmit)} className="space-y-6 max-w-lg">
                    <FormField
                      control={companyForm.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome da Empresa</FormLabel>
                          <FormControl>
                            <Input placeholder="Sua Empresa LTDA" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={companyForm.control}
                        name="companyEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="contato@suaempresa.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={companyForm.control}
                        name="companyPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone</FormLabel>
                            <FormControl>
                              <Input placeholder="(99) 99999-9999" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={companyForm.control}
                      name="companyAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Endereço</FormLabel>
                          <FormControl>
                            <Input placeholder="Rua, Número, Cidade, Estado, CEP" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                          control={companyForm.control}
                          name="companyWebsite"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Website</FormLabel>
                              <FormControl>
                                <Input placeholder="https://suaempresa.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={companyForm.control}
                          name="companyTaxId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CNPJ</FormLabel>
                              <FormControl>
                                <Input placeholder="00.000.000/0001-00" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    </div>

                    <Button type="submit" disabled={isSubmitPending}>
                      {isSubmitPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar Dados da Empresa
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="service-items" className="space-y-4">
            <Accordion type="single" collapsible defaultValue="electrical" className="w-full">
              <AccordionItem value="electrical">
                <Card>
                  <AccordionTrigger className="p-6">
                    <CardHeader className="p-0 text-left">
                      <CardTitle>Itens de Serviço de Elétrica</CardTitle>
                      <CardDescription>
                        Crie uma lista de serviços de elétrica pré-cadastrados para agilizar a criação de orçamentos.
                      </CardDescription>
                    </CardHeader>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent>
                      <Form {...electricalItemsForm}>
                        <form onSubmit={electricalItemsForm.handleSubmit(onElectricalItemsSubmit)} className="space-y-6">
                          {isLoadingElectricalItems ? (
                            <div className="flex justify-center items-center h-24">
                              <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {electricalFields.map((field, index) => (
                                <div key={field.id} className="flex items-end gap-4">
                                  <FormField
                                    control={electricalItemsForm.control}
                                    name={`items.${index}.name`}
                                    render={({ field }) => (
                                      <FormItem className="flex-grow">
                                        <FormLabel className={cn(index > 0 && 'sr-only')}>Descrição do Item</FormLabel>
                                        <FormControl>
                                          <Input placeholder="Ex: Instalação de ponto de tomada" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={electricalItemsForm.control}
                                    name={`items.${index}.defaultValue`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className={cn(index > 0 && 'sr-only')}>Valor Padrão (R$)</FormLabel>
                                        <FormControl>
                                          <Input type="number" placeholder="50.00" {...field} className="w-36" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => handleRemoveElectricalItem(index, field.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => electricalAppend({ name: '', defaultValue: 0 })}
                              >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Adicionar Novo Item
                              </Button>
                            </div>
                          )}

                          <Button type="submit" disabled={isElectricalSubmitPending || isLoadingElectricalItems}>
                            {isElectricalSubmitPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Itens de Elétrica
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>
              <AccordionItem value="hydraulic">
                <Card>
                  <AccordionTrigger className="p-6">
                    <CardHeader className="p-0 text-left">
                      <CardTitle>Itens de Serviço de Hidráulica</CardTitle>
                      <CardDescription>
                        Crie uma lista de serviços de hidráulica pré-cadastrados para agilizar a criação de orçamentos.
                      </CardDescription>
                    </CardHeader>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent>
                      <Form {...hydraulicItemsForm}>
                        <form onSubmit={hydraulicItemsForm.handleSubmit(onHydraulicItemsSubmit)} className="space-y-6">
                          {isLoadingHydraulicItems ? (
                            <div className="flex justify-center items-center h-24">
                              <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {hydraulicFields.map((field, index) => (
                                <div key={field.id} className="flex items-end gap-4">
                                  <FormField
                                    control={hydraulicItemsForm.control}
                                    name={`items.${index}.name`}
                                    render={({ field }) => (
                                      <FormItem className="flex-grow">
                                        <FormLabel className={cn(index > 0 && 'sr-only')}>Descrição do Item</FormLabel>
                                        <FormControl>
                                          <Input placeholder="Ex: Instalação de ponto de água" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={hydraulicItemsForm.control}
                                    name={`items.${index}.defaultValue`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className={cn(index > 0 && 'sr-only')}>Valor Padrão (R$)</FormLabel>
                                        <FormControl>
                                          <Input type="number" placeholder="70.00" {...field} className="w-36" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => handleRemoveHydraulicItem(index, field.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => hydraulicAppend({ name: '', defaultValue: 0 })}
                              >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Adicionar Novo Item
                              </Button>
                            </div>
                          )}

                          <Button type="submit" disabled={isHydraulicSubmitPending || isLoadingHydraulicItems}>
                            {isHydraulicSubmitPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Itens de Hidráulica
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            </Accordion>
        </TabsContent>
        <TabsContent value="daily-rate">
          <Card>
            <CardHeader>
              <CardTitle>Configuração de Diária Padrão</CardTitle>
              <CardDescription>
                Defina os valores padrão para seus orçamentos. Eles podem ser
                ajustados individualmente em cada novo orçamento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...settingsForm}>
                <form onSubmit={settingsForm.handleSubmit(onSettingsSubmit)} className="space-y-8 max-w-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={settingsForm.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Início da Jornada</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={settingsForm.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fim da Jornada</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={settingsForm.control}
                    name="workload"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Carga Horária (horas)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          Incluindo intervalos, como almoço.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={settingsForm.control}
                    name="defaultRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor da Diária Padrão (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit">Salvar Configurações da Diária</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
