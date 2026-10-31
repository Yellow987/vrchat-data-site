// Auth.js (NextAuth v5) — "Sign in with Google", locked to a single account.
//
// Only ALLOWED_EMAIL can establish a session; every other Google account is
// rejected at sign-in. This is what gates the private section: the public site
// needs no login, and the private data route additionally re-checks the email
// server-side before returning anything.
//
// Required env (set in Vercel + .env.local, never committed):
//   AUTH_SECRET          random string (`npx auth secret` or `openssl rand -base64 32`)
//   AUTH_GOOGLE_ID       OAuth client id
//   AUTH_GOOGLE_SECRET   OAuth client secret
//   ALLOWED_EMAIL        the one Gmail allowed to sign in

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/** The single account allowed in. Lower-cased; empty means "nobody" (locked). */
export const ALLOWED_EMAIL = (process.env.ALLOWED_EMAIL || "").trim().toLowerCase();

/** Server-side check: is this session the owner? */
export function isOwner(email: string | null | undefined): boolean {
  return !!ALLOWED_EMAIL && (email || "").toLowerCase() === ALLOWED_EMAIL;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [Google],
  callbacks: {
    // Reject anyone who isn't the allowed account — a session is never even
    // created for them.
    async signIn({ profile, user }) {
      return isOwner(profile?.email ?? user?.email);
    },
  },
});
