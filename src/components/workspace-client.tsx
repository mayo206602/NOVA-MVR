"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteRequest, patchJson, postJson } from "@/lib/api";
import type {
  AccessKey,
  AppUser,
  ChatMessageRecord,
  EventRecord,
  NoteRecord,
  Scope,
  TaskRecord,
  WorkspaceBootstrap,
} from "@/lib/domain";

type AppView = "home" | "tasks" | "calendar" | "notes" | "chats" | "people" | "settings" | "admin";
type ActiveScope = "work" | "family";

const MONTH_FORMATTER = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" });
const DAY_FORMATTER = new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" });
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const DATE_FORMATTER = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" });

export function WorkspaceClient({ bootstrap }: { bootstrap: WorkspaceBootstrap }) {
  const router = useRouter();
  const viewer = bootstrap.viewer;
  const [view, setView] = useState<AppView>(viewer.isAdmin ? "home" : "home");
  const [scope, setScope] = useState<ActiveScope>(viewer.scope === "family" ? "family" : "work");
  const [month, setMonth] = useState<string>(toMonthValue(new Date()));
  const [selectedDate, setSelectedDate] = useState<string>(toDateInputValue(new Date()));
  const [taskSearch, setTaskSearch] = useState("");
  const [noteSearch, setNoteSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adminEditingUserId, setAdminEditingUserId] = useState<string | null>(null);
  const [selectedOwners, setSelectedOwners] = useState<Record<string, string>>({});

  const accessibleScopes = viewer.isAdmin ? [] : viewer.scope === "both" ? (["work", "family"] as const) : ([viewer.scope] as const);
  const usersById = useMemo(() => Object.fromEntries(bootstrap.users.map((user) => [user.id, user])), [bootstrap.users]);
  const currentKey = bootstrap.key;
  const isKeyOwner = Boolean(currentKey && currentKey.owner_user_id === viewer.id);
  const taskItems = bootstrap.tasks.filter((task) => task.scope === scope && matchesSearch(`${task.title} ${task.description}`, taskSearch));
  const noteItems = bootstrap.notes.filter((note) => note.scope === scope && matchesSearch(`${note.title} ${note.content}`, noteSearch));
  const eventItems = bootstrap.events.filter((event) => event.scope === scope);
  const chatItems = bootstrap.chatMessages.filter((message) => message.scope === scope);
  const keyUsers = currentKey ? bootstrap.users.filter((user) => user.key_id === currentKey.id) : [];
  const adminEditingUser = bootstrap.users.find((user) => user.id === adminEditingUserId) || null;
  const familyCalendarBlocked = scope === "family" && viewer.scope === "family" && !viewer.familyCalendarEnabled && !isKeyOwner;

  async function runMutation(work: () => Promise<unknown>, successMessage: string, options?: { redirectTo?: string }) {
    setBusy(true);
    setToast(null);
    try {
      await work();
      setToast(successMessage);
      if (options?.redirectTo) {
        router.push(options.redirectTo);
      }
      router.refresh();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  function navigationItems(): Array<[AppView, string]> {
    if (viewer.isAdmin) {
      return [
        ["home", "Home"],
        ["admin", "Admin"],
        ["settings", "Setup"],
      ];
    }
    return [
      ["home", "Home"],
      ["tasks", "Tasks"],
      ["calendar", "Plan"],
      ["notes", "Notes"],
      ["chats", "Chats"],
      ["people", "People"],
      ["settings", "Setup"],
    ];
  }

  return (
    <>
      {toast ? <div className="toast">{toast}</div> : null}
      <header className="topbar">
        <div className="stack">
          <div>
            <p className="eyebrow">NOVA MVR</p>
            <h2>{viewer.isAdmin ? "Админский контур" : "Рабочее пространство"}</h2>
          </div>
          <p className="muted">
            {viewer.isAdmin
              ? "Генерация ключей, назначение владельцев и редактирование других пользователей."
              : `${viewer.fullName} · ${viewer.roleLabel}${currentKey ? ` · ключ ${currentKey.code}` : ""}`}
          </p>
        </div>

        {!viewer.isAdmin ? (
          <div className="scope-switch">
            {accessibleScopes.map((entry) => (
              <button
                key={entry}
                className={`scope-btn ${scope === entry ? "active" : ""}`}
                type="button"
                onClick={() => setScope(entry)}
              >
                {entry === "work" ? "Work Space" : "Family Space"}
              </button>
            ))}
          </div>
        ) : null}

        <div className="topbar-actions">
          <span className="badge">{viewer.isAdmin ? "ADMIN" : isKeyOwner ? "KEY OWNER" : viewer.scope.toUpperCase()}</span>
          <button
            className="secondary"
            disabled={busy}
            type="button"
            onClick={() =>
              runMutation(() => postJson("/api/auth/logout", {}), "Вы вышли из системы", {
                redirectTo: "/",
              })
            }
          >
            Выйти
          </button>
        </div>
      </header>

      <div className="app-layout">
        <aside className="sidebar stack-lg">
          <div>
            <p className="eyebrow">Навигация</p>
            <nav className="sidebar-nav">
              {navigationItems().map(([id, label]) => (
                <button key={id} className={`nav-btn ${view === id ? "active" : ""}`} type="button" onClick={() => setView(id)}>
                  {label}
                </button>
              ))}
            </nav>
          </div>
          <div className="hero stack">
            <p className="eyebrow">Session</p>
            <strong>{viewer.fullName}</strong>
            <p className="muted">{viewer.isAdmin ? "System administrator" : viewer.roleLabel}</p>
            {currentKey ? (
              <>
                <span className="pill">{currentKey.code}</span>
                <p className="muted">
                  {keyUsers.length}/{currentKey.max_accounts} аккаунтов по ключу
                </p>
              </>
            ) : null}
          </div>
        </aside>

        <section className="stack-lg">
          {view === "home" ? (
            viewer.isAdmin ? (
              <AdminHome keys={bootstrap.keys} users={bootstrap.users} />
            ) : (
              <UserHome
                keyUsers={keyUsers}
                currentKey={currentKey}
                events={eventItems}
                notes={noteItems}
                messages={chatItems}
                tasks={taskItems}
                usersById={usersById}
              />
            )
          ) : null}

          {view === "tasks" && !viewer.isAdmin ? (
            <TasksView
              busy={busy}
              items={taskItems}
              scope={scope}
              usersById={usersById}
              onDelete={(id) => runMutation(() => deleteRequest(`/api/workspace/tasks?id=${id}`), "Задача удалена")}
              onSave={(payload) => runMutation(() => postJson("/api/workspace/tasks", payload), "Задача сохранена")}
              onAdvance={(task) =>
                runMutation(
                  () =>
                    postJson("/api/workspace/tasks", {
                      id: task.id,
                      scope: task.scope,
                      title: task.title,
                      description: task.description,
                      priority: task.priority,
                      status: nextTaskStatus(task.status),
                      dueAt: task.due_at,
                    }),
                  "Статус обновлён"
                )
              }
              search={taskSearch}
              setSearch={setTaskSearch}
            />
          ) : null}

          {view === "calendar" && !viewer.isAdmin ? (
            <CalendarView
              busy={busy}
              blocked={familyCalendarBlocked}
              events={eventItems}
              month={month}
              scope={scope}
              selectedDate={selectedDate}
              setMonth={setMonth}
              setSelectedDate={setSelectedDate}
              onDelete={(id) => runMutation(() => deleteRequest(`/api/workspace/events?id=${id}`), "Событие удалено")}
              onSave={(payload) => runMutation(() => postJson("/api/workspace/events", payload), "Событие сохранено")}
            />
          ) : null}

          {view === "notes" && !viewer.isAdmin ? (
            <NotesView
              busy={busy}
              items={noteItems}
              noteSearch={noteSearch}
              scope={scope}
              setNoteSearch={setNoteSearch}
              usersById={usersById}
              onDelete={(id) => runMutation(() => deleteRequest(`/api/workspace/notes?id=${id}`), "Заметка удалена")}
              onSave={(payload) => runMutation(() => postJson("/api/workspace/notes", payload), "Заметка сохранена")}
            />
          ) : null}

          {view === "chats" && !viewer.isAdmin ? (
            <ChatsView
              busy={busy}
              items={chatItems}
              scope={scope}
              usersById={usersById}
              onSave={(payload) => runMutation(() => postJson("/api/workspace/chats", payload), "Сообщение отправлено")}
            />
          ) : null}

          {view === "people" && !viewer.isAdmin ? (
            <PeopleView
              busy={busy}
              canInvite={isKeyOwner}
              currentKey={currentKey}
              keyUsers={keyUsers}
              onInvite={(payload) => runMutation(() => postJson("/api/workspace/members", payload), "Аккаунт участника создан")}
            />
          ) : null}

          {view === "settings" ? (
            <SettingsView
              busy={busy}
              viewer={viewer}
              onSave={(payload) => runMutation(() => patchJson("/api/workspace/account", payload), "Профиль обновлён")}
            />
          ) : null}

          {view === "admin" && viewer.isAdmin ? (
            <AdminView
              adminEditingUser={adminEditingUser}
              busy={busy}
              keys={bootstrap.keys}
              selectedOwners={selectedOwners}
              setAdminEditingUserId={setAdminEditingUserId}
              setSelectedOwners={setSelectedOwners}
              users={bootstrap.users}
              onAssignOwner={(payload) => runMutation(() => postJson("/api/admin/assign-owner", payload), "Главный аккаунт назначен")}
              onGenerateKey={() => runMutation(() => postJson("/api/admin/generate-key", {}), "Новый ключ выпущен")}
              onSaveUser={(id, payload) => runMutation(() => patchJson(`/api/admin/users/${id}`, payload), "Данные пользователя обновлены")}
            />
          ) : null}
        </section>
      </div>

      <nav className="mobile-nav">
        {navigationItems().map(([id, label]) => (
          <button key={id} className={`nav-btn ${view === id ? "active" : ""}`} type="button" onClick={() => setView(id)}>
            {label}
          </button>
        ))}
      </nav>
    </>
  );
}

function AdminHome({ keys, users }: { keys: AccessKey[]; users: AppUser[] }) {
  return (
    <div className="stack-lg">
      <section className="hero stack">
        <p className="eyebrow">Admin Console</p>
        <h3>Полноценное управление ключами и пользователями</h3>
        <p className="muted">Администратор создаёт ключи, назначает владельцев и корректирует аккаунты без демо-заглушек.</p>
        <div className="chips">
          <span className="pill">{keys.length} keys</span>
          <span className="pill">{users.filter((user) => !user.is_admin).length} users</span>
          <span className="pill">{keys.filter((key) => !key.owner_user_id).length} pending owners</span>
        </div>
      </section>
      <section className="stats-grid">
        <Stat title="Ключи" value={keys.length} note="Всего выпущено" />
        <Stat title="Аккаунты" value={users.filter((user) => !user.is_admin).length} note="Неадминские пользователи" />
        <Stat title="Owners" value={keys.filter((key) => key.owner_user_id).length} note="Назначено владельцев" />
        <Stat title="Pending" value={keys.filter((key) => !key.owner_user_id).length} note="Ключи без owner" />
      </section>
    </div>
  );
}

function UserHome({
  currentKey,
  events,
  keyUsers,
  messages,
  notes,
  tasks,
  usersById,
}: {
  currentKey: AccessKey | null;
  keyUsers: AppUser[];
  tasks: TaskRecord[];
  events: EventRecord[];
  notes: NoteRecord[];
  messages: ChatMessageRecord[];
  usersById: Record<string, AppUser>;
}) {
  return (
    <div className="stack-lg">
      <section className="hero stack">
        <p className="eyebrow">Workspace</p>
        <h3>Рабочий контур по ключу</h3>
        <p className="muted">
          Отдельные потоки для `work` и `family`, отдельные заметки, отдельные чаты, раздельные задачи и календарь.
        </p>
        {currentKey ? (
          <div className="chips">
            <span className="pill">{currentKey.code}</span>
            <span className="pill">
              {keyUsers.length}/{currentKey.max_accounts} аккаунтов
            </span>
          </div>
        ) : null}
      </section>

      <section className="stats-grid">
        <Stat title="Tasks" value={tasks.filter((task) => task.status !== "done").length} note="Активных задач" />
        <Stat title="Events" value={events.length} note="Событий в контуре" />
        <Stat title="Notes" value={notes.length} note="Заметок в группе" />
        <Stat title="Chat" value={messages.length} note="Сообщений в чате" />
      </section>

      <section className="grid-2">
        <Panel title="Ближайшие события" eyebrow="Agenda">
          {events.slice(0, 4).map((event) => (
            <EventItem key={event.id} event={event} />
          ))}
          {events.length === 0 ? <p className="empty">Событий пока нет.</p> : null}
        </Panel>
        <Panel title="Последние заметки" eyebrow="Knowledge">
          {notes.slice(0, 3).map((note) => (
            <NoteItem key={note.id} note={note} usersById={usersById} />
          ))}
          {notes.length === 0 ? <p className="empty">Заметок пока нет.</p> : null}
        </Panel>
      </section>

      <section className="grid-2">
        <Panel title="Люди по ключу" eyebrow="Members">
          {keyUsers.map((user) => (
            <UserItem key={user.id} user={user} />
          ))}
        </Panel>
        <Panel title="Последние сообщения" eyebrow="Chat">
          {messages.slice(-4).reverse().map((message) => (
            <ChatItem key={message.id} message={message} currentUserId="" usersById={usersById} />
          ))}
          {messages.length === 0 ? <p className="empty">Чат пока пуст.</p> : null}
        </Panel>
      </section>
    </div>
  );
}

function TasksView({
  busy,
  items,
  onAdvance,
  onDelete,
  onSave,
  scope,
  search,
  setSearch,
}: {
  busy: boolean;
  items: TaskRecord[];
  scope: ActiveScope;
  search: string;
  setSearch: (value: string) => void;
  usersById: Record<string, AppUser>;
  onSave: (payload: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  onAdvance: (task: TaskRecord) => void;
}) {
  const [editing, setEditing] = useState<TaskRecord | null>(null);

  return (
    <div className="stack-lg">
      <div className="toolbar">
        <div>
          <p className="eyebrow">Tasks</p>
          <h3>Задачи контура {scope}</h3>
        </div>
        <input placeholder="Поиск задач" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>
      <section className="feature-grid">
        <Panel title={editing ? "Редактировать задачу" : "Новая задача"} eyebrow="Task Form">
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              onSave({
                id: editing?.id,
                scope,
                title: formData.get("title"),
                description: formData.get("description"),
                priority: formData.get("priority"),
                status: formData.get("status"),
                dueAt: formData.get("dueAt") || null,
              });
              setEditing(null);
              event.currentTarget.reset();
            }}
          >
            <label>
              <span>Название</span>
              <input defaultValue={editing?.title || ""} name="title" required />
            </label>
            <label>
              <span>Описание</span>
              <textarea defaultValue={editing?.description || ""} name="description" rows={4} />
            </label>
            <div className="grid-2">
              <label>
                <span>Приоритет</span>
                <select defaultValue={editing?.priority || "high"} name="priority">
                  <option value="high">high</option>
                  <option value="medium">medium</option>
                  <option value="low">low</option>
                </select>
              </label>
              <label>
                <span>Статус</span>
                <select defaultValue={editing?.status || "open"} name="status">
                  <option value="open">open</option>
                  <option value="in_progress">in_progress</option>
                  <option value="done">done</option>
                </select>
              </label>
            </div>
            <label>
              <span>Срок</span>
              <input defaultValue={editing?.due_at || ""} name="dueAt" type="datetime-local" />
            </label>
            <div className="form-actions">
              <button className="primary" disabled={busy} type="submit">
                Сохранить
              </button>
              <button
                className="secondary"
                type="button"
                onClick={() => {
                  setEditing(null);
                }}
              >
                Сбросить
              </button>
            </div>
          </form>
        </Panel>

        <Panel title="Канбан" eyebrow="Board">
          <div className="kanban">
            {(["open", "in_progress", "done"] as const).map((status) => (
              <div className="stack" key={status}>
                <div className="item">
                  <strong>{status}</strong>
                  <span className="muted">{items.filter((task) => task.status === status).length}</span>
                </div>
                {items
                  .filter((task) => task.status === status)
                  .map((task) => (
                    <div className="item" key={task.id}>
                      <div className="item-head">
                        <div className="stack">
                          <strong>{task.title}</strong>
                          <div className="meta">
                            <span className="pill">{task.priority}</span>
                            <span className="pill">{task.due_at ? DATE_TIME_FORMATTER.format(new Date(task.due_at)) : "Без срока"}</span>
                          </div>
                        </div>
                      </div>
                      <p className="muted">{task.description || "Без описания"}</p>
                      <div className="form-actions">
                        <button className="secondary" type="button" onClick={() => setEditing(task)}>
                          Редактировать
                        </button>
                        <button className="secondary" type="button" onClick={() => onAdvance(task)}>
                          Сдвинуть статус
                        </button>
                        <button className="secondary" type="button" onClick={() => onDelete(task.id)}>
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function CalendarView({
  blocked,
  busy,
  events,
  month,
  onDelete,
  onSave,
  scope,
  selectedDate,
  setMonth,
  setSelectedDate,
}: {
  blocked: boolean;
  busy: boolean;
  events: EventRecord[];
  month: string;
  scope: ActiveScope;
  selectedDate: string;
  setMonth: (value: string) => void;
  setSelectedDate: (value: string) => void;
  onSave: (payload: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState<EventRecord | null>(null);
  const selectedDayEvents = events.filter((event) => event.date === selectedDate);

  return (
    <div className="stack-lg">
      <div className="toolbar">
        <div>
          <p className="eyebrow">Calendar</p>
          <h3>Календарь контура {scope}</h3>
        </div>
      </div>
      {blocked ? (
        <Panel title="Семейный календарь отключён" eyebrow="Access">
          <p className="empty">
            Этот семейный аккаунт был приглашён без участия в общем семейном календаре. Владелец или админ должен включить этот флаг.
          </p>
        </Panel>
      ) : (
        <section className="feature-grid">
          <Panel title="Сетка месяца" eyebrow="Month">
            <div className="toolbar">
              <button className="secondary" type="button" onClick={() => setMonth(shiftMonth(month, -1))}>
                Предыдущий
              </button>
              <span className="pill">{capitalize(MONTH_FORMATTER.format(parseMonth(month)))}</span>
              <button className="secondary" type="button" onClick={() => setMonth(shiftMonth(month, 1))}>
                Следующий
              </button>
            </div>
            <CalendarGrid events={events} month={month} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
          </Panel>
          <div className="stack-lg">
            <Panel title={capitalize(DAY_FORMATTER.format(parseDate(selectedDate)))} eyebrow="Selected Day">
              {selectedDayEvents.map((event) => (
                <div className="item" key={event.id}>
                  <div className="item-head">
                    <div className="stack">
                      <strong>{event.title}</strong>
                      <div className="meta">
                        <span className="pill">
                          {[event.start_time, event.end_time].filter(Boolean).join(" - ") || "Весь день"}
                        </span>
                        <span className="pill">{event.location || "Без локации"}</span>
                      </div>
                    </div>
                  </div>
                  <p className="muted">{event.description || "Без описания"}</p>
                  <div className="form-actions">
                    <button className="secondary" type="button" onClick={() => setEditing(event)}>
                      Редактировать
                    </button>
                    <button className="secondary" type="button" onClick={() => onDelete(event.id)}>
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
              {selectedDayEvents.length === 0 ? <p className="empty">На выбранный день событий нет.</p> : null}
            </Panel>
            <Panel title={editing ? "Редактировать событие" : "Новое событие"} eyebrow="Event Form">
              <form
                className="stack"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  onSave({
                    id: editing?.id,
                    scope,
                    title: formData.get("title"),
                    description: formData.get("description"),
                    date: formData.get("date"),
                    startTime: formData.get("startTime") || null,
                    endTime: formData.get("endTime") || null,
                    location: formData.get("location"),
                  });
                  setEditing(null);
                  event.currentTarget.reset();
                }}
              >
                <label>
                  <span>Название</span>
                  <input defaultValue={editing?.title || ""} name="title" required />
                </label>
                <div className="grid-2">
                  <label>
                    <span>Дата</span>
                    <input defaultValue={editing?.date || selectedDate} name="date" type="date" required />
                  </label>
                  <label>
                    <span>Локация</span>
                    <input defaultValue={editing?.location || ""} name="location" />
                  </label>
                </div>
                <div className="grid-2">
                  <label>
                    <span>Начало</span>
                    <input defaultValue={editing?.start_time || ""} name="startTime" type="time" />
                  </label>
                  <label>
                    <span>Конец</span>
                    <input defaultValue={editing?.end_time || ""} name="endTime" type="time" />
                  </label>
                </div>
                <label>
                  <span>Описание</span>
                  <textarea defaultValue={editing?.description || ""} name="description" rows={4} />
                </label>
                <div className="form-actions">
                  <button className="primary" disabled={busy} type="submit">
                    Сохранить
                  </button>
                  <button className="secondary" type="button" onClick={() => setEditing(null)}>
                    Сбросить
                  </button>
                </div>
              </form>
            </Panel>
          </div>
        </section>
      )}
    </div>
  );
}

function NotesView({
  busy,
  items,
  noteSearch,
  onDelete,
  onSave,
  scope,
  setNoteSearch,
  usersById,
}: {
  busy: boolean;
  items: NoteRecord[];
  noteSearch: string;
  scope: ActiveScope;
  setNoteSearch: (value: string) => void;
  usersById: Record<string, AppUser>;
  onSave: (payload: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState<NoteRecord | null>(null);

  return (
    <div className="stack-lg">
      <div className="toolbar">
        <div>
          <p className="eyebrow">Notes</p>
          <h3>Заметки группы {scope}</h3>
        </div>
        <input placeholder="Поиск заметок" value={noteSearch} onChange={(event) => setNoteSearch(event.target.value)} />
      </div>
      <section className="feature-grid">
        <Panel title={editing ? "Редактировать заметку" : "Новая заметка"} eyebrow="Editor">
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              onSave({
                id: editing?.id,
                scope,
                title: formData.get("title"),
                content: formData.get("content"),
              });
              setEditing(null);
              event.currentTarget.reset();
            }}
          >
            <label>
              <span>Заголовок</span>
              <input defaultValue={editing?.title || ""} name="title" required />
            </label>
            <label>
              <span>Содержимое</span>
              <textarea defaultValue={editing?.content || ""} name="content" required rows={12} />
            </label>
            <div className="form-actions">
              <button className="primary" disabled={busy} type="submit">
                Сохранить
              </button>
              <button className="secondary" type="button" onClick={() => setEditing(null)}>
                Сбросить
              </button>
            </div>
          </form>
        </Panel>
        <Panel title="Лента заметок" eyebrow="Feed">
          {items.map((note) => (
            <div className="item" key={note.id}>
              <NoteItem note={note} usersById={usersById} />
              <div className="form-actions">
                <button className="secondary" type="button" onClick={() => setEditing(note)}>
                  Редактировать
                </button>
                <button className="secondary" type="button" onClick={() => onDelete(note.id)}>
                  Удалить
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 ? <p className="empty">Заметок пока нет.</p> : null}
        </Panel>
      </section>
    </div>
  );
}

function ChatsView({
  busy,
  items,
  onSave,
  scope,
  usersById,
}: {
  busy: boolean;
  items: ChatMessageRecord[];
  scope: ActiveScope;
  usersById: Record<string, AppUser>;
  onSave: (payload: Record<string, unknown>) => void;
}) {
  return (
    <div className="stack-lg">
      <div className="toolbar">
        <div>
          <p className="eyebrow">Chats</p>
          <h3>Отдельный чат {scope}</h3>
        </div>
      </div>
      <section className="grid-2">
        <Panel title="Сообщения" eyebrow="Thread">
          {items.map((message) => (
            <ChatItem key={message.id} currentUserId="" message={message} usersById={usersById} />
          ))}
          {items.length === 0 ? <p className="empty">Чат пока пуст.</p> : null}
        </Panel>
        <Panel title="Новое сообщение" eyebrow="Reply">
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              onSave({
                scope,
                text: formData.get("text"),
              });
              event.currentTarget.reset();
            }}
          >
            <label>
              <span>Текст</span>
              <textarea name="text" required rows={10} />
            </label>
            <button className="primary" disabled={busy} type="submit">
              Отправить
            </button>
          </form>
        </Panel>
      </section>
    </div>
  );
}

function PeopleView({
  busy,
  canInvite,
  currentKey,
  keyUsers,
  onInvite,
}: {
  busy: boolean;
  canInvite: boolean;
  currentKey: AccessKey | null;
  keyUsers: AppUser[];
  onInvite: (payload: Record<string, unknown>) => void;
}) {
  const [inviteScope, setInviteScope] = useState<"work" | "family">("work");
  const roleOptions = inviteScope === "family" ? ["Мать", "Отец", "Сын", "Дочь", "Супруг", "Супруга"] : ["Управляющий", "Менеджер", "Сотрудник"];

  return (
    <div className="stack-lg">
      <section className="grid-2">
        <Panel title="Ключ и лимиты" eyebrow="Capacity">
          {currentKey ? (
            <div className="stack">
              <span className="pill">{currentKey.code}</span>
              <p className="muted">
                {keyUsers.length}/{currentKey.max_accounts} аккаунтов по этому ключу
              </p>
            </div>
          ) : (
            <p className="empty">Ключ не привязан.</p>
          )}

          {canInvite ? (
            <form
              className="stack"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                onInvite({
                  fullName: formData.get("fullName"),
                  username: formData.get("username"),
                  password: formData.get("password"),
                  scope: formData.get("scope"),
                  roleLabel: formData.get("roleLabel"),
                  familyCalendarEnabled: formData.get("familyCalendarEnabled") === "true",
                });
                event.currentTarget.reset();
                setInviteScope("work");
              }}
            >
              <p className="form-note">
                Владелец ключа создаёт остальные аккаунты напрямую. Для семейного аккаунта отдельно задаётся участие в общем календаре.
              </p>
              <label>
                <span>Имя</span>
                <input name="fullName" required />
              </label>
              <div className="grid-2">
                <label>
                  <span>Логин</span>
                  <input name="username" required />
                </label>
                <label>
                  <span>Пароль</span>
                  <input name="password" required type="password" />
                </label>
              </div>
              <div className="grid-2">
                <label>
                  <span>Тип</span>
                  <select
                    name="scope"
                    value={inviteScope}
                    onChange={(event) => setInviteScope(event.target.value as "work" | "family")}
                  >
                    <option value="work">Рабочий</option>
                    <option value="family">Семья</option>
                  </select>
                </label>
                <label>
                  <span>Роль</span>
                  <select name="roleLabel">
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                <span>Семейный календарь</span>
                <select name="familyCalendarEnabled">
                  <option value="false">Отказать при приглашении</option>
                  <option value="true">Подключить к общему календарю</option>
                </select>
              </label>
              <button className="primary" disabled={busy} type="submit">
                Создать аккаунт
              </button>
            </form>
          ) : (
            <p className="empty">Только владелец ключа может создавать рабочие и семейные аккаунты.</p>
          )}
        </Panel>
        <Panel title="Аккаунты по ключу" eyebrow="Members">
          {keyUsers.map((user) => (
            <UserItem key={user.id} user={user} />
          ))}
        </Panel>
      </section>
    </div>
  );
}

function SettingsView({
  busy,
  onSave,
  viewer,
}: {
  busy: boolean;
  viewer: WorkspaceBootstrap["viewer"];
  onSave: (payload: Record<string, unknown>) => void;
}) {
  return (
    <Panel title="Настройки аккаунта" eyebrow="Profile">
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          onSave({
            fullName: formData.get("fullName"),
            username: formData.get("username"),
            password: formData.get("password"),
          });
        }}
      >
        <label>
          <span>Имя</span>
          <input defaultValue={viewer.fullName} name="fullName" required />
        </label>
        <label>
          <span>Логин</span>
          <input defaultValue={viewer.username} name="username" required />
        </label>
        <label>
          <span>Новый пароль</span>
          <input name="password" type="password" />
        </label>
        <button className="primary" disabled={busy} type="submit">
          Сохранить профиль
        </button>
      </form>
    </Panel>
  );
}

function AdminView({
  adminEditingUser,
  busy,
  keys,
  onAssignOwner,
  onGenerateKey,
  onSaveUser,
  selectedOwners,
  setAdminEditingUserId,
  setSelectedOwners,
  users,
}: {
  adminEditingUser: AppUser | null;
  busy: boolean;
  keys: AccessKey[];
  users: AppUser[];
  selectedOwners: Record<string, string>;
  setSelectedOwners: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setAdminEditingUserId: (value: string | null) => void;
  onGenerateKey: () => void;
  onAssignOwner: (payload: Record<string, unknown>) => void;
  onSaveUser: (id: string, payload: Record<string, unknown>) => void;
}) {
  return (
    <div className="stack-lg">
      <section className="grid-2">
        <Panel title="Выпустить ключ" eyebrow="Generate Key">
          <p className="form-note">Каждый ключ создаётся в стиле игровых ключей и рассчитан на 5 аккаунтов.</p>
          <button className="primary" disabled={busy} type="button" onClick={onGenerateKey}>
            Сгенерировать ключ
          </button>
        </Panel>
        <Panel title={adminEditingUser ? "Редактировать пользователя" : "Выберите пользователя"} eyebrow="Edit User">
          {adminEditingUser ? (
            <form
              className="stack"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                onSaveUser(adminEditingUser.id, {
                  fullName: formData.get("fullName"),
                  username: formData.get("username"),
                  password: formData.get("password") || undefined,
                  scope: formData.get("scope"),
                  roleLabel: formData.get("roleLabel"),
                  familyCalendarEnabled: formData.get("familyCalendarEnabled") === "true",
                  active: formData.get("active") === "true",
                });
                setAdminEditingUserId(null);
              }}
            >
              <label>
                <span>Имя</span>
                <input defaultValue={adminEditingUser.full_name} name="fullName" required />
              </label>
              <div className="grid-2">
                <label>
                  <span>Логин</span>
                  <input defaultValue={adminEditingUser.username} name="username" required />
                </label>
                <label>
                  <span>Новый пароль</span>
                  <input name="password" type="password" />
                </label>
              </div>
              <div className="grid-2">
                <label>
                  <span>Scope</span>
                  <select defaultValue={adminEditingUser.scope} name="scope">
                    <option value="system">system</option>
                    <option value="work">work</option>
                    <option value="family">family</option>
                    <option value="both">both</option>
                  </select>
                </label>
                <label>
                  <span>Роль</span>
                  <input defaultValue={adminEditingUser.role_label} name="roleLabel" />
                </label>
              </div>
              <div className="grid-2">
                <label>
                  <span>Семейный календарь</span>
                  <select defaultValue={String(adminEditingUser.family_calendar_enabled)} name="familyCalendarEnabled">
                    <option value="true">Подключён</option>
                    <option value="false">Отклонён</option>
                  </select>
                </label>
                <label>
                  <span>Статус</span>
                  <select defaultValue={String(adminEditingUser.active)} name="active">
                    <option value="true">Active</option>
                    <option value="false">Disabled</option>
                  </select>
                </label>
              </div>
              <div className="form-actions">
                <button className="primary" disabled={busy} type="submit">
                  Сохранить
                </button>
                <button className="secondary" type="button" onClick={() => setAdminEditingUserId(null)}>
                  Сбросить
                </button>
              </div>
            </form>
          ) : (
            <p className="empty">Нажмите на карточку пользователя ниже, чтобы редактировать его профиль.</p>
          )}
        </Panel>
      </section>

      <Panel title="Ключ → главный аккаунт" eyebrow="Registry">
        {keys.map((key) => {
          const members = users.filter((user) => user.key_id === key.id);
          return (
            <div className="item" key={key.id}>
              <div className="item-head">
                <div className="stack">
                  <strong>{key.code}</strong>
                  <div className="meta">
                    <span className="pill">
                      {members.length}/{key.max_accounts}
                    </span>
                    <span className="pill">{key.owner_user_id ? "owner assigned" : "owner pending"}</span>
                  </div>
                </div>
              </div>
              <p className="muted">Главный аккаунт: {members.find((user) => user.id === key.owner_user_id)?.full_name || "не назначен"}</p>
              <div className="grid-2">
                <label>
                  <span>Кого сделать главным</span>
                  <select
                    value={selectedOwners[key.id] ?? ""}
                    onChange={(event) =>
                      setSelectedOwners((prev) => ({
                        ...prev,
                        [key.id]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Выберите аккаунт</option>
                    {members.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.username})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="form-actions">
                <button
                  className="primary"
                  disabled={busy || !selectedOwners[key.id]}
                  type="button"
                  onClick={() => onAssignOwner({ keyId: key.id, userId: selectedOwners[key.id] })}
                >
                  Назначить владельца
                </button>
              </div>
            </div>
          );
        })}
        {keys.length === 0 ? <p className="empty">Ключи ещё не созданы.</p> : null}
      </Panel>

      <Panel title="Все пользователи" eyebrow="Users">
        {users.map((user) => (
          <button className="item" key={user.id} type="button" onClick={() => setAdminEditingUserId(user.id)}>
            <div className="item-head">
              <div className="stack">
                <strong>{user.full_name}</strong>
                <div className="meta">
                  <span className="pill">{user.is_admin ? "admin" : user.scope}</span>
                  <span className="pill">{user.role_label}</span>
                </div>
              </div>
              <span className="pill">{user.active ? "Active" : "Disabled"}</span>
            </div>
            <p className="muted">{user.username}</p>
          </button>
        ))}
      </Panel>
    </div>
  );
}

function Panel({ children, eyebrow, title }: { children: React.ReactNode; eyebrow: string; title: string }) {
  return (
    <article className="panel stack">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
      </div>
      {children}
    </article>
  );
}

function Stat({ note, title, value }: { title: string; value: number; note: string }) {
  return (
    <article className="panel">
      <p className="eyebrow">{title}</p>
      <strong className="stats-value">{value}</strong>
      <p className="muted">{note}</p>
    </article>
  );
}

function EventItem({ event }: { event: EventRecord }) {
  return (
    <div className="item">
      <div className="item-head">
        <div className="stack">
          <strong>{event.title}</strong>
          <div className="meta">
            <span className="pill">{DATE_FORMATTER.format(parseDate(event.date))}</span>
            <span className="pill">{[event.start_time, event.end_time].filter(Boolean).join(" - ") || "Весь день"}</span>
          </div>
        </div>
      </div>
      <p className="muted">{event.description || "Без описания"}</p>
    </div>
  );
}

function NoteItem({ note, usersById }: { note: NoteRecord; usersById: Record<string, AppUser> }) {
  return (
    <div className="stack">
      <div className="item-head">
        <div className="stack">
          <strong>{note.title}</strong>
          <div className="meta">
            <span className="pill">{usersById[note.creator_user_id]?.full_name || "Unknown"}</span>
            <span className="pill">{DATE_FORMATTER.format(new Date(note.updated_at))}</span>
          </div>
        </div>
      </div>
      <p className="muted">{note.summary}</p>
    </div>
  );
}

function ChatItem({
  currentUserId,
  message,
  usersById,
}: {
  message: ChatMessageRecord;
  currentUserId: string;
  usersById: Record<string, AppUser>;
}) {
  return (
    <div className={`chat-item ${message.author_user_id === currentUserId ? "mine" : ""}`}>
      <strong>{usersById[message.author_user_id]?.full_name || "Unknown"}</strong>
      <p className="muted">{message.text}</p>
      <span className="muted">{DATE_TIME_FORMATTER.format(new Date(message.created_at))}</span>
    </div>
  );
}

function UserItem({ user }: { user: AppUser }) {
  return (
    <div className="item">
      <div className="item-head">
        <div className="stack">
          <strong>{user.full_name}</strong>
          <div className="meta">
            <span className="pill">{user.is_admin ? "admin" : user.scope}</span>
            <span className="pill">{user.role_label}</span>
          </div>
        </div>
        <span className="pill">{user.active ? "Active" : "Disabled"}</span>
      </div>
      <p className="muted">{user.username}</p>
      {user.scope === "family" ? (
        <span className="pill">{user.family_calendar_enabled ? "Календарь ON" : "Календарь OFF"}</span>
      ) : null}
    </div>
  );
}

function CalendarGrid({
  events,
  month,
  selectedDate,
  setSelectedDate,
}: {
  events: EventRecord[];
  month: string;
  selectedDate: string;
  setSelectedDate: (value: string) => void;
}) {
  const start = calendarStart(parseMonth(month));
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index);
    const iso = toDateInputValue(date);
    const dayEvents = events.filter((event) => event.date === iso);
    return { date, iso, dayEvents };
  });

  return (
    <div className="grid-3">
      {cells.map((cell) => (
        <button className="item" key={cell.iso} type="button" onClick={() => setSelectedDate(cell.iso)}>
          <div className="item-head">
            <strong>{cell.date.getDate()}</strong>
            {cell.iso === selectedDate ? <span className="pill">selected</span> : null}
          </div>
          <div className="stack">
            {cell.dayEvents.slice(0, 2).map((event) => (
              <span className="pill" key={event.id}>
                {event.title}
              </span>
            ))}
            {cell.dayEvents.length === 0 ? <span className="muted">Нет событий</span> : null}
          </div>
        </button>
      ))}
    </div>
  );
}

function matchesSearch(value: string, search: string) {
  return !search || value.toLowerCase().includes(search.toLowerCase());
}

function nextTaskStatus(status: TaskRecord["status"]) {
  if (status === "open") return "in_progress";
  if (status === "in_progress") return "done";
  return "open";
}

function toDateInputValue(date: Date) {
  return offsetDate(date).toISOString().slice(0, 10);
}

function toMonthValue(date: Date) {
  return offsetDate(date).toISOString().slice(0, 7);
}

function offsetDate(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000);
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function parseMonth(value: string) {
  return new Date(`${value}-01T00:00:00`);
}

function shiftMonth(value: string, step: number) {
  const date = parseMonth(value);
  date.setMonth(date.getMonth() + step);
  return toMonthValue(date);
}

function calendarStart(date: Date) {
  const start = new Date(date);
  const shift = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - shift);
  return start;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
