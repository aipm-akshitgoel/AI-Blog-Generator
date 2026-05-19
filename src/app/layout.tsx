import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { GlobalNavbar } from "@/components/GlobalNavbar";
import {
  CLERK_AFTER_AUTH_URL,
  CLERK_AFTER_SIGN_OUT_URL,
  CLERK_SIGN_IN_URL,
  CLERK_SIGN_UP_URL,
} from "@/lib/clerkAuth";
import { AuthSessionGuard } from "@/components/AuthSessionGuard";
import { StaleClerkSessionSync } from "@/components/StaleClerkSessionSync";
import { ScrollToTopOnNavigate } from "@/components/ScrollToTopOnNavigate";
import { clerkProviderAppearance } from "@/lib/clerkAppearance";
import { Suspense } from "react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://bloggieai.com"),
  title: "Bloggie AI — AI content for organic search",
  description: "Connect your site and keyword plan. Get SEO-ready drafts you can edit, optimize, and publish.",
  openGraph: {
    title: "Bloggie AI — AI content for organic search",
    description: "Connect your site and keyword plan. Get SEO-ready drafts you can edit, optimize, and publish.",
    url: "https://bloggieai.com",
    siteName: "Bloggie AI",
    locale: "en_US",
    type: "website",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bloggie AI — AI content for organic search",
    description: "Connect your site and keyword plan. Get SEO-ready drafts you can edit, optimize, and publish.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();

  const shell = (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen bg-neutral-950" suppressHydrationWarning>
        <Suspense>
          <ScrollToTopOnNavigate />
          <GlobalNavbar />
        </Suspense>
        <div className="min-h-[calc(100vh-3.5rem)]">{children}</div>
      </body>
    </html>
  );

  if (!publishableKey) {
    return shell;
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl={CLERK_SIGN_IN_URL}
      signUpUrl={CLERK_SIGN_UP_URL}
      signInFallbackRedirectUrl={CLERK_AFTER_AUTH_URL}
      signUpFallbackRedirectUrl={CLERK_AFTER_AUTH_URL}
      appearance={clerkProviderAppearance}
    >
      <AuthSessionGuard />
      <StaleClerkSessionSync />
      {shell}
    </ClerkProvider>
  );
}
