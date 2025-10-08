import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeFirebaseAdmin } from '@/firebase/auth/firebase-admin';

const adminApp = initializeFirebaseAdmin();
const adminAuth = getAuth(adminApp);

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
      maxAge: expiresIn,
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
