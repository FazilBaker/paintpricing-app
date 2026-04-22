"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin";
import { getViewer } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const viewer = await getViewer();
  if (!viewer.user || !isAdmin(viewer.user.email)) {
    redirect("/dashboard");
  }
}

export async function suspendUserAction(userId: string) {
  await requireAdmin();
  const admin = createSupabaseAdminClient();
  if (!admin) return;
  await admin.from("profiles").update({ status: "suspended" }).eq("id", userId);
  revalidatePath("/admin");
}

export async function reactivateUserAction(userId: string) {
  await requireAdmin();
  const admin = createSupabaseAdminClient();
  if (!admin) return;
  await admin.from("profiles").update({ status: "active" }).eq("id", userId);
  revalidatePath("/admin");
}

export async function deleteUserAction(userId: string) {
  await requireAdmin();
  const admin = createSupabaseAdminClient();
  if (!admin) return;
  await admin.auth.admin.deleteUser(userId);
  revalidatePath("/admin");
}
