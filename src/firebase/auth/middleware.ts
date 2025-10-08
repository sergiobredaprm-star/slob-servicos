import { type NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeFirebaseAdmin } from './firebase-admin';

// Inicializa o Firebase Admin
const adminApp = initializeFirebaseAdmin();
const adminAuth = getAuth(adminApp);

interface AuthResult {
    isAuthenticated: boolean;
    response: NextResponse;
    uid?: string;
}

export async function authMiddleware(request: NextRequest): Promise<AuthResult> {
  const response = NextResponse.next();
  const sessionCookie = request.cookies.get('session')?.value;

  if (!sessionCookie) {
    return { isAuthenticated: false, response };
  }

  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    
    // Anexa o UID do usuário aos headers da requisição para uso posterior se necessário
    response.headers.set('x-user-id', decodedToken.uid);

    return { isAuthenticated: true, uid: decodedToken.uid, response };
  } catch (error) {
    // Cookie de sessão inválido ou expirado
    // Invalida o cookie no cliente
    const newResponse = NextResponse.next();
    newResponse.cookies.set('session', '', { maxAge: 0, path: '/' });
    return { isAuthenticated: false, response: newResponse };
  }
}
