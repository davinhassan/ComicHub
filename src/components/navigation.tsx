"use client";

import { Bookmark, Compass, House, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Beranda", Icon: House },
  { href: "/explore", label: "Jelajah", Icon: Compass },
  { href: "/library", label: "Koleksi", Icon: Bookmark },
  { href: "/settings", label: "Setelan", Icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigasi utama" className="main-nav">
      {links.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
        >
          <Icon className="size-5" aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
