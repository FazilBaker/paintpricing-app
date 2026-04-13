import { redirect } from "next/navigation";

import { saveProfileSetupAction } from "@/app/actions";
import { DEFAULT_SETTINGS, FREE_QUOTES_LIMIT } from "@/lib/constants";
import { getViewer, hasConfiguredRates, hasPaidAccess } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const viewer = await getViewer();
  const params = await searchParams;

  if (!viewer.user) {
    redirect("/login");
  }

  if (hasConfiguredRates(viewer.profile) && hasPaidAccess(viewer.profile)) {
    redirect("/dashboard");
  }

  const defaults = viewer.profile?.settings ?? DEFAULT_SETTINGS;

  return (
    <main className="container-shell pb-20">
      <Card>
        <CardContent className="space-y-8 p-8">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
              First-time setup
            </p>
            <h1 className="font-display text-4xl font-bold">
              Set your standard rates
            </h1>
            <p className="max-w-3xl text-[var(--muted)]">
              These defaults are based on 2026 industry averages and power the
              60-second quote promise. You get {FREE_QUOTES_LIMIT} free quotes
              before you need to upgrade.
            </p>
          </div>

          <form action={saveProfileSetupAction} className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4 rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business name</Label>
                <Input id="businessName" name="businessName" defaultValue={viewer.profile?.businessName ?? ""} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" defaultValue={viewer.profile?.phone ?? ""} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessEmail">Business email</Label>
                <Input
                  id="businessEmail"
                  name="businessEmail"
                  type="email"
                  defaultValue={viewer.profile?.businessEmail ?? viewer.user.email ?? ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">License number (optional)</Label>
                <Input id="licenseNumber" name="licenseNumber" defaultValue={viewer.profile?.licenseNumber ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo">Logo upload (optional)</Label>
                <Input id="logo" name="logo" type="file" accept="image/*" />
              </div>
            </div>

            <div className="space-y-4 rounded-[28px] border border-[var(--line)] bg-white p-6">
              {[
                { name: "hourlyLaborRate", label: "Hourly labor rate", value: defaults.hourlyLaborRate },
                { name: "paintCostPerGallon", label: "Paint cost per gallon", value: defaults.paintCostPerGallon },
                {
                  name: "wallCoverageSqFtPerGallon",
                  label: "Wall coverage sq ft / gallon",
                  value: defaults.wallCoverageSqFtPerGallon,
                },
                {
                  name: "trimCoverageSqFtPerGallon",
                  label: "Trim coverage sq ft / gallon",
                  value: defaults.trimCoverageSqFtPerGallon,
                },
                { name: "defaultCoats", label: "Default coats", value: defaults.defaultCoats },
                {
                  name: "materialMarkupPercent",
                  label: "Material markup %",
                  value: defaults.materialMarkupPercent,
                },
                { name: "taxPercent", label: "Tax %", value: defaults.taxPercent },
                { name: "minimumJobCharge", label: "Minimum job charge", value: defaults.minimumJobCharge },
              ].map((field) => (
                <div className="space-y-2" key={field.name}>
                  <Label htmlFor={field.name}>{field.label}</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={String(field.value)}
                    required
                  />
                </div>
              ))}
            </div>

            {params.error ? (
              <div className="lg:col-span-2 rounded-2xl border border-[rgba(183,68,42,0.16)] bg-[rgba(183,68,42,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
                {params.error}
              </div>
            ) : null}

            <div className="lg:col-span-2 flex flex-col gap-4 rounded-[28px] bg-[var(--brand-soft)] p-6 text-[var(--brand-strong)]">
              <p className="font-semibold">
                Most painters use 375 sq ft per gallon and 200 sq ft per labor hour.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm">
                  Save your defaults once, then start building quotes.
                </p>
                <Button size="lg" type="submit">
                  Save setup
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
