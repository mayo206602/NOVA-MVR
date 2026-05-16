import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as { scope?: "work" | "family"; text?: string };

    const payload = {
      id: randomUUID(),
      key_id: user.key_id,
      scope: body.scope || "work",
      text: String(body.text || "").trim(),
      author_user_id: user.id,
    };

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("chat_messages").insert(payload);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
