import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { Providers } from "./providers";
import { Toaster } from "sonner";
import "./globals.css";

const interSans = Inter({
  variable: "--font-sans",
  display: "swap",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bay Buddy | Professional Flight & Tour Management",
  description: "Flight and debt management system for Bay Buddy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${interSans.variable} ${sourceSerif.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
