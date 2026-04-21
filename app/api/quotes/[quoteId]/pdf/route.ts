import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { QuotePdfDocument } from "@/components/quotes/quote-pdf-document";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { QuoteDraftPayload } from "@/lib/types";

export async function GET(
  _: Request,
  context: { params: Promise<{ quoteId: string }> },
) {
  const { quoteId } = await context.params;
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("quotes")
    .select("quote_data, is_unlocked")
    .eq("id", quoteId)
    .eq("user_id", user.id)
    .single();

  if (error || !data?.quote_data) {
    return NextResponse.json({ error: "Quote not found." }, { status: 404 });
  }

  // Block PDF download for locked quotes
  if (!data.is_unlocked) {
    return NextResponse.json(
      { error: "This quote is locked. Unlock it first to download the PDF." },
      { status: 403 },
    );
  }

  let pdf: Buffer;
  try {
    pdf = await renderToBuffer(
      QuotePdfDocument({
        payload: data.quote_data as QuoteDraftPayload,
      }),
    );
  } catch {
    return NextResponse.json({ error: "Failed to render PDF." }, { status: 500 });
  }

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="paintpricing-${quoteId}.pdf"`,
    },
  });
}
