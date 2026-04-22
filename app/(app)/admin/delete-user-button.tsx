"use client";

import { deleteUserAction } from "@/app/admin-actions";

export function DeleteUserButton({ userId, label }: { userId: string; label: string }) {
  const action = deleteUserAction.bind(null, userId);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Permanently delete ${label}? This cannot be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded px-2 py-1 text-[11px] font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition"
      >
        Delete
      </button>
    </form>
  );
}
