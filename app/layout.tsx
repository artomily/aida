import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import ThemeScript from "./components/ThemeScript";
import "./globals.css";

// Variable Inter (100–900): the design leans on in-between weights like 360, 470 and 520.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Divergence — pantau sektor IDX yang bergerak di luar perkiraan",
  description:
    "Membandingkan gerak tiap sektor IDX dengan perkiraan dari pasar Asia pagi ini. Riset internal, bukan nasihat investasi.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E6EDF6" },
    { media: "(prefers-color-scheme: dark)", color: "#0A1424" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The head script sets data-theme before paint; React must accept that attribute as-is.
    <html lang="id" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
