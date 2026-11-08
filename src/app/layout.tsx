import type { Metadata } from "next";
import { Space_Grotesk, Plus_Jakarta_Sans } from "next/font/google";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { JsonLd } from "@/components/ui/JsonLd";
import { AnalyticsConsent } from "@/components/ui/AnalyticsConsent";
import { getAnalyticsMeasurementId } from "@/lib/analytics";
import { getOrganizationSchema, getLocalBusinessSchema } from "@/lib/schema";
import { routeMetadata } from "@/lib/metadata";
import { getSeoPage, seoPages, siteName, siteUrl } from "@/lib/seo";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  ...routeMetadata("/"),
  metadataBase: new URL(siteUrl),
  title: { default: siteName + " | " + getSeoPage("/")!.title, template: "%s | " + siteName },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const measurementId = getAnalyticsMeasurementId();
  const analyticsRoutes = measurementId ? Object.fromEntries(Object.values(seoPages).map((page) => [page.path, page.title + " | " + siteName])) : {};
  return (
    <html lang="en-GB" className={spaceGrotesk.variable + " " + jakarta.variable}>
      <head><JsonLd data={[getOrganizationSchema(), getLocalBusinessSchema()]} /></head>
      <body><AnalyticsConsent measurementId={measurementId} routes={analyticsRoutes} origin={siteUrl}><a className="skip-link" href="#main">Skip to content</a><Navbar />{children}<Footer /></AnalyticsConsent></body>
    </html>
  );
}
