import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as {
      id?: string;
      scope?: "work" | "family";
      title?: string;
      description?: string;
      date?: string;
      startTime?: string | null;
      endTime?: string | null;
      location?: string;
    };

    const payload = {
      id: body.id || randomUUID(),
      key_id: user.key_id,
      scope: body.scope || "work",
      title: String(body.title || "").trim(),
      description: String(body.description || "").trim(),
      date: String(body.date || ""),
      start_time: body.startTime || null,
      end_time: body.endTime || null,
      location: String(body.location || "").trim(),
      creator_user_id: user.id,
      updated_at: new Date().toISOString(),
    };

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("events").upsert(payload);
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
    const { error } = await supabase.from("events").delete().eq("id", id).eq("key_id", user.key_id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
