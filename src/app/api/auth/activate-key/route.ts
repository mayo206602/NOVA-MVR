import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { AccessKey } from "@/lib/domain";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      keyCode?: string;
      fullName?: string;
      username?: string;
      password?: string;
    };

    const code = String(body.keyCode || "").trim().toUpperCase();
    const fullName = String(body.fullName || "").trim();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const supabase = getSupabaseAdmin();

    const { data: key, error: keyError } = await supabase
      .from("access_keys")
      .select("*")
      .eq("code", code)
      .single<AccessKey>();

    if (keyError || !key) {
      return NextResponse.json({ error: "Ключ не найден" }, { status: 404 });
    }

    const { count: keyUsersCount } = await supabase
      .from("app_users")
      .select("id", { count: "exact", head: true })
      .eq("key_id", key.id);

    if ((keyUsersCount ?? 0) > 0 || key.owner_user_id) {
      return NextResponse.json(
        { error: "Этот ключ уже активирован. Остальные аккаунты создаются владельцем внутри системы" },
        { status: 409 }
      );
    }

    const { count: existingUsernameCount } = await supabase
      .from("app_users")
      .select("id", { count: "exact", head: true })
      .eq("username", username);

    if ((existingUsernameCount ?? 0) > 0) {
      return NextResponse.json({ error: "Такой логин уже используется" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const { error } = await supabase.from("app_users").insert({
      id: randomUUID(),
      username,
      password_hash: passwordHash,
      full_name: fullName,
      is_admin: false,
      key_id: key.id,
      scope: "both",
      role_label: "Кандидат владельца",
      family_calendar_enabled: true,
      active: true,
    });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Activation failed" },
      { status: 500 }
    );
  }
}
