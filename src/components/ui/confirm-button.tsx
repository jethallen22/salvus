"use client";

import type { ComponentProps } from "react";
import { Button } from "./button";

/** Submit button that asks for confirmation first (native confirm dialog). */
export function ConfirmButton({ message, ...props }: ComponentProps<typeof Button> & { message: string }) {
  return (
    <Button
      type="submit"
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
      {...props}
    />
  );
}
