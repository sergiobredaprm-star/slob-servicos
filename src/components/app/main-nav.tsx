'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Settings } from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const links = [
  {
    href: '/',
    label: 'Painel',
    icon: Home,
  },
  {
    href: '/orcamentos',
    label: 'Orçamentos',
    icon: FileText,
  },
  {
    href: '/configuracoes',
    label: 'Configurações',
    icon: Settings,
  },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {links.map((link) => (
        <SidebarMenuItem key={link.href}>
          <Link href={link.href}>
            <SidebarMenuButton
              isActive={pathname === link.href}
              tooltip={link.label}
            >
              <link.icon />
              <span>{link.label}</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
