import { initializeApp, getApps, App, applicationDefault, AppOptions } from 'firebase-admin/app';
import { firebaseConfig } from '@/firebase/config';

const adminApps = getApps();

const BUCKET_NAME = `${firebaseConfig.projectId}.appspot.com`;

export function initializeFirebaseAdmin(): App {
  if (adminApps.length > 0) {
    return adminApps[0];
  }

  let appOptions: AppOptions = {
    storageBucket: BUCKET_NAME,
  };
  
  // No ambiente de produção do App Hosting, as credenciais são provisionadas automaticamente.
  // Em outros ambientes (como o desenvolvimento local), você precisa configurar as credenciais.
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log("Found GOOGLE_APPLICATION_CREDENTIALS, using applicationDefault().");
    appOptions.credential = applicationDefault();
  } else {
    // Se as credenciais do Google não estiverem definidas, pode ser um ambiente local
    // onde o SDK do Admin pode não ser necessário ou precisar de outra configuração.
    console.warn("GOOGLE_APPLICATION_CREDENTIALS are not set. Firebase Admin SDK might not be fully functional.");
  }


  try {
     return initializeApp(appOptions);
  } catch (e: any) {
    // Se a inicialização com as credenciais padrão falhar,
    // tente inicializar sem elas (útil em alguns cenários de emulador/dev)
    console.warn("Firebase Admin initialization with current options failed, trying again without explicit credentials.", e.message);
    // Return an initialized app without credentials, which might have limited functionality
    return initializeApp({
        storageBucket: BUCKET_NAME
    });
  }
}
