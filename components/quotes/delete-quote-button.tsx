"use client";

import { Trash2 } from "lucide-react";

import { deleteQuoteAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function DeleteQuoteButton({ quoteId }: { quoteId: string }) {
  return (
    <form
      action={deleteQuoteAction}
      onSubmit={(e) => {
        if (
          !confirm(
            "Are you sure you want to delete this quote? This cannot be undone.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="quoteId" value={quoteId} />
      <Button type="submit" variant="danger">
        <Trash2 className="h-4 w-4" />
        Delete
      </Button>
    </form>
  );
}
