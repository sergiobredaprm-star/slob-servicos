import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { MainNav } from '@/components/app/main-nav';
import { UserNav } from '@/components/app/user-nav';
import { Logo } from '@/components/app/logo';
import { FirebaseClientProvider } from '@/firebase';
import { cookies } from 'next/headers';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'OrçaDiária',
  description: 'Crie e gerencie orçamentos com base em diárias programáveis.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = cookies().get('session');

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <Suspense fallback={<div>Carregando...</div>}>
          <FirebaseClientProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              storageKey="orcadia-theme"
            >
              {session ? (
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
              ) : (
                <main>{children}</main>
              )}
              <Toaster />
            </ThemeProvider>
          </FirebaseClientProvider>
        </Suspense>
      </body>
    </html>
  );
}
