"use client";

// Small header control. A subtle lock for signing in (only the allowed Google
// account can actually get in); once signed in, a sign-out control.
import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") return <span className="auth-btn" aria-hidden />;

  if (session?.user) {
    return (
      <button
        className="auth-btn is-in"
        onClick={() => signOut()}
        title={`Signed in as ${session.user.email ?? "owner"} — sign out`}
      >
        🔓 Sign out
      </button>
    );
  }

  return (
    <button
      className="auth-btn"
      onClick={() => signIn("google")}
      title="Owner sign-in"
      aria-label="Owner sign-in"
    >
      🔒
    </button>
  );
}
