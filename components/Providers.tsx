"use client";

// Wraps the app so client components can read the auth session (useSession).
// SessionProvider fetches /api/auth/session on the client after hydration, so
// the server-rendered (and ISR-cached) HTML stays identical for everyone —
// logged-out — until a real session loads in the owner's browser.
import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
