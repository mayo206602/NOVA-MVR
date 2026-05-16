export type Scope = "system" | "work" | "family" | "both";

export interface AppUser {
  id: string;
  username: string;
  password_hash: string;
  full_name: string;
  is_admin: boolean;
  key_id: string | null;
  scope: Scope;
  role_label: string;
  family_calendar_enabled: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccessKey {
  id: string;
  code: string;
  owner_user_id: string | null;
  max_accounts: number;
  created_at: string;
}

export interface TaskRecord {
  id: string;
  key_id: string;
  scope: "work" | "family";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  status: "open" | "in_progress" | "done";
  due_at: string | null;
  creator_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface EventRecord {
  id: string;
  key_id: string;
  scope: "work" | "family";
  title: string;
  description: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  location: string;
  creator_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface NoteRecord {
  id: string;
  key_id: string;
  scope: "work" | "family";
  title: string;
  content: string;
  summary: string;
  creator_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageRecord {
  id: string;
  key_id: string;
  scope: "work" | "family";
  author_user_id: string;
  text: string;
  created_at: string;
}

export interface SessionRecord {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
}

export interface WorkspaceBootstrap {
  viewer: ViewerPayload;
  key: AccessKey | null;
  users: AppUser[];
  keys: AccessKey[];
  tasks: TaskRecord[];
  events: EventRecord[];
  notes: NoteRecord[];
  chatMessages: ChatMessageRecord[];
}

export interface ViewerPayload {
  id: string;
  username: string;
  fullName: string;
  isAdmin: boolean;
  keyId: string | null;
  scope: Scope;
  roleLabel: string;
  familyCalendarEnabled: boolean;
}
