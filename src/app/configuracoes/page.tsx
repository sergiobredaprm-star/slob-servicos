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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { settings } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { CompanyProfile, DailyRateSettings } from '@/lib/types';
import { useEffect, useState, useTransition } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { getCompanyProfile, saveCompanyProfile } from '@/lib/firebase/company-services';
import { Loader2 } from 'lucide-react';

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


export default function SettingsPage() {
  const { toast } = useToast();
  const { firestore, user } = useFirebase();
  const [companyProfileId, setCompanyProfileId] = useState<string | undefined>(undefined);
  const [isSubmitPending, startSubmitTransition] = useTransition();

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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight font-headline">
        Configurações
      </h1>
      
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
    </div>
  );
}
