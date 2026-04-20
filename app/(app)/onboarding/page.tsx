import { redirect } from "next/navigation";

import { saveProfileSetupAction } from "@/app/actions";
import { getViewer, hasConfiguredRates } from "@/lib/auth";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

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

  return (
    <OnboardingWizard
      action={saveProfileSetupAction}
      profile={viewer.profile}
      error={params.error}
    />
  );
}
