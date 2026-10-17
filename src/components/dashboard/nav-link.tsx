"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const WALLET_PAGE = /^\/dashboard(\/new|\/[0-9a-f-]{36}\/edit)?$/;

/** Sidebar nav link that marks itself current; "My wallets" also covers its new/edit pages. */
export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const current = href === "/dashboard" ? WALLET_PAGE.test(pathname) : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium tracking-[0.05em] touch-manipulation transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        current
          ? "bg-card text-foreground before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-full before:bg-accent"
          : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
