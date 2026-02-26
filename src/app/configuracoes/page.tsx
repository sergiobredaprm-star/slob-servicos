
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
import { CompanyProfile, ElectricalServiceItem, HydraulicServiceItem, PaintingServiceItem, ServiceTypeItem } from '@/lib/types';
import { useEffect, useState, useTransition, useRef } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { getCompanyProfile, saveCompanyProfile } from '@/lib/firebase/company-services';
import { saveElectricalItem, deleteElectricalItem } from '@/lib/firebase/electrical-item-services';
import { saveHydraulicItem, deleteHydraulicItem } from '@/lib/firebase/hydraulic-item-services';
import { savePaintingItem, deletePaintingItem } from '@/lib/firebase/painting-item-services';
import { saveServiceType, deleteServiceType } from '@/lib/firebase/service-type-services';
import { Loader2, Trash2, PlusCircle, Upload, Save } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { collection, query } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import Image from 'next/image';
import { uploadProfileImage, listProfileImages } from '@/lib/firebase/storage-service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';


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
  photoFile: z.instanceof(File).optional(),
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

const paintingItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'A descrição é obrigatória.'),
  defaultValue: z.coerce.number().min(0, 'O valor deve ser positivo.'),
});

const paintingItemsFormSchema = z.object({
  items: z.array(paintingItemSchema),
});

const serviceTypeItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'O nome do serviço deve ter pelo menos 2 caracteres.'),
});

const serviceTypesFormSchema = z.object({
  items: z.array(serviceTypeItemSchema),
});

type ElectricalItemsFormData = z.infer<typeof electricalItemsFormSchema>;
type HydraulicItemsFormData = z.infer<typeof hydraulicItemsFormSchema>;
type PaintingItemsFormData = z.infer<typeof paintingItemsFormSchema>;
type ServiceTypesFormData = z.infer<typeof serviceTypesFormSchema>;


