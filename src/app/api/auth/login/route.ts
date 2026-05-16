import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { AppUser } from "@/lib/domain";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const supabase = getSupabaseAdmin();

    const { data: user, error } = await supabase
      .from("app_users")
      .select("*")
      .eq("username", username)
      .single<AppUser>();

    if (error || !user || !user.active) {
      return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
    }

    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Login failed" }, { status: 500 });
  }
}
