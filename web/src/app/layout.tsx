import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { TopNav } from "@/components/layout/top-nav";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SBL News — Science-Based Lifting Research Feed & Evidence Matrix",
  description:
    "Daily peer-reviewed resistance training, hypertrophy, and strength research with deterministic evidence scoring and living training guidelines.",
  icons: {
    icon: [
      { url: "/img/logo.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: ["/img/logo.png"],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "SBL News — Science-Based Lifting Research Feed & Evidence Matrix",
    description:
      "Daily peer-reviewed resistance training, hypertrophy, and strength research with deterministic evidence scoring and living training guidelines.",
    siteName: "SBL News",
    type: "website",
    images: [
      {
        url: "/img/logo.png",
        width: 512,
        height: 512,
        alt: "SBL News — Science-Based Lifting News emblem",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "SBL News — Science-Based Lifting Research Feed & Evidence Matrix",
    description:
      "Daily peer-reviewed resistance training, hypertrophy, and strength research with deterministic evidence scoring and living training guidelines.",
    images: ["/img/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-canvas font-sans text-ink antialiased">
        <TopNav />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
