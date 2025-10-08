'use server';
import { type NextRequest, NextResponse } from 'next/server';

interface AuthResult {
  isAuthenticated: boolean;
  response: NextResponse;
  uid?: string;
}

export async function authMiddleware(request: NextRequest): Promise<AuthResult> {
  const sessionCookie = request.cookies.get('session')?.value;
  const response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    }
  });

  if (!sessionCookie) {
    return { isAuthenticated: false, response };
  }

  // A URL absoluta é necessária para o fetch no lado do servidor
  const verifyUrl = new URL('/api/auth/session', request.url);

  try {
    const verificationResponse = await fetch(verifyUrl, {
      headers: {
        Cookie: `session=${sessionCookie}`,
      },
    });

    if (!verificationResponse.ok) {
        // O cookie é inválido ou expirado, remove o cookie do cliente
        response.cookies.delete('session');
        return { isAuthenticated: false, response };
    }

    const { uid } = await verificationResponse.json();

    if (uid) {
      response.headers.set('x-user-id', uid);
      return { isAuthenticated: true, uid, response };
    }

    return { isAuthenticated: false, response };
  } catch (error) {
    console.error('Error verifying session:', error);
    // Em caso de erro na verificação, invalida a sessão
    response.cookies.delete('session');
    return { isAuthenticated: false, response };
  }
}