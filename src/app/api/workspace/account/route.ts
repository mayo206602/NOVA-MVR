import { NextResponse } from "next/server";
import { requireUser, hashPassword } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as {
      username?: string;
      fullName?: string;
      password?: string;
    };

    const patch: Record<string, unknown> = {
      username: String(body.username || "").trim(),
      full_name: String(body.fullName || "").trim(),
      updated_at: new Date().toISOString(),
    };

    if (body.password) {
      patch.password_hash = await hashPassword(String(body.password));
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("app_users").update(patch).eq("id", user.id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
