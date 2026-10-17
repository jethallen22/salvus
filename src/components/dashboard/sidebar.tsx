"use client";

import Link from "next/link";
import { useRef, type MouseEvent, type ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

const ICON_BUTTON =
  "inline-flex size-11 items-center justify-center rounded-md text-foreground touch-manipulation cursor-pointer " +
  "transition-[background-color,transform] duration-150 ease-out hover:bg-muted active:scale-[0.96] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Dashboard sidebar: a sticky rail from lg up, a native <dialog> drawer below it.
 * The same server-rendered content fills both; only one is ever displayed.
 */
export function Sidebar({ children }: { children: ReactNode }) {
  const drawer = useRef<HTMLDialogElement>(null);

  // Backdrop clicks land on the <dialog> itself; link clicks mean we're navigating away.
  function closeOnBackdropOrLink(event: MouseEvent<HTMLDialogElement>) {
    const target = event.target as HTMLElement;
    if (target === event.currentTarget || target.closest("a")) drawer.current?.close();
  }

  return (
    <>
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background px-4 lg:hidden">
        <Link href="/dashboard" aria-label="Salvus dashboard" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background">
          <Logo horizontal className="w-32" />
        </Link>
        <button
          type="button"
          aria-label="Open menu"
          aria-haspopup="dialog"
          onClick={() => drawer.current?.showModal()}
          className={ICON_BUTTON}
        >
          <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-none stroke-current" strokeWidth={1.5} strokeLinecap="round">
            <path d="M4 8h16M4 16h10" />
          </svg>
        </button>
      </div>

      <dialog
        ref={drawer}
        aria-label="Dashboard menu"
        onClick={closeOnBackdropOrLink}
        className="sidebar-drawer fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[min(20rem,85vw)] max-w-none border-r border-border bg-background p-0 text-foreground shadow-lg"
      >
        <div className="relative flex h-full flex-col">
          <button
            type="button"
            aria-label="Close menu"
            autoFocus
            onClick={() => drawer.current?.close()}
            className={`${ICON_BUTTON} absolute top-5 right-3`}
          >
            <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-none stroke-current" strokeWidth={1.5} strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          {children}
        </div>
      </dialog>

      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-muted/35 lg:flex">
        {children}
      </aside>
    </>
  );
}
