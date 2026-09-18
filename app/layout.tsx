import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
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
  themeColor: "#E6EDF6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
