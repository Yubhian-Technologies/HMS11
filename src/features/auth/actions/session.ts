"use server";

import { cookies } from "next/headers";
import { getAdminAuth } from "@/server/firebase-admin";
import { SESSION_COOKIE_NAME, SESSION_DURATION_SECONDS } from "@/lib/auth/constants";

/**
 * Exchanges a freshly-signed-in client ID token for an httpOnly session
 * cookie. Called right after Firebase client `signInWithEmailAndPassword`
 * succeeds (see features/auth/services/login.ts). The ID token itself is
 * never persisted — only the session cookie, which the Admin SDK can verify
 * server-side on every request (lib/auth/require-role.ts).
 */
export async function createSession(idToken: string): Promise<void> {
  const sessionCookie = await getAdminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION_SECONDS * 1000,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
    maxAge: SESSION_DURATION_SECONDS,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
