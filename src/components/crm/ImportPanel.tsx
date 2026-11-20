"use client";

import React, { useRef, useState } from "react";
import { X } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { ErrorLine, cardCls, inputCls } from "@/components/crm/ui";
import { errText } from "@/lib/crm";
import type { CrmField, CrmImportMapping, CrmImportResult } from "@/types";

type Step = "file" | "mapping" | "preview" | "done";

function Counts({ r }: { r: CrmImportResult }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {[
        ["Всего строк", r.total],
        ["Будет создано", r.created],
        ["Уже есть (совпали)", r.matched],
        ["Пропущено", r.skipped],
      ].map(([label, n]) => (
        <div key={String(label)} className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 p-2.5">
          <div className="text-lg font-bold text-zinc-900 dark:text-white">{n}</div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{label}</div>
        </div>
      ))}
    </div>
  );
}

/** CSV import of contacts: file -> column mapping -> dry run -> real run. */
export function ImportPanel({ fields, onClose, onImported }: { fields: CrmField[]; onClose: () => void; onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("file");
  const [csv, setCsv] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapName, setMapName] = useState("");
  const [mapPhone, setMapPhone] = useState("");
  const [mapEmail, setMapEmail] = useState("");
  const [mapCustom, setMapCustom] = useState<Record<string, string>>({});
  const [result, setResult] = useState<CrmImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contactFields = fields.filter((f) => f.entity === "contact");

  const buildMapping = (): CrmImportMapping => {
    const m: CrmImportMapping = {};
    if (mapName) m.name = mapName;
    if (mapPhone) m.phone = mapPhone;
    if (mapEmail) m.email = mapEmail;
    const custom = Object.fromEntries(Object.entries(mapCustom).filter(([, v]) => v));
    if (Object.keys(custom).length) m.custom = custom;
    return m;
  };

  const pickFile = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    setError(null);
    try {
      const text = await f.text();
      const res = await api.crmImportHeaders(text);
      setCsv(text);
      setHeaders(res.headers || []);
      // Pre-select obvious columns by header name.
      const find = (re: RegExp) => (res.headers || []).find((h) => re.test(h.toLowerCase())) || "";
      setMapName(find(/имя|фио|name|клиент/));
      setMapPhone(find(/тел|phone|mobile/));
      setMapEmail(find(/mail|почт/));
      setStep("mapping");
    } catch (e) {
      setError(errText(e, "Не удалось прочитать файл"));
    } finally {
      setBusy(false);
    }
  };

  const run = async (dry: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.crmImport(csv, buildMapping(), dry);
      setResult(res);
      setStep(dry ? "preview" : "done");
      if (!dry) onImported();
    } catch (e) {
      setError(errText(e, "Не удалось выполнить импорт"));
    } finally {
      setBusy(false);
    }
  };

  const colSelect = (value: string, onChange: (v: string) => void) => (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— не импортировать —</option>
      {headers.map((h) => (
        <option key={h} value={h}>
          {h}
        </option>
      ))}
    </select>
  );

  return (
    <div className={`${cardCls} p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-zinc-900 dark:text-white">Импорт контактов из CSV</div>
        <button type="button" onClick={onClose} aria-label="Закрыть" className="p-1 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <X className="h-4 w-4" />
        </button>
      </div>
      <ErrorLine text={error} />

      {step === "file" && (
        <div className="space-y-2">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Выберите CSV-файл с первой строкой-заголовком. Контакты с уже существующим телефоном или e-mail не дублируются.
          </p>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
          <Button variant="secondary" loading={busy} onClick={() => fileRef.current?.click()}>
            Выбрать файл
          </Button>
        </div>
      )}

      {(step === "mapping" || step === "preview") && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Укажите, какой столбец файла куда попадёт.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Имя</span>
              {colSelect(mapName, setMapName)}
            </label>
            <label className="block">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Телефон</span>
              {colSelect(mapPhone, setMapPhone)}
            </label>
            <label className="block">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">E-mail</span>
              {colSelect(mapEmail, setMapEmail)}
            </label>
            {contactFields.map((f) => (
              <label key={f.id} className="block">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{f.label}</span>
                {colSelect(mapCustom[f.key] || "", (v) => setMapCustom((m) => ({ ...m, [f.key]: v })))}
              </label>
            ))}
          </div>

          {step === "preview" && result && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Предпросмотр (ничего не записано)</div>
              <Counts r={result} />
              {result.errors?.length > 0 && (
                <ul className="text-xs text-rose-700 dark:text-rose-300 space-y-0.5">
                  {result.errors.slice(0, 10).map((er, i) => (
                    <li key={i}>
                      Строка {er.row}: {er.reason}
                    </li>
                  ))}
                  {result.errors.length > 10 && <li>…и ещё {result.errors.length - 10}</li>}
                </ul>
              )}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" loading={busy} onClick={() => run(true)} disabled={!mapName && !mapPhone && !mapEmail}>
              Проверить
            </Button>
            {step === "preview" && result && (
              <Button loading={busy} onClick={() => run(false)} disabled={result.created + result.matched === 0}>
                Импортировать
              </Button>
            )}
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Импорт выполнен</div>
          <Counts r={result} />
          {result.errors?.length > 0 && (
            <ul className="text-xs text-rose-700 dark:text-rose-300 space-y-0.5">
              {result.errors.slice(0, 10).map((er, i) => (
                <li key={i}>
                  Строка {er.row}: {er.reason}
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose}>
              Закрыть
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
