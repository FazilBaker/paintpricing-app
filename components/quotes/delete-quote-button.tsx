"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { deleteQuoteAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function DeleteQuoteButton({ quoteId }: { quoteId: string }) {
  const [armed, setArmed] = useState(false);

  if (armed) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--muted)]">Sure?</span>
        <Button variant="secondary" size="sm" type="button" onClick={() => setArmed(false)}>
          Cancel
        </Button>
        <form action={deleteQuoteAction}>
          <input type="hidden" name="quoteId" value={quoteId} />
          <Button type="submit" variant="danger" size="sm">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </form>
      </div>
    );
  }

  return (
    <Button type="button" variant="danger" onClick={() => setArmed(true)}>
      <Trash2 className="h-4 w-4" />
      Delete
    </Button>
  );
}
