"use client";

import { useState } from "react";
import { ArrowRight, Check, Plus } from "lucide-react";

import type { ProfileRecord } from "@/lib/types";
import { DEFAULT_SETTINGS, FREE_QUOTES_LIMIT } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OnboardingWizardProps = {
  action: (formData: FormData) => Promise<void>;
  profile: ProfileRecord | null;
  error?: string;
};

const STEPS = ["Business", "Rates", "Ready"] as const;

const RATE_FIELDS = [
  { name: "hourlyLaborRate", label: "Hourly labor rate", unit: "$/hr" },
  { name: "paintCostPerGallon", label: "Paint cost per gallon", unit: "$/gal" },
  { name: "wallCoverageSqFtPerGallon", label: "Wall coverage", unit: "sq ft/gal" },
  { name: "trimCoverageSqFtPerGallon", label: "Trim coverage", unit: "sq ft/gal" },
  { name: "defaultCoats", label: "Default coats", unit: "coats" },
  { name: "materialMarkupPercent", label: "Material markup", unit: "%" },
] as const;

export function OnboardingWizard({ action, profile, error }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const defaults = profile?.settings ?? DEFAULT_SETTINGS;

  return (
    <form action={action} className="min-h-dvh bg-[var(--background)]">
      <div className="max-w-xl mx-auto px-6 pt-8 pb-24">
        {/* Progress header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="pp-logo-mark" />
          <span className="text-[15px] font-bold text-[var(--navy-700)] flex-1">PaintPricing</span>
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === step ? 28 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i <= step ? "var(--amber-500)" : "var(--line)",
                  transition: "all 0.2s",
                }}
              />
            ))}
          </div>
          <span className="font-mono text-xs text-[var(--muted)] font-semibold">{step + 1}/{STEPS.length}</span>
        </div>

        {/* Step 1: Business info */}
        <div hidden={step !== 0}>
            <span
              className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold mb-3"
              style={{ background: "var(--navy-50)", color: "var(--navy-700)", letterSpacing: "0.06em" }}
            >
              STEP 1
            </span>
            <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ letterSpacing: "-0.02em" }}>
              Your business
            </h1>
            <p className="text-sm text-[var(--muted)] mb-7 leading-relaxed">
              This shows on every quote PDF so clients know who sent it.
            </p>
            <div
              className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] p-6"
              style={{ boxShadow: "var(--shadow-sm)" }}
            >
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="businessName" className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Business name</Label>
                  <Input id="businessName" name="businessName" defaultValue={profile?.businessName ?? ""} placeholder="Palmer Painting Co." required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Phone</Label>
                    <Input id="phone" name="phone" defaultValue={profile?.phone ?? ""} placeholder="(512) 555-0142" required className="font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="licenseNumber" className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">License #</Label>
                    <Input id="licenseNumber" name="licenseNumber" defaultValue={profile?.licenseNumber ?? ""} placeholder="Optional" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="businessEmail" className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Business email</Label>
                  <Input id="businessEmail" name="businessEmail" type="email" defaultValue={profile?.businessEmail ?? ""} placeholder="you@company.com" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="logo" className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Logo (optional)</Label>
                  <div
                    className="flex gap-3 p-3 rounded-[var(--radius)] border border-dashed border-[var(--line)] bg-[var(--background)]"
                  >
                    <div
                      className="w-12 h-12 rounded-[var(--radius)] flex items-center justify-center shrink-0"
                      style={{ background: "var(--navy-50)", color: "var(--navy-700)" }}
                    >
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Upload logo</p>
                      <p className="text-xs text-[var(--muted)] mt-0.5">PNG or SVG · Square works best</p>
                      <Input id="logo" name="logo" type="file" accept="image/*" className="mt-2 text-xs" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </div>

        {/* Step 2: Rates */}
        <div hidden={step !== 1}>
            <span
              className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold mb-3"
              style={{ background: "var(--navy-50)", color: "var(--navy-700)", letterSpacing: "0.06em" }}
            >
              STEP 2
            </span>
            <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ letterSpacing: "-0.02em" }}>
              Set your rates
            </h1>
            <p className="text-sm text-[var(--muted)] mb-7 leading-relaxed">
              Default values — override per quote anytime. Don&apos;t overthink it; change later in Settings.
            </p>
            <div
              className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] p-6"
              style={{ boxShadow: "var(--shadow-sm)" }}
            >
              <div className="grid grid-cols-2 gap-4">
                {RATE_FIELDS.map((f) => (
                  <div key={f.name} className="space-y-1.5">
                    <Label htmlFor={f.name} className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                      {f.label}
                    </Label>
                    <div className="relative">
                      <Input
                        id={f.name}
                        name={f.name}
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={String((defaults as Record<string, number>)[f.name])}
                        required
                        className="font-mono pr-14"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] font-medium pointer-events-none">
                        {f.unit}
                      </span>
                    </div>
                  </div>
                ))}
                {/* Hidden fields not in RATE_FIELDS */}
                <input type="hidden" name="taxPercent" value={String(defaults.taxPercent)} />
                <input type="hidden" name="minimumJobCharge" value={String(defaults.minimumJobCharge)} />
              </div>
              <div
                className="flex gap-3 items-start mt-5 p-3.5 rounded-[var(--radius)] border"
                style={{ background: "var(--amber-50)", borderColor: "var(--amber-100)" }}
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "var(--amber-500)", color: "#3B2300" }}
                >
                  <span className="text-xs font-bold">!</span>
                </div>
                <p className="text-sm text-[var(--ink-2)] leading-relaxed">
                  Most painters use <span className="font-mono font-semibold">375 sq ft/gal</span> wall coverage and <span className="font-mono font-semibold">2 coats</span> as defaults.
                </p>
              </div>
            </div>
        </div>

        {/* Step 3: Ready */}
        <div hidden={step !== 2} className="text-center py-10">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: "#D1FAE5", color: "var(--ok)" }}
            >
              <Check className="w-10 h-10" strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-3" style={{ letterSpacing: "-0.02em" }}>
              You&apos;re set up.
            </h1>
            <p className="text-[15px] text-[var(--muted)] leading-relaxed max-w-sm mx-auto mb-8">
              {FREE_QUOTES_LIMIT} free unlocks to get you started. Build your first quote — takes about 60 seconds.
            </p>
            {error && (
              <div className="mb-4 rounded-[var(--radius)] border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)] text-left">
                {error}
              </div>
            )}
            <Button size="lg" type="submit" className="min-w-48 justify-center"
              style={{ background: "var(--amber-500)", color: "#3B2300", fontWeight: 600 }}
            >
              <Plus className="w-4 h-4" /> Build your first quote
            </Button>
            <div className="mt-3">
              <button
                type="submit"
                className="text-sm text-[var(--muted)] font-medium hover:text-[var(--ink)] transition"
              >
                Skip for now, go to dashboard
              </button>
            </div>
        </div>

        {/* Navigation */}
        {step < 2 && (
          <div className="flex justify-between mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={() => setStep((s) => s + 1)}
            >
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}
