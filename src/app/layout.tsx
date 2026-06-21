import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://devscope.ai";
const siteName = "DevScope AI";
const siteDescription =
  "DevScope AI is a traffic testing and load testing platform for backend teams to simulate real user traffic, monitor performance metrics, detect bottlenecks, and plan scaling with AI-powered analysis.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: "DevScope AI | Traffic Testing and Load Testing Platform",
    template: "%s | DevScope AI",
  },
  description: siteDescription,
  keywords: [
    "DevScope AI",
    "traffic testing",
    "test traffic",
    "load testing",
    "stress testing",
    "performance testing",
    "backend monitoring",
    "metrics analysis",
    "AI bottleneck detection",
    "capacity planning",
  ],
  authors: [{ name: "DevScope AI" }],
  creator: "DevScope AI",
  publisher: "DevScope AI",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName,
    title: "DevScope AI | Traffic Testing and Load Testing Platform",
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: "DevScope AI | Traffic Testing and Load Testing Platform",
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
