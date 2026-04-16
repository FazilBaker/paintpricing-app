import { redirect } from "next/navigation";

import { getViewer, hasConfiguredRates } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { QuoteDraftPayload } from "@/lib/types";
import { QuoteBuilder } from "@/components/quotes/quote-builder";

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const viewer = await getViewer();

  if (!viewer.user) {
    redirect("/login");
  }

  if (!hasConfiguredRates(viewer.profile)) {
    redirect("/onboarding");
  }

  if (!viewer.profile) {
    redirect("/dashboard");
  }

  // Load existing quote data if editing
  const params = await searchParams;
  let initialData: React.ComponentProps<typeof QuoteBuilder>["initialData"];

  if (params.edit) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase
        .from("quotes")
        .select("id, quote_data, version, parent_quote_id")
        .eq("id", params.edit)
        .eq("user_id", viewer.user.id)
        .single();

      if (data) {
        const quoteData = data.quote_data as QuoteDraftPayload;
        // The parent is always the root quote (first version)
        const rootId = data.parent_quote_id ?? data.id;

        initialData = {
          client: quoteData.client,
          items: quoteData.items ?? [],
          parentQuoteId: rootId,
          version: (data.version ?? 1) + 1,
          discount: quoteData.discount,
        };
      }
    }
  }

  return (
    <main className="container-shell py-6 pb-20">
      <QuoteBuilder profile={viewer.profile} initialData={initialData} />
    </main>
  );
}
