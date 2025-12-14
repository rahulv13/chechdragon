'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  Clapperboard,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  Lock,
} from 'lucide-react';
import { useAuth, useUser } from '@/firebase';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DraglistLogo } from '@/components/icons';

const navItems = [
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
  },
  {
    href: '/lists',
    icon: Clapperboard,
    label: 'My Lists',
  },
  {
    href: '/search',
    icon: Search,
    label: 'Search',
  },
  {
    href: '/secret',
    icon: Lock,
    label: 'Secret',
  },
];

const PUBLIC_ROUTES = ['/'];
const AUTH_ROUTES = ['/login', '/register'];


export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const auth = useAuth();
  const { user } = useUser();

  const handleLogout = () => {
    // Clear the secret section's unlocked status from localStorage on logout.
    if (user) {
      localStorage.removeItem(`draglist-secret-unlocked-${user.uid}`);
    }
    auth.signOut();
  };

  const getAvatarFallback = () => {
    if (user?.displayName) {
      return user.displayName.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'D';
  };

  // Hide layout for auth and public landing pages
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  // If user is not logged in and on the search page, show a simplified layout.
  if (!user && pathname === '/search') {
    return (
       <div className="flex flex-col min-h-screen">
          <header className="px-4 lg:px-6 h-16 flex items-center bg-background/95 backdrop-blur-sm border-b">
            <Link href="/" className="flex items-center justify-center" prefetch={false}>
              <DraglistLogo className="h-8 w-8 text-primary" />
              <span className="ml-2 text-xl font-bold">Draglist</span>
            </Link>
            <nav className="ml-auto flex gap-4 sm:gap-6">
              <Link
                href="/login"
                className="text-sm font-medium hover:underline underline-offset-4"
                prefetch={false}
              >
                Login
              </Link>
              <Button asChild>
                <Link href="/register" prefetch={false}>
                  Get Started
                </Link>
              </Button>
            </nav>
          </header>
          <main className="flex-1">{children}</main>
      </div>
    );
  }

  if (isAuthRoute || isPublicRoute) {
    return <>{children}</>;
  }


  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <DraglistLogo className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">Draglist</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} className="w-full">
                  <SidebarMenuButton
                    isActive={pathname.startsWith(item.href)}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user?.photoURL || ''}
                    data-ai-hint="profile person"
                  />
                  <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
                </Avatar>
                <span className="truncate">
                  {user?.displayName || user?.email || 'User'}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.displayName || 'Anonymous User'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email || 'No email provided'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:h-[60px] lg:px-6">
          <SidebarTrigger className="md:hidden" />
          <div className="flex-1">
            {/* Can add a global search or breadcrumbs here */}
          </div>
        </header>
        <main className="flex-1 flex-col overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

