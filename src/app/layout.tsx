import type { Metadata } from "next";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "My App",
  description: "Next.js app with Vercel, Supabase, Gemini, Clerk",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="antialiased min-h-screen">
          <header className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
              <Link href="/" className="font-semibold text-neutral-100">
                My App
              </Link>
              <div className="flex items-center gap-4">
                <SignedOut>
                  <SignInButton mode="modal" />
                  <SignUpButton mode="modal" />
                </SignedOut>
                <SignedIn>
                  <UserButton afterSignOutUrl="/" />
                </SignedIn>
              </div>
            </div>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
