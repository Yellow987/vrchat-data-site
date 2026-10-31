// Auth-gated private data. The sensitive metrics are ONLY ever served from
// here, and only to the owner's authenticated session — they are never part of
// the public page HTML and this response is never cached.
import { auth, isOwner } from "@/auth";
import { getPrivateData } from "@/lib/sheet";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Fail closed: any auth problem (incl. auth not yet configured) → 401, never
  // a 500 that could leak a stack trace or behave unexpectedly.
  let email: string | null | undefined;
  try {
    const session = await auth();
    email = session?.user?.email;
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isOwner(email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const data = await getPrivateData();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
