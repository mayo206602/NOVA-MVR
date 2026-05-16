import type { AccessKey, AppUser, ChatMessageRecord, EventRecord, NoteRecord, TaskRecord, ViewerPayload, WorkspaceBootstrap } from "@/lib/domain";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function toViewer(user: AppUser): ViewerPayload {
  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    isAdmin: user.is_admin,
    keyId: user.key_id,
    scope: user.scope,
    roleLabel: user.role_label,
    familyCalendarEnabled: user.family_calendar_enabled,
  };
}

export async function buildBootstrap(user: AppUser): Promise<WorkspaceBootstrap> {
  const supabase = getSupabaseAdmin();

  if (user.is_admin) {
    const [{ data: users }, { data: keys }] = await Promise.all([
      supabase.from("app_users").select("*").order("created_at", { ascending: true }),
      supabase.from("access_keys").select("*").order("created_at", { ascending: false }),
    ]);

    return {
      viewer: toViewer(user),
      key: null,
      users: (users ?? []) as AppUser[],
      keys: (keys ?? []) as AccessKey[],
      tasks: [],
      events: [],
      notes: [],
      chatMessages: [],
    };
  }

  const keyId = user.key_id;
  if (!keyId) {
    return {
      viewer: toViewer(user),
      key: null,
      users: [],
      keys: [],
      tasks: [],
      events: [],
      notes: [],
      chatMessages: [],
    };
  }

  const [
    { data: key },
    { data: users },
    { data: tasks },
    { data: events },
    { data: notes },
    { data: chatMessages },
  ] = await Promise.all([
    supabase.from("access_keys").select("*").eq("id", keyId).single<AccessKey>(),
    supabase.from("app_users").select("*").eq("key_id", keyId).order("created_at", { ascending: true }),
    supabase.from("tasks").select("*").eq("key_id", keyId).order("created_at", { ascending: false }),
    supabase.from("events").select("*").eq("key_id", keyId).order("date", { ascending: true }),
    supabase.from("notes").select("*").eq("key_id", keyId).order("updated_at", { ascending: false }),
    supabase.from("chat_messages").select("*").eq("key_id", keyId).order("created_at", { ascending: true }),
  ]);

  return {
    viewer: toViewer(user),
    key: (key ?? null) as AccessKey | null,
    users: (users ?? []) as AppUser[],
    keys: [],
    tasks: (tasks ?? []) as TaskRecord[],
    events: (events ?? []) as EventRecord[],
    notes: (notes ?? []) as NoteRecord[],
    chatMessages: (chatMessages ?? []) as ChatMessageRecord[],
  };
}
