import { redirect } from "next/navigation";

import { updateProfileAction } from "@/app/actions";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { getViewer, hasConfiguredRates } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomFieldsEditor } from "@/components/settings/custom-fields-editor";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const viewer = await getViewer();
  const params = await searchParams;

  if (!viewer.user) {
    redirect("/login");
  }

  if (!hasConfiguredRates(viewer.profile)) {
    redirect("/onboarding");
  }

  const profile = viewer.profile!;
  const settings = profile.settings ?? DEFAULT_SETTINGS;

  return (
    <main className="container-shell py-6 pb-20">
      <div className="mb-6">
        <h1 className="text-xl font-bold sm:text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Update your business info, rates, and quote defaults.
        </p>
      </div>

      {params.success ? (
        <div className="mb-4 rounded-[var(--radius)] border border-[var(--success)]/20 bg-[var(--success-soft)] px-4 py-3 text-sm text-[var(--success)]">
          Settings saved successfully.
        </div>
      ) : null}

      {params.error ? (
        <div className="mb-4 rounded-[var(--radius)] border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          {params.error}
        </div>
      ) : null}

      <form action={updateProfileAction} className="grid gap-4 lg:grid-cols-2">
        {/* Business info */}
        <Card>
          <CardContent className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Business info
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="businessName">Business name</Label>
              <Input
                id="businessName"
                name="businessName"
                defaultValue={profile.businessName ?? ""}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={profile.phone ?? ""}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="businessEmail">Business email</Label>
              <Input
                id="businessEmail"
                name="businessEmail"
                type="email"
                defaultValue={profile.businessEmail ?? ""}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="licenseNumber">License number</Label>
              <Input
                id="licenseNumber"
                name="licenseNumber"
                defaultValue={profile.licenseNumber ?? ""}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                name="website"
                type="url"
                placeholder="https://yoursite.com"
                defaultValue={profile.website ?? ""}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="logo">Logo</Label>
              {profile.logoUrl ? (
                <div className="mb-2 flex items-center gap-3">
                  <img
                    src={profile.logoUrl}
                    alt="Current logo"
                    className="h-12 w-12 rounded-[var(--radius)] object-contain border border-[var(--line)]"
                  />
                  <p className="text-sm text-[var(--muted)]">Upload a new file to replace.</p>
                </div>
              ) : null}
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
              { name: "hourlyLaborRate", label: "Hourly labor rate ($)", value: settings.hourlyLaborRate },
              { name: "paintCostPerGallon", label: "Paint cost per gallon ($)", value: settings.paintCostPerGallon },
              { name: "wallCoverageSqFtPerGallon", label: "Wall coverage (sq ft/gal)", value: settings.wallCoverageSqFtPerGallon },
              { name: "trimCoverageSqFtPerGallon", label: "Trim coverage (sq ft/gal)", value: settings.trimCoverageSqFtPerGallon },
              { name: "defaultCoats", label: "Default coats", value: settings.defaultCoats },
              { name: "materialMarkupPercent", label: "Material markup (%)", value: settings.materialMarkupPercent },
              { name: "taxPercent", label: "Tax (%)", value: settings.taxPercent },
              { name: "minimumJobCharge", label: "Minimum job charge ($)", value: settings.minimumJobCharge },
            ].map((field) => (
              <div className="space-y-1.5" key={field.name}>
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

        {/* Custom fields */}
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Custom fields
            </p>
            <p className="text-sm text-[var(--muted)]">
              These appear at the bottom of your quotes. Add anything your customers need to see.
            </p>
            <CustomFieldsEditor initialFields={profile.customFields} />
          </CardContent>
        </Card>

        {/* Save */}
        <div className="lg:col-span-2 flex justify-end">
          <Button size="lg" type="submit">
            Save settings
          </Button>
        </div>
      </form>
    </main>
  );
}
