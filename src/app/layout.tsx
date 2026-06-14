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
import { Suspense } from 'react';
import { AppContent } from '@/components/app-content';

export const metadata: Metadata = {
  title: 'SLOB_SERVIÇOS',
  description: 'Crie e gerencie orçamentos com base em diárias programáveis.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
              defaultTheme="system"
              storageKey="orcadia-theme"
            >
              <AppContent>{children}</AppContent>
              <Toaster />
            </ThemeProvider>
          </FirebaseClientProvider>
        </Suspense>
      </body>
    </html>
  );
}
