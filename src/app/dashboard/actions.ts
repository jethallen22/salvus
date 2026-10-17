"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { newWalletToken } from "@/lib/crypto/token";
import { canManageWallet } from "@/lib/permissions";
import { LOGO_BUCKET, PHOTO_BUCKET } from "@/lib/storage";
import { parseWalletForm, type WalletFormValues } from "@/lib/validation/wallet";

export type WalletFormState = {
  errors?: Record<string, string>;
  values?: WalletFormValues;
  saved?: boolean;
};

const SAVE_FAILED = { form: "Couldn't save your changes. Please try again." };

const uuid = z.uuid();

type ManagedWallet = { id: string; owner_id: string; logo_path: string | null; photo_path: string | null };

/**
 * Every mutation re-checks the session and the caller's permission for this specific wallet
 * (own → manage_own, anyone else's → manage_all). RLS enforces the same rule in the database.
 */
async function manageableWallet(id: string) {
  if (!uuid.safeParse(id).success) redirect("/dashboard");
  const { supabase, user, access } = await requireUser();
  const { data: wallet } = await supabase
    .from("wallets")
    .select("id, owner_id, logo_path, photo_path")
    .eq("id", id)
    .maybeSingle<ManagedWallet>();
  if (!wallet || !canManageWallet(access, wallet.owner_id === user.id)) redirect("/dashboard");
  return { supabase, user, wallet };
}

export async function createWallet(_prev: WalletFormState, formData: FormData): Promise<WalletFormState> {
  const { supabase, user, access } = await requireUser();

  // Admins may create a wallet for someone else; images then live in that owner's folder.
  const requestedOwner = formData.get("owner_id");
  const ownerId = typeof requestedOwner === "string" && uuid.safeParse(requestedOwner).success ? requestedOwner : user.id;
  if (!canManageWallet(access, ownerId === user.id)) redirect("/dashboard");

  const parsed = parseWalletForm(formData, ownerId);
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.values };

  const { token_hash, token_encrypted } = newWalletToken();
  const { data, error } = await supabase
    .from("wallets")
    .insert({ ...parsed.row, owner_id: ownerId, token_hash, token_encrypted })
    .select("id")
    .single<{ id: string }>();
  if (error) return { errors: SAVE_FAILED, values: parsed.values };

  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/${data.id}/edit?created=1`);
}

export async function updateWallet(id: string, _prev: WalletFormState, formData: FormData): Promise<WalletFormState> {
  const { supabase, wallet } = await manageableWallet(id);
  const parsed = parseWalletForm(formData, wallet.owner_id);
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.values };

  const { error } = await supabase.from("wallets").update(parsed.row).eq("id", id);
  if (error) return { errors: SAVE_FAILED, values: parsed.values };

  // Replaced or removed images: drop the old files so storage doesn't fill with orphans.
  if (wallet.logo_path && wallet.logo_path !== parsed.row.logo_path) {
    await supabase.storage.from(LOGO_BUCKET).remove([wallet.logo_path]);
  }
  if (wallet.photo_path && wallet.photo_path !== parsed.row.photo_path) {
    await supabase.storage.from(PHOTO_BUCKET).remove([wallet.photo_path]);
  }

  revalidatePath("/dashboard", "layout");
  return { saved: true, values: parsed.values };
}

export async function setWalletActive(id: string, active: boolean) {
  const { supabase } = await manageableWallet(id);
  await supabase.from("wallets").update({ is_active: active }).eq("id", id);
  revalidatePath("/dashboard", "layout");
}

/** Issues a new tap URL. The old one stops working, so the tag must be rewritten. */
export async function regenerateLink(id: string) {
  const { supabase } = await manageableWallet(id);
  const { token_hash, token_encrypted } = newWalletToken();
  await supabase.from("wallets").update({ token_hash, token_encrypted }).eq("id", id);
  revalidatePath("/dashboard", "layout");
}

export async function deleteWallet(id: string) {
  const { supabase, user, wallet } = await manageableWallet(id);
  const { error } = await supabase.from("wallets").delete().eq("id", id);
  if (!error && wallet.logo_path) await supabase.storage.from(LOGO_BUCKET).remove([wallet.logo_path]);
  if (!error && wallet.photo_path) await supabase.storage.from(PHOTO_BUCKET).remove([wallet.photo_path]);
  revalidatePath("/dashboard", "layout");
  redirect(wallet.owner_id === user.id ? "/dashboard" : "/dashboard/all-wallets");
}
