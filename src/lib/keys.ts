import { randomUUID } from "node:crypto";
import type { AccessKey } from "@/lib/domain";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateGameKey() {
  const chunk = () =>
    Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `${chunk()}-${chunk()}-${chunk()}-${chunk()}`;
}

export async function createAccessKey() {
  const supabase = getSupabaseAdmin();
  const payload = {
    id: randomUUID(),
    code: generateGameKey(),
    owner_user_id: null,
    max_accounts: 5,
  };

  const { data, error } = await supabase.from("access_keys").insert(payload).select("*").single<AccessKey>();
  if (error || !data) throw new Error(error?.message || "Failed to create key");
  return data;
}
