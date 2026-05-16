import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json()) as { keyId?: string; userId?: string };
    const keyId = String(body.keyId || "");
    const userId = String(body.userId || "");
    const supabase = getSupabaseAdmin();

    const { error: keyError } = await supabase.from("access_keys").update({ owner_user_id: userId }).eq("id", keyId);
    if (keyError) throw new Error(keyError.message);

    const { error: userError } = await supabase
      .from("app_users")
      .update({
        scope: "both",
        role_label: "Владелец ключа",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (userError) throw new Error(userError.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
