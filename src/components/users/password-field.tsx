"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, fieldA11y } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { generatePassword } from "@/lib/generate-password";

const HINT = "At least 8 characters. They'll be asked to choose their own at first sign-in.";

/** Temporary-password input with Generate, Show and Copy, for admins creating or resetting accounts. */
export function PasswordField({ label, error }: { label: string; error?: string }) {
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (e.g. insecure context); Show lets them copy by hand.
    }
  }

  return (
    <Field id="password" label={label} hint={HINT} error={error}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            {...fieldA11y("password", error, HINT)}
            name="password"
            type={visible ? "text" : "password"}
            autoComplete="new-password"
            spellCheck={false}
            required
            minLength={8}
            maxLength={72}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="pr-12 font-mono"
          />
          {value && (
            <button
              type="button"
              onClick={copy}
              aria-label={copied ? "Password copied" : "Copy password"}
              title={copied ? "Copied" : "Copy"}
              className="absolute inset-y-0 right-1 my-auto flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">
                {copied ? (
                  <path d="m3.5 8.5 3 3 6-7" />
                ) : (
                  <>
                    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
                    <path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" />
                  </>
                )}
              </svg>
            </button>
          )}
          <span role="status" aria-live="polite" className="sr-only">
            {copied ? "Password copied" : ""}
          </span>
        </div>
        <Button variant="outline" onClick={() => { setValue(generatePassword()); setVisible(true); }}>
          Generate
        </Button>
        <Button variant="ghost" onClick={() => setVisible((v) => !v)} aria-pressed={visible}>
          {visible ? "Hide" : "Show"}
        </Button>
      </div>
    </Field>
  );
}
