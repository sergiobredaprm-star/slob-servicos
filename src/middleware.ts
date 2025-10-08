import { NextResponse, type NextRequest } from 'next/server';
import { authMiddleware } from '@/firebase/auth/middleware';

// Lista de rotas públicas
const publicRoutes = ['/login', '/signup'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verifica se a rota é pública
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // Deixa as rotas de API do Next e arquivos estáticos passarem
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.startsWith('/static')) {
    return NextResponse.next();
  }

  // Aplica o middleware de autenticação
  const authResult = await authMiddleware(request);


  // Se o usuário não estiver autenticado e a rota não for pública, redireciona para o login
  if (!authResult.isAuthenticated && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Se o usuário estiver autenticado e tentando acessar uma rota pública, redireciona para o painel
  if (authResult.isAuthenticated && isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Permite o acesso se a condição não for atendida
  return authResult.response;
}

export const config = {
  matcher: ['/((?!_next/static|favicon.ico|robots.txt).*)'],
};
