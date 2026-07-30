import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { THEME_MODE_STORAGE_KEY } from "@/lib/theme-mode";
import { Providers } from "./providers";
import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";
import "@astryxdesign/theme-neutral/theme.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bay Buddy | Professional Flight & Tour Management",
  description: "Flight and debt management system for Bay Buddy",
};

const themeModeInitializationScript = `
try {
  const mode = window.localStorage.getItem(${JSON.stringify(THEME_MODE_STORAGE_KEY)});
  if (mode === "light" || mode === "dark") {
    document.documentElement.setAttribute("data-theme", mode);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
} catch {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      data-astryx-theme="neutral"
      data-scroll-behavior="smooth"
      lang="vi"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: themeModeInitializationScript,
          }}
        />
      </head>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
