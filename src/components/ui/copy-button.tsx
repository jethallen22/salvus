"use client";

import { useState } from "react";
import { Button } from "./button";

export function CopyButton({ text, label = "Copy link" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (e.g. insecure context); the link stays visible to copy by hand.
    }
  }

  return (
    <Button variant="outline" onClick={copy} aria-live="polite">
      {copied ? "Copied" : label}
    </Button>
  );
}
