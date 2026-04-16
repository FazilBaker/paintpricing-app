import { redirect } from "next/navigation";

import { saveProfileSetupAction } from "@/app/actions";
import { DEFAULT_SETTINGS, FREE_QUOTES_LIMIT } from "@/lib/constants";
import { getViewer, hasConfiguredRates } from "@/lib/auth";
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

  if (hasConfiguredRates(viewer.profile)) {
    redirect("/dashboard");
  }

  const defaults = viewer.profile?.settings ?? DEFAULT_SETTINGS;

  return (
    <main className="container-shell py-6 pb-20">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          First-time setup
        </p>
        <h1 className="mt-1 text-xl font-bold sm:text-2xl">
          Set your standard rates
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          These defaults power the 60-second quote promise. Create unlimited quotes — you get{" "}
          {FREE_QUOTES_LIMIT} free unlocks to download and share.
        </p>
      </div>

      <form action={saveProfileSetupAction} className="grid gap-4 lg:grid-cols-2">
        {/* Business info */}
        <Card>
          <CardContent className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Business info
            </p>
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
              <Label htmlFor="logo">Logo (optional)</Label>
              <Input id="logo" name="logo" type="file" accept="image/*" />
            </div>
          </CardContent>
        </Card>

        {/* Rates */}
        <Card>
          <CardContent className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Default rates
            </p>
            {[
              { name: "hourlyLaborRate", label: "Hourly labor rate ($)", value: defaults.hourlyLaborRate },
              { name: "paintCostPerGallon", label: "Paint cost per gallon ($)", value: defaults.paintCostPerGallon },
              { name: "wallCoverageSqFtPerGallon", label: "Wall coverage (sq ft/gal)", value: defaults.wallCoverageSqFtPerGallon },
              { name: "trimCoverageSqFtPerGallon", label: "Trim coverage (sq ft/gal)", value: defaults.trimCoverageSqFtPerGallon },
              { name: "defaultCoats", label: "Default coats", value: defaults.defaultCoats },
              { name: "materialMarkupPercent", label: "Material markup (%)", value: defaults.materialMarkupPercent },
              { name: "taxPercent", label: "Tax (%)", value: defaults.taxPercent },
              { name: "minimumJobCharge", label: "Minimum job charge ($)", value: defaults.minimumJobCharge },
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
          </CardContent>
        </Card>

        {params.error ? (
          <div className="lg:col-span-2 rounded-[var(--radius)] border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
            {params.error}
          </div>
        ) : null}

        <div className="lg:col-span-2">
          <Card className="bg-[var(--brand-soft)] border-[var(--brand)]/10">
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-[var(--brand)]">
                  Most painters use 375 sq ft/gal and $45/hr labor.
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Save your defaults once, then start building quotes.
                </p>
              </div>
              <Button size="lg" type="submit" className="shrink-0">
                Save and continue
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </main>
  );
}
