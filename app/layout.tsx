import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

// Stand-in for Reference Sans: variable (100–900), so in-between weights like 430 and 460 resolve.
const sans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aida — pantau sektor IDX yang bergerak di luar perkiraan",
  description:
    "Membandingkan gerak tiap sektor IDX dengan perkiraan dari pasar Asia pagi ini. Riset internal, bukan nasihat investasi.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${sans.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
