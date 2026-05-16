import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hashPassword } from "@/lib/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = (await request.json()) as {
      username?: string;
      fullName?: string;
      password?: string;
      scope?: string;
      roleLabel?: string;
      familyCalendarEnabled?: boolean;
      active?: boolean;
    };

    const supabase = getSupabaseAdmin();
    const patch: Record<string, unknown> = {
      username: String(body.username || "").trim(),
      full_name: String(body.fullName || "").trim(),
      scope: String(body.scope || "work"),
      role_label: String(body.roleLabel || "").trim(),
      family_calendar_enabled: Boolean(body.familyCalendarEnabled),
      active: Boolean(body.active),
      updated_at: new Date().toISOString(),
    };

    if (body.password) {
      patch.password_hash = await hashPassword(String(body.password));
    }

    const { error } = await supabase.from("app_users").update(patch).eq("id", id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
