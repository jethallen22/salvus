import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Pages can't clear cookies while rendering, so deactivated users are bounced here to be signed out.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const reason = request.nextUrl.searchParams.get("reason") === "inactive" ? "?error=inactive" : "";
  return NextResponse.redirect(new URL(`/login${reason}`, request.url));
}
