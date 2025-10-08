import { NextResponse, type NextRequest } from 'next/server';

// Este middleware é um placeholder e não faz nada.
// A autenticação agora é tratada no lado do cliente.
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|favicon.ico|robots.txt).*)'],
};