export default function SettingsPage() {
  const { toast } = useToast();
  const { firestore, user, auth, firebaseApp } = useFirebase();
  const [companyProfileId, setCompanyProfileId] = useState<string | undefined>(undefined);
  const [isSubmitPending, startSubmitTransition] = useTransition();
  const [isUserSubmitPending, startUserSubmitTransition] = useTransition();
  const [isElectricalSubmitPending, startElectricalSubmitTransition] = useTransition();
  const [isHydraulicSubmitPending, startHydraulicSubmitTransition] = useTransition();
  const [isPaintingSubmitPending, startPaintingSubmitTransition] = useTransition();
  const [isServiceTypeSubmitPending, startServiceTypeSubmitTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(user?.photoURL || null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [isGalleryLoading, setIsGalleryLoading] = useState(true);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | null>(null);
  const [isSavingImage, startImageSaveTransition] = useTransition();


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
      displayName: user?.displayName || '',
    },
  });

  const electricalItemsQuery = useMemoFirebase(
    () => user && firestore ? query(collection(firestore, 'users', user.uid, 'electricalServiceItems')) : null,
    [firestore, user]
  );
  
  const { data: electricalItems, isLoading: isLoadingElectricalItems } = useCollection<ElectricalServiceItem>(electricalItemsQuery);

  const electricalItemsForm = useForm<ElectricalItemsFormData>({
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
  
  const hydraulicItemsForm = useForm<HydraulicItemsFormData>({
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

  const paintingItemsQuery = useMemoFirebase(
    () => user && firestore ? query(collection(firestore, 'users', user.uid, 'paintingServiceItems')) : null,
    [firestore, user]
  );

  const { data: paintingItems, isLoading: isLoadingPaintingItems } = useCollection<PaintingServiceItem>(paintingItemsQuery);

  const paintingItemsForm = useForm<PaintingItemsFormData>({
    resolver: zodResolver(paintingItemsFormSchema),
    defaultValues: {
      items: [],
    },
  });

  const { fields: paintingFields, append: paintingAppend, remove: paintingRemove, replace: paintingReplace } = useFieldArray({
    control: paintingItemsForm.control,
    name: 'items',
  });

  useEffect(() => {
    if (paintingItems) {
      paintingReplace(paintingItems);
    }
  }, [paintingItems, paintingReplace]);

  const serviceTypesQuery = useMemoFirebase(
    () => user && firestore ? query(collection(firestore, 'users', user.uid, 'serviceTypes')) : null,
    [firestore, user]
  );

  const { data: serviceTypes, isLoading: isLoadingServiceTypes } = useCollection<ServiceTypeItem>(serviceTypesQuery);

  const serviceTypesForm = useForm<ServiceTypesFormData>({
    resolver: zodResolver(serviceTypesFormSchema),
    defaultValues: {
      items: [],
    },
  });

  const { fields: serviceTypeFields, append: serviceTypeAppend, remove: serviceTypeRemove, replace: serviceTypeReplace } = useFieldArray({
    control: serviceTypesForm.control,
    name: 'items',
  });

  useEffect(() => {
    if (serviceTypes) {
      serviceTypeReplace(serviceTypes);
    }
  }, [serviceTypes, serviceTypeReplace]);


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
        }
      }
    }
    fetchCompanyProfile();
  }, [user, firestore, companyForm]);

  useEffect(() => {
    async function fetchGalleryImages() {
      if (user && firebaseApp) {
        setIsGalleryLoading(true);
        const images = await listProfileImages(firebaseApp, user.uid);
        setGalleryImages(images);
        setIsGalleryLoading(false);
      }
    }

    if (user && firebaseApp) {
      fetchGalleryImages();
    }
  }, [user, firebaseApp]);


  useEffect(() => {
    if (user) {
      userProfileForm.reset({
        displayName: user.displayName || '',
      });
      setPreviewImage(user.photoURL || null);
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

  async function handleProfileUpdate(displayName: string, photoURL: string) {
    if (!auth?.currentUser) return;
    await updateProfile(auth.currentUser, { displayName, photoURL });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event('auth-change'));
    }
  }
  
   function onUserProfileSubmit(values: z.infer<typeof userProfileSchema>) {
    if (!auth?.currentUser || !firebaseApp) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }
    startUserSubmitTransition(async () => {
      try {
        let photoURL = auth.currentUser?.photoURL || '';
        
        if (values.photoFile) {
          photoURL = await uploadProfileImage(firebaseApp, auth.currentUser.uid, values.photoFile);
          setGalleryImages(prev => [photoURL, ...prev]);
        }

        await handleProfileUpdate(values.displayName, photoURL);

        toast({
          title: 'Perfil Atualizado!',
          description: 'Suas informações de perfil foram salvas.',
        });
        
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Erro ao Atualizar Perfil',
          description: error.message || 'Não foi possível salvar o perfil. Verifique as regras de segurança do Storage.',
        });
      }
    });
  }

  function handleSelectGalleryImage(imageUrl: string) {
    setSelectedGalleryImage(imageUrl);
    setPreviewImage(imageUrl);
  }

  const handleSaveSelectedImage = () => {
    if (!selectedGalleryImage || !auth?.currentUser || !user?.displayName) {
      toast({ variant: "destructive", title: "Erro", description: "Nenhuma imagem selecionada ou usuário não autenticado." });
      return;
    }
    
    startImageSaveTransition(async () => {
        try {
            await handleProfileUpdate(user.displayName!, selectedGalleryImage);
            toast({
                title: "Foto de Perfil Atualizada!",
                description: "Sua foto foi alterada com sucesso.",
            });
            setSelectedGalleryImage(null);
        } catch(error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao Atualizar Foto",
                description: error.message || "Não foi possível salvar esta imagem.",
            });
            setPreviewImage(user.photoURL || null);
        }
    });
  }


  function onElectricalItemsSubmit(values: ElectricalItemsFormData) {
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

  function onHydraulicItemsSubmit(values: HydraulicItemsFormData) {
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

  function onPaintingItemsSubmit(values: PaintingItemsFormData) {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }
    startPaintingSubmitTransition(async () => {
      try {
        await Promise.all(values.items.map(item => {
          const { id, ...itemData } = item;
          return savePaintingItem(firestore, user.uid, itemData, id);
        }));
        
        toast({
          title: 'Itens de Pintura Salvos!',
          description: 'Sua lista de preços de pintura foi atualizada.',
        });
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Erro ao Salvar',
          description: 'Não foi possível salvar os itens de pintura.',
        });
      }
    });
  }

  async function handleRemovePaintingItem(index: number, itemId?: string) {
    if (!user || !firestore) return;
    if (itemId) {
      try {
        await deletePaintingItem(firestore, user.uid, itemId);
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
    paintingRemove(index);
  }

  function onServiceTypesSubmit(values: ServiceTypesFormData) {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }
    startServiceTypeSubmitTransition(async () => {
      try {
        await Promise.all(values.items.map(item => {
          const { id, ...itemData } = item;
          return saveServiceType(firestore, user.uid, itemData, id);
        }));
        
        toast({
          title: 'Tipos de Serviço Salvos!',
          description: 'Sua lista de tipos de serviço foi atualizada.',
        });
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Erro ao Salvar',
          description: 'Não foi possível salvar os tipos de serviço.',
        });
      }
    });
  }

  async function handleRemoveServiceType(index: number, itemId?: string) {
    if (!user || !firestore) return;
    if (itemId) {
      try {
        await deleteServiceType(firestore, user.uid, itemId);
        toast({
          title: 'Tipo de Serviço Removido',
          description: 'O tipo de serviço foi removido da sua lista.',
        });
      } catch(e) {
         toast({
          variant: 'destructive',
          title: 'Erro ao Remover',
          description: 'Não foi possível remover o tipo de serviço.',
        });
      }
    }
    serviceTypeRemove(index);
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
          <TabsTrigger value="service-types">Tipos de Serviço</TabsTrigger>
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
                      name="photoFile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Foto do Perfil</FormLabel>
                          <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16">
                               <AvatarImage src={previewImage ?? ''} alt="Pré-visualização do perfil" />
                               <AvatarFallback>{user?.displayName ? user.displayName.substring(0,2) : user?.email?.substring(0,2).toUpperCase() ?? 'U'}</AvatarFallback>
                            </Avatar>
                            <FormControl>
                              <div>
                                <Input 
                                  type="file" 
                                  accept="image/png, image/jpeg, image/gif"
                                  className="hidden"
                                  ref={fileInputRef}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      field.onChange(file);
                                      setPreviewImage(URL.createObjectURL(file));
                                      setSelectedGalleryImage(null);
                                    }
                                  }}
                                />
                                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                                  <Upload className="mr-2 h-4 w-4" />
                                  Trocar Foto
                                </Button>
                              </div>
                            </FormControl>
                          </div>
                          <FormDescription>
                           Escolha uma imagem (JPG, PNG, GIF). A imagem será enviada para o Firebase Storage.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <div className="space-y-4">
                        <Separator />
                        <div className="flex justify-between items-center">
                          <h3 className="text-sm font-medium text-muted-foreground">Sua Galeria</h3>
                           {selectedGalleryImage && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleSaveSelectedImage}
                              disabled={isSavingImage}
                            >
                              {isSavingImage ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="mr-2 h-4 w-4" />
                              )}
                              Salvar Imagem
                            </Button>
                          )}
                        </div>

                        {isGalleryLoading ? (
                          <div className="flex justify-center items-center h-24">
                              <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        ) : galleryImages.length > 0 ? (
                           <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
                            {galleryImages.map((url) => (
                              <button
                                type="button"
                                key={url}
                                className={cn(
                                  "rounded-lg overflow-hidden border-2 aspect-square relative focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                                  selectedGalleryImage === url ? 'border-primary' : 'border-transparent'
                                )}
                                onClick={() => handleSelectGalleryImage(url)}
                              >
                                <Image
                                  src={url}
                                  alt="Imagem da galeria de perfil"
                                  fill
                                  sizes="(max-width: 768px) 20vw, 10vw"
                                  className="object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Sua galeria de imagens está vazia. Faça o upload de uma nova foto.</p>
                        )}
                      </div>
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
              <AccordionItem value="painting">
                <Card>
                  <AccordionTrigger className="p-6">
                    <CardHeader className="p-0 text-left">
                      <CardTitle>Itens de Serviço de Pintura</CardTitle>
                      <CardDescription>
                        Defina preços por m² para diferentes tipos de serviço de pintura.
                      </CardDescription>
                    </CardHeader>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent>
                      <Form {...paintingItemsForm}>
                        <form onSubmit={paintingItemsForm.handleSubmit(onPaintingItemsSubmit)} className="space-y-6">
                          {isLoadingPaintingItems ? (
                            <div className="flex justify-center items-center h-24">
                              <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {paintingFields.map((field, index) => (
                                <div key={field.id} className="flex items-end gap-4">
                                  <FormField
                                    control={paintingItemsForm.control}
                                    name={`items.${index}.name`}
                                    render={({ field }) => (
                                      <FormItem className="flex-grow">
                                        <FormLabel className={cn(index > 0 && 'sr-only')}>Descrição do Item (ex: Massa Corrida)</FormLabel>
                                        <FormControl>
                                          <Input placeholder="Ex: Pintura com Massa Corrida" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={paintingItemsForm.control}
                                    name={`items.${index}.defaultValue`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className={cn(index > 0 && 'sr-only')}>R$ por m²</FormLabel>
                                        <FormControl>
                                          <Input type="number" placeholder="25.00" {...field} className="w-36" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => handleRemovePaintingItem(index, field.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => paintingAppend({ name: '', defaultValue: 0 })}
                              >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Adicionar Novo Item de Pintura
                              </Button>
                            </div>
                          )}

                          <Button type="submit" disabled={isPaintingSubmitPending || isLoadingPaintingItems}>
                            {isPaintingSubmitPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Itens de Pintura
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            </Accordion>
        </TabsContent>
        <TabsContent value="service-types">
          <Card>
            <CardHeader>
              <CardTitle>Tipos de Serviço Personalizados</CardTitle>
              <CardDescription>
                Adicione ou remova tipos de serviço que aparecerão na criação de orçamentos.
              </CardDescription>
            </CardHeader>
            <CardContent>
               <Form {...serviceTypesForm}>
                <form onSubmit={serviceTypesForm.handleSubmit(onServiceTypesSubmit)} className="space-y-6">
                  {isLoadingServiceTypes ? (
                    <div className="flex justify-center items-center h-24">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {serviceTypeFields.map((field, index) => (
                        <div key={field.id} className="flex items-end gap-4">
                          <FormField
                            control={serviceTypesForm.control}
                            name={`items.${index}.name`}
                            render={({ field }) => (
                              <FormItem className="flex-grow">
                                <FormLabel className={cn(index > 0 && 'sr-only')}>Nome do Tipo de Serviço</FormLabel>
                                <FormControl>
                                  <Input placeholder="Ex: Marcenaria" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => handleRemoveServiceType(index, field.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => serviceTypeAppend({ name: '' })}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Novo Tipo
                      </Button>
                    </div>
                  )}

                  <Button type="submit" disabled={isServiceTypeSubmitPending || isLoadingServiceTypes}>
                    {isServiceTypeSubmitPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Tipos de Serviço
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
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
