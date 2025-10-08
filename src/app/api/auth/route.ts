import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeFirebaseAdmin } from './_firebase-admin';

// Esta rota de API é executada no ambiente Node.js, onde o 'firebase-admin' é suportado.

const adminApp = initializeFirebaseAdmin();
const adminAuth = getAuth(adminApp);

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value;
    if (sessionCookie) {
      // Verifica o cookie de sessão usando o Firebase Admin SDK
      await adminAuth.verifySessionCookie(sessionCookie, true);
      return NextResponse.json({ isAuthenticated: true });
    }
    return NextResponse.json({ isAuthenticated: false });
  } catch (error) {
    // O cookie é inválido ou expirou
    return NextResponse.json({ isAuthenticated: false });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idToken = body.idToken;

    if (!idToken) {
      return NextResponse.json({ error: 'ID token not provided.' }, { status: 400 });
    }

    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 dias
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

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

  } catch (error) {
    console.error('Session login error:', error);
    return NextResponse.json({ error: 'Failed to create session.' }, { status: 401 });
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
