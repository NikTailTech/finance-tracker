import type { Metadata } from "next";
import { Manrope, Outfit } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { AppearanceProvider } from "@/components/layout/appearance";
import { primaryVars } from "@/lib/appearance";
import { loadAppearance } from "@/lib/load-settings";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const appearance = await loadAppearance();
  const icon = `/api/favicon?icon=${encodeURIComponent(appearance.icon)}&color=${encodeURIComponent(appearance.primaryColor)}`;
  return {
    title: appearance.appName,
    description: "Personal finance tracker for EUR, CHF, and cash envelopes",
    icons: { icon },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appearance = await loadAppearance();
  const themeClass = appearance.theme === "light" ? "light" : "dark";

  return (
    <html
      lang="en"
      className={`${manrope.variable} ${outfit.variable} h-full ${themeClass}`}
      style={primaryVars(appearance.primaryColor)}
    >
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)] antialiased">
        <AppearanceProvider initial={appearance}>
          <AppShell>{children}</AppShell>
        </AppearanceProvider>
      </body>
    </html>
  );
}
