import { initializeApp, getApps, App, applicationDefault, AppOptions } from 'firebase-admin/app';

const adminApps = getApps();

export function initializeFirebaseAdmin(): App {
  if (adminApps.length > 0) {
    return adminApps[0];
  }

  let appOptions: AppOptions = {};

  try {
    // Tenta usar as credenciais padrão da aplicação (funciona no App Hosting)
    appOptions.credential = applicationDefault();
  } catch (e) {
    // Isso é esperado no desenvolvimento local se as credenciais não estiverem configuradas.
    // Em vez de quebrar, registramos um aviso. A rota que chama isso deve lidar com a falha.
    console.warn(
      'Falha ao carregar as credenciais padrão do Firebase Admin SDK. ' +
      'Isto é esperado no desenvolvimento local se GOOGLE_APPLICATION_CREDENTIALS não estiver definido. ' +
      'As funções de administração (como criação de sessão) podem não funcionar. ' +
      `Erro original: ${(e as Error).message}`
    );
    // Retorna uma inicialização que provavelmente falhará na próxima etapa, 
    // mas que fornecerá um erro claro.
    return initializeApp();
  }

  // Se as credenciais foram carregadas, inicializa o app com elas.
  return initializeApp(appOptions);
}
