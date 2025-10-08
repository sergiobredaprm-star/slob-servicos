import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeFirebaseAdmin } from '../_firebase-admin';

// Esta rota de API é executada no ambiente Node.js, onde o 'firebase-admin' é suportado.

const adminApp = initializeFirebaseAdmin();
const adminAuth = getAuth(adminApp);

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value;

  if (!sessionCookie) {
    return NextResponse.json({ error: 'Session cookie not found.' }, { status: 401 });
  }

  try {
    // Verifica o cookie de sessão usando o Firebase Admin SDK
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    // Retorna o UID do usuário se o cookie for válido
    return NextResponse.json({ uid: decodedToken.uid });
  } catch (error) {
    // O cookie é inválido ou expirou
    return NextResponse.json({ error: 'Invalid session cookie.' }, { status: 401 });
  }
}
