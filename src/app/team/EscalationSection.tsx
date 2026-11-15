"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import type { EscalationAddressee, EscalationGroup, KnowledgeNode, TeamUser } from "@/types";
import { Pencil, Plus, Trash2, Route, Users } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";

const inputCls =
  "w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-base text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-60";

const NAME_MAX = 32;

interface AddresseeForm {
  id: string | null;
  name: string;
  userId: string;
  groupIds: string[];
  isActive: boolean;
}

interface GroupForm {
  id: string | null;
  name: string;
}

type DeleteTarget = { kind: "addressee" | "group"; id: string; name: string };

/** KB articles whose title, summary or text mention `name` (case-insensitive substring). */
function mentions(nodes: KnowledgeNode[] | null, name: string): KnowledgeNode[] {
  const needle = name.trim().toLowerCase();
  if (!nodes || !needle) return [];
  return nodes.filter((n) =>
    `${n.title}\n${n.summary}\n${n.content}`.toLowerCase().includes(needle)
  );
}

function articlesWord(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "статье";
  return "статьях";
}

function MentionsNote({ name, nodes, verb }: { name: string; nodes: KnowledgeNode[] | null; verb: string }) {
  const found = mentions(nodes, name);
  if (found.length === 0) return null;
  return (
    <div className="p-3 rounded-xl text-xs bg-amber-50 dark:bg-amber-950/20 border border-amber-300/60 dark:border-amber-500/30 text-zinc-800 dark:text-zinc-200 space-y-1.5">
      <div className="font-semibold">
        Имя «{name}» упоминается в {found.length} {articlesWord(found.length)} базы знаний
      </div>
      <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
        {verb} Проверьте эти статьи, чтобы правило не указывало в пустоту.
      </p>
      <ul className="list-disc pl-4 space-y-0.5">
        {found.map((n) => (
          <li key={n.id}>
            <Link
              href="/knowledge/"
              className="font-medium text-amber-700 dark:text-amber-400 hover:underline"
              title={n.path}
            >
              {n.title || n.path}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EscalationSection({ users }: { users: TeamUser[] }) {
  const { showToast } = useToast();
  const [addressees, setAddressees] = useState<EscalationAddressee[]>([]);
  const [groups, setGroups] = useState<EscalationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // null = the KB could not be read (no access to it): the mention warning is skipped.
  const [nodes, setNodes] = useState<KnowledgeNode[] | null>(null);

  const [aForm, setAForm] = useState<AddresseeForm | null>(null);
  const [gForm, setGForm] = useState<GroupForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [del, setDel] = useState<DeleteTarget | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [a, g] = await Promise.all([api.getEscalationAddressees(), api.getEscalationGroups()]);
      setAddressees(a.addressees || []);
      setGroups(g.groups || []);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Не удалось загрузить список");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    api
      .getKnowledgeNodes()
      .then((r) => setNodes(r.nodes || []))
      .catch(() => setNodes(null));
  }, [load]);

  const accountOptions = useMemo(
    () => users.filter((u) => u.membership?.is_active !== false),
    [users]
  );
  const groupName = (id: string) => groups.find((g) => g.id === id)?.name || "—";

  const openAddressee = (a?: EscalationAddressee) => {
    setFormError(null);
    setAForm(
      a
        ? { id: a.id, name: a.name, userId: a.user_id || "", groupIds: a.group_ids || [], isActive: a.is_active }
        : { id: null, name: "", userId: "", groupIds: [], isActive: true }
    );
  };

  const saveAddressee = async () => {
    if (!aForm) return;
    const name = aForm.name.trim();
    if (!name) return setFormError("Укажите имя, под которым Вера знает этого человека");
    if (!aForm.userId) return setFormError("Выберите аккаунт кабинета: через него человек получает оповещения");
    setSaving(true);
    setFormError(null);
    try {
      const body = { name, user_id: aForm.userId, group_ids: aForm.groupIds, is_active: aForm.isActive };
      if (aForm.id) await api.updateEscalationAddressee(aForm.id, body);
      else await api.createEscalationAddressee(body);
      setAForm(null);
      showToast(aForm.id ? "Сохранено" : "Адресат добавлен", "success");
      await load();
    } catch (e: any) {
      setFormError(e?.detail || e?.message || "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  const toggleVacation = async (a: EscalationAddressee) => {
    setBusyId(a.id);
    try {
      await api.updateEscalationAddressee(a.id, { is_active: !a.is_active });
      await load();
    } catch (e: any) {
      showToast(e?.detail || e?.message || "Не удалось изменить", "error");
    } finally {
      setBusyId(null);
    }
  };

  const saveGroup = async () => {
    if (!gForm) return;
    const name = gForm.name.trim();
    if (!name) return setFormError("Укажите название группы");
    setSaving(true);
    setFormError(null);
    try {
      if (gForm.id) await api.updateEscalationGroup(gForm.id, { name });
      else await api.createEscalationGroup({ name });
      setGForm(null);
      showToast(gForm.id ? "Сохранено" : "Группа создана", "success");
      await load();
    } catch (e: any) {
      setFormError(e?.detail || e?.message || "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!del) return;
    setSaving(true);
    try {
      if (del.kind === "addressee") await api.deleteEscalationAddressee(del.id);
      else await api.deleteEscalationGroup(del.id);
      setDel(null);
      showToast("Удалено", "success");
      await load();
    } catch (e: any) {
      showToast(e?.detail || e?.message || "Не удалось удалить", "error");
    } finally {
      setSaving(false);
    }
  };

  const editedA = aForm?.id ? addressees.find((a) => a.id === aForm.id) : null;
  const renamedA = Boolean(editedA && aForm && editedA.name.trim().toLowerCase() !== aForm.name.trim().toLowerCase());
  const editedG = gForm?.id ? groups.find((g) => g.id === gForm.id) : null;
  const renamedG = Boolean(editedG && gForm && editedG.name.trim().toLowerCase() !== gForm.name.trim().toLowerCase());

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Route className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">Кому Вера передаёт чаты</h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Люди и группы, которым Вера может передать диалог. Вера видит только эти имена, без прав и контактов.
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="secondary" onClick={() => { setFormError(null); setGForm({ id: null, name: "" }); }}>
            <Users className="h-3.5 w-3.5 mr-1" /> Группа
          </Button>
          <Button size="sm" onClick={() => openAddressee()}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Адресат
          </Button>
        </div>
      </div>

      <div className="p-3 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 space-y-1">
        <p>
          Напишите в базе знаний, кому передавать: в статье самого случая укажите, например, «по вопросам ширины стопы
          передай через <code className="font-mono text-[11px]">to=[&quot;Алина&quot;]</code>». Имя пишите ровно так, как
          оно настроено здесь; можно несколько имён или название группы.
        </p>
        <p className="text-zinc-500 dark:text-zinc-400">
          Если имени здесь нет, человек в отпуске или недоступен, чат получат все, как раньше. Человек получает
          оповещения в Telegram-боте команды, поэтому его аккаунт должен быть привязан к боту.
        </p>
      </div>

      {error && (
        <div className="p-2.5 rounded-xl text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
        {loading ? (
          <div className="p-4 text-xs text-zinc-500">Загрузка...</div>
        ) : addressees.length === 0 ? (
          <div className="p-4 text-xs text-zinc-500 dark:text-zinc-400">
            Пока никого нет: Вера передаёт чаты всем, как и раньше.
          </div>
        ) : (
          addressees.map((a) => (
            <div key={a.id} className="p-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-white">{a.name}</span>
                  {!a.is_active && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                      В отпуске
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                  {a.username ? `Аккаунт: ${a.username}` : "Аккаунт не привязан"}
                  {a.group_ids.length > 0 && ` · Группы: ${a.group_ids.map(groupName).join(", ")}`}
                </div>
              </div>
              <label className="flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 cursor-pointer select-none shrink-0">
                <input
                  type="checkbox"
                  className="accent-amber-500"
                  checked={!a.is_active}
                  disabled={busyId === a.id}
                  onChange={() => toggleVacation(a)}
                />
                В отпуске
              </label>
              <button
                onClick={() => openAddressee(a)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                title="Изменить"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setDel({ kind: "addressee", id: a.id, name: a.name })}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                title="Удалить"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Группы
        </div>
        {!loading && groups.length === 0 ? (
          <div className="p-4 text-xs text-zinc-500 dark:text-zinc-400">
            Групп нет. Группа нужна, когда один вопрос ведут несколько человек, например «Визы».
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.id} className="p-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-zinc-900 dark:text-white">{g.name}</div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                  {g.members.length === 0
                    ? "Участников нет: добавьте группу адресату"
                    : g.members.map((m) => (m.is_active ? m.name : `${m.name} (в отпуске)`)).join(", ")}
                </div>
              </div>
              <button
                onClick={() => { setFormError(null); setGForm({ id: g.id, name: g.name }); }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                title="Переименовать"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setDel({ kind: "group", id: g.id, name: g.name })}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                title="Удалить"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Addressee form */}
      <Sheet
        open={Boolean(aForm)}
        onClose={() => setAForm(null)}
        title={aForm?.id ? `Адресат «${editedA?.name ?? ""}»` : "Новый адресат"}
        className="md:!w-[480px]"
      >
        {aForm && (
          <div className="space-y-4">
            {formError && (
              <div className="p-2.5 rounded-xl text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                {formError}
              </div>
            )}
            <label className="block space-y-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Имя для Веры
              <input
                className={inputCls}
                value={aForm.name}
                maxLength={NAME_MAX}
                placeholder="Алина"
                onChange={(e) => setAForm({ ...aForm, name: e.target.value })}
              />
              <span className="block text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
                Короткое имя без запятых и кавычек. Именно так его нужно писать в базе знаний.
              </span>
            </label>
            {renamedA && editedA && (
              <MentionsNote
                name={editedA.name}
                nodes={nodes}
                verb="После переименования старое имя перестанет работать."
              />
            )}
            <label className="block space-y-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Аккаунт в кабинете
              <select
                className={inputCls}
                value={aForm.userId}
                onChange={(e) => setAForm({ ...aForm, userId: e.target.value })}
              >
                <option value="">Не выбран</option>
                {accountOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username}
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Группы</div>
              {groups.length === 0 ? (
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Групп пока нет: создайте их кнопкой «Группа».</p>
              ) : (
                groups.map((g) => (
                  <label key={g.id} className="flex items-center gap-2 text-xs text-zinc-800 dark:text-zinc-200 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-amber-500"
                      checked={aForm.groupIds.includes(g.id)}
                      onChange={(e) =>
                        setAForm({
                          ...aForm,
                          groupIds: e.target.checked ? [...aForm.groupIds, g.id] : aForm.groupIds.filter((x) => x !== g.id),
                        })
                      }
                    />
                    {g.name}
                  </label>
                ))
              )}
            </div>
            <label className="flex items-center gap-2 text-xs text-zinc-800 dark:text-zinc-200 cursor-pointer">
              <input
                type="checkbox"
                className="accent-amber-500"
                checked={!aForm.isActive}
                onChange={(e) => setAForm({ ...aForm, isActive: !e.target.checked })}
              />
              В отпуске (чаты, переданные ему, получат все)
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setAForm(null)}>Отмена</Button>
              <Button loading={saving} onClick={saveAddressee}>Сохранить</Button>
            </div>
          </div>
        )}
      </Sheet>

      {/* Group form */}
      <Sheet
        open={Boolean(gForm)}
        onClose={() => setGForm(null)}
        title={gForm?.id ? `Группа «${editedG?.name ?? ""}»` : "Новая группа"}
        className="md:!w-[420px]"
      >
        {gForm && (
          <div className="space-y-4">
            {formError && (
              <div className="p-2.5 rounded-xl text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                {formError}
              </div>
            )}
            <label className="block space-y-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Название
              <input
                className={inputCls}
                value={gForm.name}
                maxLength={NAME_MAX}
                placeholder="Визы"
                onChange={(e) => setGForm({ ...gForm, name: e.target.value })}
              />
              <span className="block text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
                Название не должно совпадать с именем человека. Состав группы задаётся у каждого адресата.
              </span>
            </label>
            {renamedG && editedG && (
              <MentionsNote name={editedG.name} nodes={nodes} verb="После переименования старое название перестанет работать." />
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setGForm(null)}>Отмена</Button>
              <Button loading={saving} onClick={saveGroup}>Сохранить</Button>
            </div>
          </div>
        )}
      </Sheet>

      {/* Delete confirmation with the KB mention warning */}
      <Sheet
        open={Boolean(del)}
        onClose={() => setDel(null)}
        title={del ? `Удалить «${del.name}»?` : ""}
        className="md:!w-[420px]"
      >
        {del && (
          <div className="space-y-4">
            <p className="text-xs text-zinc-700 dark:text-zinc-300">
              {del.kind === "group"
                ? "Группа будет убрана у всех участников, сами люди останутся."
                : "Вера больше не сможет передавать чаты этому человеку."}
            </p>
            <MentionsNote name={del.name} nodes={nodes} verb="После удаления имя перестанет работать, чат получат все." />
            {nodes === null && (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Статьи базы знаний не удалось проверить: убедитесь сами, что имя не используется в правилах.
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setDel(null)}>Отмена</Button>
              <Button variant="danger" loading={saving} onClick={confirmDelete}>Удалить</Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
