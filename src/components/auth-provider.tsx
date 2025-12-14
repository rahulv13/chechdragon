'use client';

import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { DraglistLogo } from './icons';

interface AuthProviderProps {
  children: ReactNode;
}

const PUBLIC_ROUTES = ['/', '/search'];
const AUTH_ROUTES = ['/login', '/register'];

export default function AuthProvider({ children }: AuthProviderProps) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isUserLoading) return; // Wait for user status to be resolved

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
    const isAuthRoute = AUTH_ROUTES.includes(pathname);

    if (user) {
      // If a logged-in user is on an auth page, redirect them to the dashboard.
      // We no longer redirect from public pages if logged in, to allow viewing them.
      if (isAuthRoute) {
        router.push('/dashboard');
      }
    } else {
      // If a non-logged-in user tries to access a private page, redirect them to login.
      if (!isAuthRoute && !isPublicRoute) {
        router.push('/login');
      }
    }
  }, [user, isUserLoading, router, pathname]);

  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // If we are loading auth state, show a spinner.
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <DraglistLogo className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If a user is logged in and on an auth route, show a loader while redirecting.
  if (user && isAuthRoute) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <DraglistLogo className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  // If not logged in, and trying to access a private page, show a loader while redirecting.
  if (!user && !isAuthRoute && !isPublicRoute) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <DraglistLogo className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }
  
  // In all other cases (the user is where they are supposed to be), render the page.
  return <>{children}</>;
}
