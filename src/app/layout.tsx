import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";
import { siteUrl as resolveSiteUrl } from "@/lib/site-url";
import { AuthProvider } from "@/lib/auth";
import { ApplyReturnPrompt } from "@/components/apply-return-prompt";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const siteUrl = resolveSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "PM Dream Job — Product Management jobs in India, in one place",
    template: "%s · PM Dream Job",
  },
  description:
    "Discover Product Management roles across India — search, filter by level, domain and work mode, and apply at the source. Refreshed every few hours.",
  keywords: [
    "product manager jobs",
    "PM jobs India",
    "APM jobs",
    "senior product manager",
    "product management careers",
  ],
  openGraph: {
    type: "website",
    siteName: "PM Dream Job",
    url: siteUrl,
    title: "PM Dream Job — Product Management jobs in India, in one place",
    description:
      "Discover Product Management roles across India — search, filter, and apply at the source.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PM Dream Job",
    description: "Product Management jobs in India, in one place.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-text">
        <AuthProvider>
          {children}
          <ApplyReturnPrompt />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
