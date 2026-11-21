import type { Metadata } from "next";
import Link from "next/link";
import { PanelsTopLeft } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Theme, ThemeToggle } from "@/components/theme";
import { metadataBase } from "@/lib/site-url";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase,
  title: { default: "ComicHub", template: "%s | ComicHub" },
  description: "Tempat menjelajahi dan membaca komik.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <Theme>
          <a href="#konten" className="skip-link">
            Lewati ke konten
          </a>
          <header className="site-header">
            <div className="frame header-inner">
              <Link href="/" className="brand">
                <PanelsTopLeft
                  className="size-6 text-primary"
                  aria-hidden="true"
                />
                ComicHub
              </Link>
              <Navigation />
              <ThemeToggle />
            </div>
          </header>
          <main id="konten" tabIndex={-1} className="frame">
            {children}
          </main>
          <footer className="frame site-footer">
            <span>
              ComicHub · Katalog MangaDex disediakan oleh{" "}
              <a href="https://mangadex.org">MangaDex</a>
            </span>
            <Link href="/about">Tentang dan kredit</Link>
          </footer>
        </Theme>
      </body>
    </html>
  );
}
