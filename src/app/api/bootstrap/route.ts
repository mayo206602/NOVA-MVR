import { NextResponse } from "next/server";
import { buildBootstrap } from "@/lib/bootstrap";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const bootstrap = await buildBootstrap(user);
  return NextResponse.json(bootstrap);
}
