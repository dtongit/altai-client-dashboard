import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/lib/toast-context";
import { ThemeProvider } from "@/lib/theme-context";
import { LayoutShell } from "@/components/layout-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://my.altaiweb.online"),
  title: "Altai Optima — Кабинет клиента",
  description: "Панель мониторинга и управления автономным ИИ-продавцом Верой",
  // Home-screen app (iPhone + Android): icons are made from the root repo's ai-logo.png (public/icons, apple-touch-icon).
  manifest: "/manifest.webmanifest",
  icons: {
    // favicon.ico comes from src/app/favicon.ico (Next adds that link itself).
    icon: [
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "Optima",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Altai Optima — Кабинет клиента",
    description: "Панель мониторинга и управления автономным ИИ-продавцом Верой",
    url: "https://my.altaiweb.online",
    siteName: "ALTAI Optima",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  if (typeof window !== 'undefined' && (window.location.hostname === 'dtongit.github.io' || window.location.hostname.endsWith('.github.io'))) {
                    var newPath = window.location.pathname.replace(/^\\/altai-client-dashboard/, '') || '/';
                    window.location.replace('https://my.altaiweb.online' + newPath + window.location.search + window.location.hash);
                    return;
                  }
                  var stored = localStorage.getItem('theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var isDark = stored === 'dark' || ((!stored || stored === 'system') && prefersDark);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.style.colorScheme = 'light';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-amber-500/30 selection:text-amber-700 dark:selection:text-amber-200 transition-colors">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
            <LayoutShell>{children}</LayoutShell>
          </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
