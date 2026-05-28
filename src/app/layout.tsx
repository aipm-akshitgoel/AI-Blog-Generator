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
import {
  DEFAULT_OG_IMAGE,
  SITE_LOCALE,
  SITE_NAME,
} from "@/lib/siteSeo";
import { getPublicSiteUrl } from "@/lib/publicSiteUrl";
import "./globals.css";

const siteUrl = getPublicSiteUrl();
const siteDescription =
  "Connect your site and keyword plan. Get SEO-ready drafts you can edit, optimize, and publish.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE_NAME} — AI content for organic search`,
    template: `%s | ${SITE_NAME}`,
  },
  description: siteDescription,
  applicationName: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    title: `${SITE_NAME} — AI content for organic search`,
    description: siteDescription,
    url: siteUrl,
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    type: "website",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — AI content for organic search`,
    description: siteDescription,
    images: [DEFAULT_OG_IMAGE.url],
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
