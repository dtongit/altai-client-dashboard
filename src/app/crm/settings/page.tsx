"use client";

import React, { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { CrmGate, CrmTabs, ErrorLine, SectionTitle, cardCls, inputCls } from "@/components/crm/ui";
import { errText, stageKindClasses } from "@/lib/crm";
import type { CrmField, CrmFieldEntity, CrmFieldType, CrmPipeline, CrmSettings, CrmStage } from "@/types";

type Reload = () => Promise<unknown>;

const FIELD_TYPES: Array<{ id: CrmFieldType; label: string }> = [
  { id: "text", label: "Текст" },
  { id: "number", label: "Число" },
  { id: "date", label: "Дата" },
  { id: "list", label: "Список" },
];

function parseOptions(s: string): string[] {
  return s
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Runs an API action, shows the server `detail` inline. */
function useAction() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      return true;
    } catch (e) {
      setError(errText(e));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { error, busy, run, setError };
}

function StageRow({ stage, index, openIds, siblings, onReload }: { stage: CrmStage; index: number; openIds: string[]; siblings: CrmStage[]; onReload: Reload }) {
  const [name, setName] = useState(stage.name);
  const [description, setDescription] = useState(stage.description || "");
  const [target, setTarget] = useState("");
  const [deleting, setDeleting] = useState(false);
  const { error, busy, run } = useAction();
  const fixed = stage.kind !== "open";
  const dirty = name !== stage.name || description !== (stage.description || "");
  useEffect(() => {
    setName(stage.name);
    setDescription(stage.description || "");
  }, [stage.name, stage.description]);

  const move = (dir: -1 | 1) => {
    const ids = [...openIds];
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    return run(async () => {
      await api.reorderCrmStages(stage.pipeline_id, ids);
      await onReload();
    });
  };

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 space-y-2 bg-zinc-50/50 dark:bg-zinc-950/30">
      <div className="flex items-center gap-2">
        <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${stageKindClasses(stage.kind)}`}>
          {stage.kind === "open" ? "Этап" : stage.kind === "won" ? "Успешно" : "Отказ"}
        </span>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} aria-label="Название этапа" />
        {!fixed && (
          <>
            <button type="button" disabled={busy || index === 0} onClick={() => move(-1)} aria-label="Выше" className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 text-zinc-600 dark:text-zinc-300">
              <ArrowUp className="h-4 w-4" />
            </button>
            <button type="button" disabled={busy || index === openIds.length - 1} onClick={() => move(1)} aria-label="Ниже" className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 text-zinc-600 dark:text-zinc-300">
              <ArrowDown className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
      <textarea className={inputCls} rows={2} placeholder="Сделка здесь, когда…" value={description} onChange={(e) => setDescription(e.target.value)} />
      <ErrorLine text={error} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!fixed ? (
          deleting ? (
            <div className="flex flex-wrap items-center gap-2">
              <select className={`${inputCls} w-52`} value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Куда перенести сделки">
                <option value="">Сделок нет / не переносить</option>
                {siblings
                  .filter((s) => s.id !== stage.id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      Перенести в «{s.name}»
                    </option>
                  ))}
              </select>
              <Button
                variant="danger"
                size="sm"
                loading={busy}
                onClick={async () => {
                  if (await run(async () => { await api.deleteCrmStage(stage.id, target || undefined); await onReload(); })) setDeleting(false);
                }}
              >
                Удалить этап
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDeleting(false)}>
                Отмена
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setDeleting(true)}>
              <Trash2 className="h-3.5 w-3.5" />
              Удалить
            </Button>
          )
        ) : (
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Финальный этап: его нельзя удалить или переставить.</span>
        )}
        <Button size="sm" loading={busy} disabled={!dirty || !name.trim()} onClick={() => run(async () => { await api.patchCrmStage(stage.id, { name: name.trim(), description }); await onReload(); })}>
          Сохранить
        </Button>
      </div>
    </div>
  );
}

function PipelinesSection({ pipelines, onReload }: { pipelines: CrmPipeline[]; onReload: Reload }) {
  const [selectedId, setSelectedId] = useState(pipelines[0]?.id || "");
  const pipeline = pipelines.find((p) => p.id === selectedId) || pipelines[0] || null;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [archiving, setArchiving] = useState(false);
  const [target, setTarget] = useState("");
  const [stageName, setStageName] = useState("");
  const [stageDesc, setStageDesc] = useState("");
  const pAct = useAction();
  const newAct = useAction();
  const archAct = useAction();
  const stAct = useAction();

  useEffect(() => {
    setName(pipeline?.name || "");
    setDescription(pipeline?.description || "");
    setArchiving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipeline?.id, pipeline?.name, pipeline?.description]);

  const open = (pipeline?.stages || []).filter((s) => s.kind === "open");
  const openIds = open.map((s) => s.id);
  const finals = (pipeline?.stages || []).filter((s) => s.kind !== "open");

  return (
    <div className={`${cardCls} p-4 space-y-4`}>
      <SectionTitle>Воронки</SectionTitle>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {pipelines.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${
                pipeline?.id === p.id
                  ? "bg-amber-500 text-zinc-950 border-amber-500 font-semibold"
                  : "border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {p.name}
              {p.is_default && " ★"}
            </button>
          ))}
        </div>
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-3 space-y-2">
          <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Новая воронка</div>
          <input className={inputCls} placeholder="Название" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <textarea className={inputCls} rows={2} placeholder="Когда использовать" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          <ErrorLine text={newAct.error} />
          <Button
            size="sm"
            loading={newAct.busy}
            disabled={!newName.trim()}
            onClick={async () => {
              const ok = await newAct.run(async () => {
                const res = await api.createCrmPipeline({ name: newName.trim(), description: newDesc });
                await onReload();
                if (res.pipeline?.id) setSelectedId(res.pipeline.id);
              });
              if (ok) {
                setNewName("");
                setNewDesc("");
              }
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Создать воронку
          </Button>
        </div>
      </div>

      {pipeline && (
        <>
          <div className="space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-4">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} aria-label="Название воронки" />
            <textarea className={inputCls} rows={2} placeholder="Когда использовать" value={description} onChange={(e) => setDescription(e.target.value)} />
            <ErrorLine text={pAct.error} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                {!pipeline.is_default && (
                  <Button variant="secondary" size="sm" loading={pAct.busy} onClick={() => pAct.run(async () => { await api.patchCrmPipeline(pipeline.id, { is_default: true }); await onReload(); })}>
                    Сделать основной
                  </Button>
                )}
                {pipeline.is_default && <span className="self-center text-xs text-zinc-500 dark:text-zinc-400">Основная воронка</span>}
                {pipelines.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => setArchiving((v) => !v)}>
                    В архив
                  </Button>
                )}
              </div>
              <Button size="sm" loading={pAct.busy} disabled={!name.trim() || (name === pipeline.name && description === (pipeline.description || ""))} onClick={() => pAct.run(async () => { await api.patchCrmPipeline(pipeline.id, { name: name.trim(), description }); await onReload(); })}>
                Сохранить
              </Button>
            </div>
            {archiving && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                <p className="text-xs text-zinc-600 dark:text-zinc-400">Если в воронке есть открытые сделки, выберите воронку, куда их перенести (они попадут на её первый этап).</p>
                <select className={inputCls} value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Воронка для переноса сделок">
                  <option value="">Открытых сделок нет</option>
                  {pipelines
                    .filter((p) => p.id !== pipeline.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        Перенести в «{p.name}»
                      </option>
                    ))}
                </select>
                <ErrorLine text={archAct.error} />
                <Button
                  variant="danger"
                  size="sm"
                  loading={archAct.busy}
                  onClick={async () => {
                    const ok = await archAct.run(async () => { await api.archiveCrmPipeline(pipeline.id, target || undefined); await onReload(); });
                    if (ok) {
                      setArchiving(false);
                      setSelectedId("");
                    }
                  }}
                >
                  Отправить в архив
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-4">
            <SectionTitle>Этапы воронки «{pipeline.name}»</SectionTitle>
            {open.map((s, i) => (
              <StageRow key={s.id} stage={s} index={i} openIds={openIds} siblings={pipeline.stages} onReload={onReload} />
            ))}
            <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-3 space-y-2">
              <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Новый этап</div>
              <input className={inputCls} placeholder="Название" value={stageName} onChange={(e) => setStageName(e.target.value)} />
              <textarea className={inputCls} rows={2} placeholder="Сделка здесь, когда…" value={stageDesc} onChange={(e) => setStageDesc(e.target.value)} />
              <ErrorLine text={stAct.error} />
              <Button
                size="sm"
                loading={stAct.busy}
                disabled={!stageName.trim()}
                onClick={async () => {
                  const ok = await stAct.run(async () => { await api.addCrmStage(pipeline.id, { name: stageName.trim(), description: stageDesc }); await onReload(); });
                  if (ok) {
                    setStageName("");
                    setStageDesc("");
                  }
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Добавить этап
              </Button>
            </div>
            {finals.map((s, i) => (
              <StageRow key={s.id} stage={s} index={i} openIds={openIds} siblings={pipeline.stages} onReload={onReload} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FieldRow({ field, onReload }: { field: CrmField; onReload: Reload }) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [label, setLabel] = useState(field.label);
  const [options, setOptions] = useState((field.options || []).join(", "));
  const { error, busy, run } = useAction();
  const dirty = label !== field.label || (field.type === "list" && options !== (field.options || []).join(", "));
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 space-y-2 bg-zinc-50/50 dark:bg-zinc-950/30">
      <ConfirmDialog />
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
        <span className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800">{field.entity === "deal" ? "Сделка" : "Контакт"}</span>
        <span className="font-mono">{field.key}</span>
        <span>{FIELD_TYPES.find((t) => t.id === field.type)?.label}</span>
      </div>
      <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} aria-label="Название поля" />
      {field.type === "list" && <input className={inputCls} value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Варианты через запятую" />}
      <ErrorLine text={error} />
      <div className="flex justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            const ok = await confirm({ title: "Удалить поле?", text: `Поле «${field.label}» исчезнет из карточек. Значения, уже записанные в сделках и контактах, останутся в данных, но показываться не будут.`, confirmLabel: "Удалить", danger: true });
            if (ok) await run(async () => { await api.deleteCrmField(field.id); await onReload(); });
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Удалить
        </Button>
        <Button size="sm" loading={busy} disabled={!dirty || !label.trim()} onClick={() => run(async () => { await api.patchCrmField(field.id, field.type === "list" ? { label: label.trim(), options: parseOptions(options) } : { label: label.trim() }); await onReload(); })}>
          Сохранить
        </Button>
      </div>
    </div>
  );
}

function FieldsSection({ fields, onReload }: { fields: CrmField[]; onReload: Reload }) {
  const [entity, setEntity] = useState<CrmFieldEntity>("deal");
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<CrmFieldType>("text");
  const [options, setOptions] = useState("");
  const { error, busy, run } = useAction();
  return (
    <div className={`${cardCls} p-4 space-y-3`}>
      <SectionTitle>Свои поля</SectionTitle>
      {fields.length === 0 && <p className="text-sm text-zinc-500 dark:text-zinc-400">Своих полей пока нет.</p>}
      {fields.map((f) => (
        <FieldRow key={f.id} field={f} onReload={onReload} />
      ))}
      <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-3 space-y-2">
        <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Новое поле</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select className={inputCls} value={entity} onChange={(e) => setEntity(e.target.value as CrmFieldEntity)} aria-label="Где поле">
            <option value="deal">В сделке</option>
            <option value="contact">В контакте</option>
          </select>
          <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as CrmFieldType)} aria-label="Тип поля">
            {FIELD_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <input className={inputCls} placeholder="Ключ (латиницей, например budget_note)" value={key} onChange={(e) => setKey(e.target.value)} />
          <input className={inputCls} placeholder="Название" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        {type === "list" && <input className={inputCls} placeholder="Варианты через запятую" value={options} onChange={(e) => setOptions(e.target.value)} />}
        <ErrorLine text={error} />
        <Button
          size="sm"
          loading={busy}
          disabled={!key.trim() || !label.trim()}
          onClick={async () => {
            const ok = await run(async () => {
              await api.createCrmField({ entity, key: key.trim(), label: label.trim(), type, ...(type === "list" ? { options: parseOptions(options) } : {}) });
              await onReload();
            });
            if (ok) {
              setKey("");
              setLabel("");
              setOptions("");
            }
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Добавить поле
        </Button>
      </div>
    </div>
  );
}

function NotificationsSection({ settings, onReload }: { settings: CrmSettings; onReload: Reload }) {
  const { error, busy, run } = useAction();
  const items: Array<[keyof CrmSettings, string]> = [
    ["notify_new_deal", "Сообщать в бот команды о новой сделке"],
    ["notify_stage_change", "Сообщать в бот команды о смене этапа"],
  ];
  return (
    <div className={`${cardCls} p-4 space-y-3`}>
      <SectionTitle>Уведомления</SectionTitle>
      {items.map(([k, text]) => (
        <label key={k} className="flex items-center gap-3 text-sm text-zinc-800 dark:text-zinc-200 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 accent-amber-500"
            checked={Boolean(settings[k])}
            disabled={busy}
            onChange={(e) => run(async () => { await api.patchCrmSettings({ [k]: e.target.checked }); await onReload(); })}
          />
          {text}
        </label>
      ))}
      <ErrorLine text={error} />
    </div>
  );
}

export default function CrmSettingsPage() {
  const { showToast } = useToast();
  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1000px] mx-auto">
      <h1 className="text-xl font-bold text-zinc-900 dark:text-white">CRM</h1>
      <CrmGate>
        {({ meta, pipelines, fields, canEditSettings, reload }) => {
          const onReload: Reload = async () => {
            try {
              await reload(true);
            } catch {
              showToast("Не удалось обновить данные CRM", "error");
            }
          };
          return (
            <>
              <CrmTabs active="settings" canEditSettings={canEditSettings} />
              {!canEditSettings ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Настройки CRM доступны только пользователям с правом «Настройки каналов».</p>
              ) : (
                <>
                  <PipelinesSection pipelines={pipelines} onReload={onReload} />
                  <FieldsSection fields={fields} onReload={onReload} />
                  <NotificationsSection settings={meta?.settings || { notify_new_deal: false, notify_stage_change: false }} onReload={onReload} />
                </>
              )}
            </>
          );
        }}
      </CrmGate>
    </div>
  );
}
