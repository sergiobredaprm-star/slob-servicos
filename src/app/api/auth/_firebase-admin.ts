import { initializeApp, getApps, App, applicationDefault, AppOptions } from 'firebase-admin/app';
import { firebaseConfig } from '@/firebase/config';

const adminApps = getApps();

const BUCKET_NAME = `${firebaseConfig.projectId}.appspot.com`;

export function initializeFirebaseAdmin(): App {
  if (adminApps.length > 0) {
    return adminApps[0];
  }

  let appOptions: AppOptions;
  
  // No ambiente de produção do App Hosting, as credenciais são provisionadas automaticamente.
  // Em outros ambientes (como o desenvolvimento local), você precisa configurar as credenciais.
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    appOptions = {
      credential: applicationDefault(),
      storageBucket: BUCKET_NAME,
    };
  } else {
    // Se as credenciais do Google não estiverem definidas, pode ser um ambiente local
    // onde o SDK do Admin pode não ser necessário ou precisar de outra configuração.
    // Para este caso, retornamos um objeto de configuração vazio para evitar erros,
    // embora a funcionalidade completa do admin-sdk possa não funcionar sem credenciais.
    console.warn("GOOGLE_APPLICATION_CREDENTIALS não estão definidas. A inicialização do Firebase Admin pode falhar.");
    appOptions = {
        storageBucket: BUCKET_NAME
    };
  }


  try {
     return initializeApp(appOptions);
  } catch (e) {
    // Se a inicialização com as credenciais padrão falhar,
    // tente inicializar sem elas (útil em alguns cenários de emulador/dev)
    console.warn("A inicialização do Firebase Admin com applicationDefault() falhou, tentando novamente sem credenciais explícitas.", e);
    return initializeApp({
        storageBucket: BUCKET_NAME
    });
  }
}
