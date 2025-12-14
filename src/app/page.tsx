
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DraglistLogo } from '@/components/icons';
import { Clapperboard, BookOpen, Lock, Share2 } from 'lucide-react';
import Image from 'next/image';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-16 flex items-center bg-background/95 backdrop-blur-sm">
        <Link href="#" className="flex items-center justify-center" prefetch={false}>
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
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    The Ultimate Anime & Manga Tracker
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Drag, drop, and track your progress. Effortlessly manage your lists, discover new titles, and keep your secret stash private.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg">
                    <Link href="/register" prefetch={false}>
                      Sign Up for Free
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/login" prefetch={false}>
                      Login to Your Account
                    </Link>
                  </Button>
                </div>
              </div>
              <Image
                src="https://images.unsplash.com/photo-1578632767115-351597cf247c?q=80&w=2787&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                width="600"
                height="600"
                alt="Hero"
                className="mx-auto aspect-square overflow-hidden rounded-xl object-cover sm:w-full lg:order-last"
                data-ai-hint="anime manga collage"
              />
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm">Key Features</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Everything You Need, Nothing You Don't</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Draglist is built for fans who want a beautiful, simple, and powerful way to keep track of their watching and reading habits.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 lg:max-w-none mt-12">
              <Card>
                <CardContent className="flex flex-col items-center text-center p-6">
                  <Clapperboard className="w-12 h-12 mb-4 text-primary" />
                  <h3 className="text-xl font-bold">Anime & Manga Lists</h3>
                  <p className="text-muted-foreground mt-2">
                    Keep separate, organized lists for everything you're watching and reading.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col items-center text-center p-6">
                  <BookOpen className="w-12 h-12 mb-4 text-primary" />
                  <h3 className="text-xl font-bold">Progress Tracking</h3>
                  <p className="text-muted-foreground mt-2">
                    Update your episode or chapter count with a single click. Never lose your place again.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col items-center text-center p-6">
                  <Lock className="w-12 h-12 mb-4 text-primary" />
                  <h3 className="text-xl font-bold">Secret Stash</h3>
                  <p className="text-muted-foreground mt-2">
                    A password-protected section for titles you want to keep private. Your secrets are safe.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; 2024 Draglist. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Terms of Service
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
