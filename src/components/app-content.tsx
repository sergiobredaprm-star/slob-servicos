'use client';

import { useUser } from '@/firebase';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/app/logo';
import { MainNav } from '@/components/app/main-nav';
import { UserNav } from '@/components/app/user-nav';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function AppContent({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isUserLoading) {
      return; // Aguarde a verificação da autenticação
    }

    const isAuthPage = pathname === '/login' || pathname === '/signup';

    if (!user && !isAuthPage) {
      router.replace('/login');
    } else if (user && isAuthPage) {
      router.replace('/');
    }
  }, [user, isUserLoading, pathname, router]);

  if (isUserLoading || (!user && pathname !== '/login' && pathname !== '/signup')) {
     return <div className="flex h-screen items-center justify-center">Carregando...</div>;
  }

  const isAuthPage = pathname === '/login' || pathname === '/signup';

  if (isAuthPage) {
    return <main>{children}</main>;
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
          <Logo />
        </SidebarHeader>
        <SidebarContent>
          <MainNav />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
          <div className="flex-1" />
          <UserNav />
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}