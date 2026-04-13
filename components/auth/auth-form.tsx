import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthFormProps = {
  mode: "login" | "signup";
  action: (formData: FormData) => Promise<void>;
  error?: string;
};

export function AuthForm({ mode, action, error }: AuthFormProps) {
  const isLogin = mode === "login";

  return (
    <main className="container-shell flex min-h-screen items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-6 p-8">
          <div className="space-y-2 text-center">
            <p className="font-display text-2xl font-bold">PaintPricing.com</p>
            <h1 className="font-display text-3xl font-bold">
              {isLogin ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-sm leading-7 text-[var(--muted)]">
              {isLogin
                ? "Log in to access your quote dashboard."
                : "Set your rates, subscribe, and start sending quotes fast."}
            </p>
          </div>

          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="you@company.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                minLength={8}
                placeholder="At least 8 characters"
                required
              />
            </div>
            {error ? (
              <div className="rounded-2xl border border-[rgba(183,68,42,0.16)] bg-[rgba(183,68,42,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
                {error}
              </div>
            ) : null}
            <Button className="w-full" size="lg" type="submit">
              {isLogin ? "Log in" : "Create account"}
            </Button>
          </form>

          <p className="text-center text-sm text-[var(--muted)]">
            {isLogin ? "Need an account?" : "Already have an account?"}{" "}
            <Link
              className="font-semibold text-[var(--brand)]"
              href={isLogin ? "/signup" : "/login"}
            >
              {isLogin ? "Sign up" : "Log in"}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
