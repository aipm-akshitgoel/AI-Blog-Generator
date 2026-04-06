import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { GlobalNavbar } from "@/components/GlobalNavbar";
import { Suspense } from "react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://bloggieai.com"),
  title: "AI Organic Growth Platform",
  description: "Generate highly-optimized, SEO-ready blog posts in seconds. The ultimate AI content pipeline.",
  openGraph: {
    title: "AI Organic Growth Platform",
    description: "Generate highly-optimized, SEO-ready blog posts in seconds. The ultimate AI content pipeline.",
    url: "https://bloggieai.com",
    siteName: "AI Organic Growth Platform",
    locale: "en_US",
    type: "website",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Organic Growth Platform",
    description: "Generate highly-optimized, SEO-ready blog posts in seconds. The ultimate AI content pipeline.",
    images: ["/opengraph-image"],
  },
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
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap" rel="stylesheet" />
        </head>
        <body className="antialiased min-h-screen" suppressHydrationWarning>
          <Suspense>
            <GlobalNavbar />
          </Suspense>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
