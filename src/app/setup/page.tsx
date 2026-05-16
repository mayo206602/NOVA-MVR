import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hashPassword } from "@/lib/auth";

async function createAdmin(formData: FormData) {
  "use server";

  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const fullName = String(formData.get("fullName") || "").trim();
  const supabase = getSupabaseAdmin();

  const { count } = await supabase
    .from("app_users")
    .select("id", { count: "exact", head: true })
    .eq("is_admin", true);

  if ((count ?? 0) > 0) {
    redirect("/");
  }

  const passwordHash = await hashPassword(password);

  const { error } = await supabase.from("app_users").insert({
    id: randomUUID(),
    username,
    password_hash: passwordHash,
    full_name: fullName,
    is_admin: true,
    key_id: null,
    scope: "system",
    role_label: "Администратор",
    family_calendar_enabled: false,
    active: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect("/");
}

export default async function SetupPage() {
  const supabase = getSupabaseAdmin();
  const { count } = await supabase
    .from("app_users")
    .select("id", { count: "exact", head: true })
    .eq("is_admin", true);

  if ((count ?? 0) > 0) redirect("/");

  return (
    <main className="page-shell">
      <div className="auth-wrap">
        <article className="card auth-card">
          <p className="eyebrow">Initial Setup</p>
          <h1>Создание первого администратора</h1>
          <p className="muted">
            Эта страница доступна только пока в базе нет ни одного админского аккаунта.
          </p>
          <form action={createAdmin} className="form-pane stack">
            <label>
              <span>Имя</span>
              <input name="fullName" required />
            </label>
            <label>
              <span>Логин</span>
              <input name="username" required />
            </label>
            <label>
              <span>Пароль</span>
              <input name="password" type="password" required />
            </label>
            <button className="primary" type="submit">
              Создать администратора
            </button>
          </form>
        </article>
      </div>
    </main>
  );
}
