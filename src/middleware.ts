import { NextResponse, type NextRequest } from 'next/server';
import { authMiddleware } from '@/firebase/auth/middleware';

// Lista de rotas públicas
const publicRoutes = ['/login', '/signup'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Deixa as rotas de API e arquivos estáticos passarem livremente
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const isPublicRoute = publicRoutes.includes(pathname);

  // Aplica o middleware de autenticação para verificar o cookie de sessão
  const authResult = await authMiddleware(request);

  // Se o usuário não estiver autenticado e a rota não for pública, redireciona para o login
  if (!authResult.isAuthenticated && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Se o usuário estiver autenticado e tentando acessar uma rota pública, redireciona para o painel
  if (authResult.isAuthenticated && isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Permite o acesso e passa a resposta do authMiddleware (que pode conter cookies modificados)
  return authResult.response;
}

export const config = {
  matcher: ['/((?!_next/static|favicon.ico|robots.txt).*)'],
};
