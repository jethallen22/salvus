import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

// The public tap page (/w/...) needs no session, so the proxy skips it.
export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
