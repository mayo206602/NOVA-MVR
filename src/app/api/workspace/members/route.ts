import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { hashPassword, requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { AccessKey } from "@/lib/domain";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (user.is_admin || !user.key_id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const supabase = getSupabaseAdmin();
    const { data: key } = await supabase.from("access_keys").select("*").eq("id", user.key_id).single<AccessKey>();
    if (!key || key.owner_user_id !== user.id) {
      return NextResponse.json({ error: "Только владелец ключа может создавать аккаунты" }, { status: 403 });
    }

    const body = (await request.json()) as {
      fullName?: string;
      username?: string;
      password?: string;
      scope?: "work" | "family";
      roleLabel?: string;
      familyCalendarEnabled?: boolean;
    };

    const { count } = await supabase
      .from("app_users")
      .select("id", { count: "exact", head: true })
      .eq("key_id", key.id);

    if ((count ?? 0) >= key.max_accounts) {
      return NextResponse.json({ error: "По ключу уже достигнут лимит в 5 аккаунтов" }, { status: 409 });
    }

    const username = String(body.username || "").trim();
    const { count: existingCount } = await supabase
      .from("app_users")
      .select("id", { count: "exact", head: true })
      .eq("username", username);

    if ((existingCount ?? 0) > 0) {
      return NextResponse.json({ error: "Такой логин уже используется" }, { status: 409 });
    }

    const passwordHash = await hashPassword(String(body.password || ""));
    const scope = body.scope === "family" ? "family" : "work";

    const { error } = await supabase.from("app_users").insert({
      id: randomUUID(),
      username,
      password_hash: passwordHash,
      full_name: String(body.fullName || "").trim(),
      is_admin: false,
      key_id: key.id,
      scope,
      role_label: String(body.roleLabel || "").trim(),
      family_calendar_enabled: scope === "family" ? Boolean(body.familyCalendarEnabled) : false,
      active: true,
    });

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
