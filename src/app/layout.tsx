import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { GlobalNavbar } from "@/components/GlobalNavbar";
import { Suspense } from "react";
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
    <ClerkProvider
      appearance={{ elements: { footer: "hidden", footerAction: "hidden", userButtonPopoverFooter: "hidden" } }}
    >
      <html lang="en">
        <body className="antialiased min-h-screen">
          <Suspense>
            <GlobalNavbar />
          </Suspense>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
