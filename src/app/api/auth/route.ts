import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeFirebaseAdmin } from './_firebase-admin';

// Esta rota de API é executada no ambiente Node.js, onde o 'firebase-admin' é suportado.

let adminAuth: ReturnType<typeof getAuth> | undefined;

function ensureAdminAuth() {
  if (!adminAuth) {
    const adminApp = initializeFirebaseAdmin();
    adminAuth = getAuth(adminApp);
  }
  return adminAuth;
}

// Funções do manipulador de rota
export async function GET(request: NextRequest) {
  try {
    const auth = ensureAdminAuth();
    const sessionCookie = request.cookies.get('session')?.value;
    if (sessionCookie) {
      await auth.verifySessionCookie(sessionCookie, true);
      return NextResponse.json({ isAuthenticated: true });
    }
    return NextResponse.json({ isAuthenticated: false });
  } catch (error) {
    if (error instanceof Error && error.message.includes("initialization failed")) {
         return NextResponse.json({ error: error.message }, { status: 500 });
    }
    // Para outros erros (ex: cookie inválido), consideramos como não autenticado
    return NextResponse.json({ isAuthenticated: false });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = ensureAdminAuth();
    const body = await request.json();
    const idToken = body.idToken;

    if (!idToken) {
      return NextResponse.json({ error: 'ID token not provided.' }, { status: 400 });
    }

    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 dias
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

    const options = {
      name: 'session',
      value: sessionCookie,
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    };

    const response = NextResponse.json({ status: 'success' });
    response.cookies.set(options);
    
    return response;

  } catch (error: any) {
    console.error('Session login error:', error.message);
    const errorMessage = error.message.includes("initialization failed") 
      ? "Firebase Admin SDK initialization failed."
      : "Failed to create session.";
    const status = error.message.includes("initialization failed") ? 500 : 401;

    return NextResponse.json({ error: errorMessage, details: error.message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  const options = {
    name: 'session',
    value: '',
    maxAge: -1,
  };

  const response = NextResponse.json({ status: 'success' });
  response.cookies.set(options);

  return response;
}
