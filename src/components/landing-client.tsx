"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/api";

type AuthMode = "none" | "login" | "key";

export function LandingClient() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("none");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(url: string, data: Record<string, FormDataEntryValue>) {
    setLoading(true);
    setError(null);
    try {
      await postJson(url, data);
      router.push("/workspace");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <article className="card auth-card">
        <p className="eyebrow">NOVA MVR</p>
        <h1>Рабочий full-stack контур для ключей и аккаунтов</h1>
        <p className="muted">
          На стартовой странице остаются только вход и ввод ключа. Первый админ создаётся отдельно на странице
          ` /setup ` один раз после развёртывания.
        </p>

        <div className="row" style={{ marginTop: 24 }}>
          <button className="primary" type="button" onClick={() => setMode(mode === "login" ? "none" : "login")}>
            Вход
          </button>
          <button className="secondary" type="button" onClick={() => setMode(mode === "key" ? "none" : "key")}>
            Ввести ключ
          </button>
        </div>

        {mode === "login" ? (
          <form
            className="form-pane stack"
            onSubmit={(event) => {
              event.preventDefault();
              submit("/api/auth/login", Object.fromEntries(new FormData(event.currentTarget)));
            }}
          >
            <label>
              <span>Логин</span>
              <input name="username" required />
            </label>
            <label>
              <span>Пароль</span>
              <input name="password" type="password" required />
            </label>
            <button className="primary" disabled={loading} type="submit">
              {loading ? "Входим..." : "Войти"}
            </button>
          </form>
        ) : null}

        {mode === "key" ? (
          <form
            className="form-pane stack"
            onSubmit={(event) => {
              event.preventDefault();
              submit("/api/auth/activate-key", Object.fromEntries(new FormData(event.currentTarget)));
            }}
          >
            <label>
              <span>Ключ</span>
              <input name="keyCode" placeholder="AB12C-DE34F-GH56J-KL78M" required />
            </label>
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
            <button className="primary" disabled={loading} type="submit">
              {loading ? "Создаём..." : "Активировать ключ"}
            </button>
          </form>
        ) : null}

        {error ? <p className="form-note">{error}</p> : null}
      </article>
    </div>
  );
}
