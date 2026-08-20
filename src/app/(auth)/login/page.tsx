import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, roleHome } from "@/lib/auth/require-role";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(roleHome(session.role));

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,color-mix(in_oklch,var(--primary),transparent_80%),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_85%_90%,color-mix(in_oklch,var(--accent),transparent_75%),transparent)]" />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center gap-2 pb-2 text-center">
          <div className="mb-1 flex size-11 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-sm">
            H
          </div>
          <h1 className="text-xl font-semibold text-foreground">HMS Sign In</h1>
          <p className="text-sm text-muted-foreground">Staff and patient login</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 pt-4">
          <LoginForm />
          <p className="text-center text-sm text-muted-foreground">
            New patient?{" "}
            <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
