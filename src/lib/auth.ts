import { cookies } from "next/headers";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { env } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { AppUser, SessionRecord } from "@/lib/domain";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function hashPassword(password: string) {
  return hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from("app_sessions").insert({
    id: randomUUID(),
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (error) throw new Error(error.message);

  const cookieStore = await cookies();
  cookieStore.set(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(expiresAt),
    path: "/",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.SESSION_COOKIE_NAME)?.value;
  if (token) {
    const supabase = getSupabaseAdmin();
    await supabase.from("app_sessions").delete().eq("token_hash", sha256(token));
  }
  cookieStore.delete(env.SESSION_COOKIE_NAME);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  const tokenHash = sha256(token);
  const supabase = getSupabaseAdmin();

  const { data: session, error: sessionError } = await supabase
    .from("app_sessions")
    .select("*")
    .eq("token_hash", tokenHash)
    .single<SessionRecord>();

  if (sessionError || !session) return null;

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await supabase.from("app_sessions").delete().eq("id", session.id);
    cookieStore.delete(env.SESSION_COOKIE_NAME);
    return null;
  }

  const { data: user, error: userError } = await supabase
    .from("app_users")
    .select("*")
    .eq("id", session.user_id)
    .single<AppUser>();

  if (userError || !user || !user.active) {
    cookieStore.delete(env.SESSION_COOKIE_NAME);
    return null;
  }

  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.is_admin) throw new Error("FORBIDDEN");
  return user;
}
