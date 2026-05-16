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
      priority?: "high" | "medium" | "low";
      status?: "open" | "in_progress" | "done";
      dueAt?: string | null;
    };

    const payload = {
      id: body.id || randomUUID(),
      key_id: user.key_id,
      scope: body.scope || "work",
      title: String(body.title || "").trim(),
      description: String(body.description || "").trim(),
      priority: body.priority || "high",
      status: body.status || "open",
      due_at: body.dueAt || null,
      creator_user_id: user.id,
      updated_at: new Date().toISOString(),
    };

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("tasks").upsert(payload);
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
    const { error } = await supabase.from("tasks").delete().eq("id", id).eq("key_id", user.key_id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
