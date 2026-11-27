import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { AccountProfileProvider } from "@/components/layout/account-profile-provider";
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

function resolveMetadataBase(): URL {
  const rawUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  if (rawUrl) {
    const normalized = /^https?:\/\//i.test(rawUrl)
      ? rawUrl
      : `https://${rawUrl}`;
    return new URL(normalized);
  }

  return new URL("http://localhost:3000");
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: "SBL News — Science-Based Lifting Research Feed & Evidence Matrix",
  description:
    "Daily peer-reviewed resistance training, hypertrophy, and strength research with deterministic evidence scoring and living training guidelines.",
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", sizes: "any" },
      { url: "/img/logo.png?v=2", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-touch-icon.png?v=2", sizes: "180x180", type: "image/png" },
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
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <meta name="color-scheme" content="light" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem("sbl_theme")==="dark"){document.documentElement.dataset.theme="dark";var m=document.querySelector('meta[name="color-scheme"]');if(m)m.content="dark";}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-canvas font-sans text-ink antialiased">
        <AccountProfileProvider>
          <TopNav />
          <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
            {children}
          </main>
        </AccountProfileProvider>
      </body>
    </html>
  );
}
