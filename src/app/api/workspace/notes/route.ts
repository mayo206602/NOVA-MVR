import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function summarize(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= 180) return clean;
  return `${clean.slice(0, 177)}...`;
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as {
      id?: string;
      scope?: "work" | "family";
      title?: string;
      content?: string;
    };

    const content = String(body.content || "").trim();
    const payload = {
      id: body.id || randomUUID(),
      key_id: user.key_id,
      scope: body.scope || "work",
      title: String(body.title || "").trim(),
      content,
      summary: summarize(content),
      creator_user_id: user.id,
      updated_at: new Date().toISOString(),
    };

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("notes").upsert(payload);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const id = new URL(request.url).searchParams.get("id");
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("notes").delete().eq("id", id).eq("key_id", user.key_id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
