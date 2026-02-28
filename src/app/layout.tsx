import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { GlobalNavbar } from "@/components/GlobalNavbar";
import { Suspense } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bloggie AI",
  description: "Generate highly-optimized, SEO-ready blog posts in seconds. The ultimate AI content pipeline.",
  openGraph: {
    title: "Bloggie AI",
    description: "Generate highly-optimized, SEO-ready blog posts in seconds. The ultimate AI content pipeline.",
    url: "https://bloggieai.com",
    siteName: "Bloggie AI",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bloggie AI",
    description: "Generate highly-optimized, SEO-ready blog posts in seconds. The ultimate AI content pipeline.",
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
