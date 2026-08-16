import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, roleHome } from "@/lib/auth/require-role";
import { SignupForm } from "@/features/auth/components/SignupForm";

export default async function SignupPage() {
  const session = await getSession();
  if (session) redirect(roleHome(session.role));

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden bg-background p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,color-mix(in_oklch,var(--primary),transparent_82%),transparent)]"
      />
      <div className="text-center">
        <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-sm">
          H
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Patient Sign Up</h1>
        <p className="text-sm text-muted-foreground">Register once, book at any hospital on the platform</p>
      </div>
      <SignupForm />
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
