import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeFirebaseAdmin } from './_firebase-admin';

// Esta rota de API é executada no ambiente Node.js, onde o 'firebase-admin' é suportado.

try {
  const adminApp = initializeFirebaseAdmin();
  const adminAuth = getAuth(adminApp);

  // Funções do manipulador de rota
  async function GET(request: NextRequest) {
    try {
      const sessionCookie = request.cookies.get('session')?.value;
      if (sessionCookie) {
        await adminAuth.verifySessionCookie(sessionCookie, true);
        return NextResponse.json({ isAuthenticated: true });
      }
      return NextResponse.json({ isAuthenticated: false });
    } catch (error) {
      return NextResponse.json({ isAuthenticated: false });
    }
  }

  async function POST(request: NextRequest) {
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

    } catch (error: any) {
      console.error('Session login error:', error.message);
      return NextResponse.json({ error: 'Failed to create session.', details: error.message }, { status: 401 });
    }
  }

  async function DELETE(request: NextRequest) {
    const options = {
      name: 'session',
      value: '',
      maxAge: -1,
    };

    const response = NextResponse.json({ status: 'success' });
    response.cookies.set(options);

    return response;
  }

  // Exporta os manipuladores
  export { GET, POST, DELETE };

} catch (error: any) {
  console.error("Failed to initialize Firebase Admin SDK in route handler:", error.message);

  // Se a inicialização falhar, exporte manipuladores que retornam um erro.
  const handler = async () => {
    return NextResponse.json({ error: 'Firebase Admin SDK initialization failed.' }, { status: 500 });
  }
  export { handler as GET, handler as POST, handler as DELETE };
}
