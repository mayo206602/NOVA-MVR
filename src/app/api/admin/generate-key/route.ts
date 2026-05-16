import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAccessKey } from "@/lib/keys";

export async function POST() {
  try {
    await requireAdmin();
    const key = await createAccessKey();
    return NextResponse.json({ key });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
