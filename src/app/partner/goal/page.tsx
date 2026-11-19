"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { DEPOSIT, calcGoal, depositForRub, incomeProjection, pluralClients } from "@/lib/partner-calc";
import { DEAL_TYPE_LABELS, formatBp, formatRub, rubNumber } from "@/lib/partner-format";
import { PartnerDealType } from "@/types";
import { Card, ErrorBox, Label, Money, PageTitle, Spinner, btnPrimary, inputCls, useLoad, usePartner } from "@/components/partner/ui";

const num = (v: string) => {
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** «12,4 млн ₽» from roubles. */
function mln(rub: number): string {
  if (rub < 1_000_000) return `${rubNumber(Math.round(rub / 1000) * 1000 * 100)} ₽`;
  return `${(rub / 1e6).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} млн ₽`;
}

function Field({ label, value, onChange, suffix }: { label: string; value: string; onChange: (v: string) => void; suffix?: string }) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <div className="relative">
        <input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} pp-num ${suffix ? "pr-9" : ""}`} />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--pp-muted)]">{suffix}</span>}
      </div>
    </label>
  );
}

/** Income by month: one series (the partner's income) and the goal as a dashed line; hover shows the month. */
function IncomeChart({ series, goalKop, goalMonth }: { series: number[]; goalKop: number; goalMonth: number | null }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 800;
  const H = 240;
  const p = { l: 52, r: 16, t: 26, b: 28 };
  const M = series.length - 1;
  const maxY = Math.max(goalKop, ...series) * 1.12 || 1;
  const x = (m: number) => p.l + (m / Math.max(1, M)) * (W - p.l - p.r);
  const y = (v: number) => H - p.b - (v / maxY) * (H - p.t - p.b);
  const line = series.map((v, m) => `${m ? "L" : "M"}${x(m).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const area = `${line}L${x(M)},${y(0)}L${x(0)},${y(0)}Z`;
  const step = Math.max(1, Math.ceil(M / 8));
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    setHover(Math.max(0, Math.min(M, Math.round(((px - p.l) / (W - p.l - p.r)) * M))));
  };
  const h = hover;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block touch-none" onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label="Доход по месяцам">
        <defs>
          <linearGradient id="pp-goal-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--pp-money)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--pp-money)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={p.l} x2={W - p.r} y1={y(goalKop * f)} y2={y(goalKop * f)} stroke="var(--pp-line)" strokeWidth={1} />
            <text x={p.l - 8} y={y(goalKop * f) + 4} textAnchor="end" fontSize={11} fill="var(--pp-muted)">
              {Math.round((goalKop * f) / 100_000)}к
            </text>
          </g>
        ))}
        {Array.from({ length: Math.floor(M / step) + 1 }, (_, i) => i * step).map((m) => (
          <text key={m} x={x(m)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--pp-muted)">
            {m} мес
          </text>
        ))}
        <path d={area} fill="url(#pp-goal-area)" />
        <path d={line} fill="none" stroke="var(--pp-money)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {goalKop > 0 && (
          <>
            <line x1={p.l} x2={W - p.r} y1={y(goalKop)} y2={y(goalKop)} stroke="var(--pp-gold)" strokeWidth={2} strokeDasharray="6 6" />
            <text x={W - p.r} y={y(goalKop) - 8} textAnchor="end" fontSize={12} fontWeight={700} fill="var(--pp-muted)">
              Цель {formatRub(goalKop)}
            </text>
          </>
        )}
        {goalMonth !== null && goalMonth <= M && <circle cx={x(goalMonth)} cy={y(series[goalMonth])} r={6} fill="var(--pp-money)" stroke="var(--pp-card)" strokeWidth={2} />}
        {h !== null && (
          <>
            <line x1={x(h)} x2={x(h)} y1={p.t} y2={H - p.b} stroke="var(--pp-muted)" strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={x(h)} cy={y(series[h])} r={5} fill="var(--pp-money)" stroke="var(--pp-card)" strokeWidth={2} />
          </>
        )}
      </svg>
      {h !== null && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg border border-[var(--pp-line)] bg-[var(--pp-card)] px-2.5 py-1.5 text-xs shadow-sm whitespace-nowrap"
          style={{ left: `${(x(h) / W) * 100}%` }}
        >
          <div className="text-[var(--pp-muted)]">Через {h} мес</div>
          <div className="pp-num font-bold text-[var(--pp-text)]">{formatRub(series[h])} в месяц</div>
        </div>
      )}
    </div>
  );
}

export default function PartnerGoalPage() {
  const { me, setMe } = usePartner();
  const { data, error, loading, reload } = useLoad(() => api.partnerForecast());

  const [tariffCode, setTariffCode] = useState("");
  // The calculator starts from how the partner worked last month (a head-hunter if any client of theirs was).
  const startDeal: PartnerDealType = me.roles?.includes("headhunter") ? "manager" : "rep";
  const [dealType, setDealType] = useState<PartnerDealType>(startDeal);
  const [goal, setGoal] = useState("");
  const [perMonth, setPerMonth] = useState("2");
  const [l1, setL1] = useState("0");
  const [l2, setL2] = useState("0");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setTariffCode((c) => c || data.tariffs.find((t) => t.code === "business")?.code || data.tariffs[0]?.code || "");
    setGoal(String(Math.round((data.goal_kop ?? 0) / 100) || 100000));
    setL1(String(data.team.layer1_clients));
    setL2(String(data.team.layer2_clients));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (loading && !data) return <Spinner />;
  if (error || !data) return <ErrorBox text={error || "Нет данных"} onRetry={reload} />;

  const tariff = data.tariffs.find((t) => t.code === tariffCode) ?? data.tariffs[0];
  const goalKop = Math.round(num(goal) * 100);
  const pace = Math.floor(num(perMonth));
  const r = calcGoal({
    splitRates: data.split_rates,
    dealType,
    depth: data.depth,
    hasInviter: me.profile.has_inviter,
    monthlyPriceKop: tariff?.monthly_kop ?? 0,
    goalKop,
    layer1Clients: Math.floor(num(l1)),
    layer2Clients: Math.floor(num(l2)),
    payingClients: data.paying_clients,
    newPerMonth: pace,
  });

  // Today's monthly income as the calculator sees it (own paying clients + team), never below the real one.
  const nowKop = Math.max(data.monthly_income_kop, r.teamKop + data.paying_clients * r.perClientKop);
  const reached = goalKop > 0 && nowKop >= goalKop;
  const capGoal = depositForRub(goalKop / 100);
  const capNow = depositForRub(Math.min(nowKop, goalKop) / 100);
  const capPerClient = depositForRub(r.perClientKop / 100);
  const capPct = capGoal > 0 ? Math.min(100, (capNow / capGoal) * 100) : 0;
  const horizon = Math.min(60, r.months !== null ? Math.max(r.months + 3, 6) : 12);
  const series = incomeProjection(nowKop, r.perClientKop, pace, goalKop, horizon);
  const dots = Math.min(r.neededClients, 60);

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      setMe(await api.partnerUpdateMe({ goal_kop: goalKop }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setSaveError((e as { detail?: string })?.detail || "Не удалось сохранить цель");
    } finally {
      setSaving(false);
    }
  };

  const isCurrentGoal = (me.profile.goal_kop ?? 0) === goalKop && goalKop > 0;
  const rate = `${(DEPOSIT.rate * 100).toLocaleString("ru-RU")}%`;

  return (
    <div className="space-y-4">
      <PageTitle hint="Каждый приведённый клиент - кирпичик вашего капитала, который приносит деньги каждый месяц.">Моя цель</PageTitle>

      <Card className="grid sm:grid-cols-2 gap-4">
        <Field label="Желаемый доход в месяц" value={goal} onChange={setGoal} suffix="₽" />
        <label className="block">
          <Label>Тариф клиента</Label>
          <select value={tariff?.code ?? ""} onChange={(e) => setTariffCode(e.target.value)} className={inputCls}>
            {data.tariffs.map((t) => (
              <option key={t.code} value={t.code}>
                {t.name}, {formatRub(t.monthly_kop)} в месяц
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <Label>Как вы работаете</Label>
          <select value={dealType} onChange={(e) => setDealType(e.target.value as PartnerDealType)} className={inputCls}>
            {(["rep", "manager"] as const).map((d) => (
              <option key={d} value={d}>
                {DEAL_TYPE_LABELS[d]}
              </option>
            ))}
          </select>
        </label>
        <Field label="Новых клиентов в месяц" value={perMonth} onChange={setPerMonth} />
        {me.is_agency && (
          <>
            <Field label="Клиентов у ваших партнёров" value={l1} onChange={setL1} />
            <Field label="Клиентов у партнёров ваших партнёров" value={l2} onChange={setL2} />
          </>
        )}
      </Card>

      {/* Hero: the goal as an invisible capital */}
      <section
        className="relative overflow-hidden rounded-2xl p-5 sm:p-6 text-white"
        style={{ background: "linear-gradient(135deg, var(--pp-hero-from) 0%, var(--pp-hero-to) 100%)" }}
      >
        <div className="relative z-10 sm:max-w-[62%]">
          <span className="pp-head inline-block rounded-full bg-white/15 px-3 py-1 text-[10px]">Ваш невидимый капитал</span>
          <p className="mt-4 text-sm text-white/85">Цель равна вкладу в банке на сумму</p>
          <p className="pp-num mt-1 text-4xl sm:text-5xl font-extrabold leading-none">{goalKop > 0 ? mln(capGoal) : "-"}</p>
          <p className="mt-3 text-sm text-white/85 leading-relaxed">
            Столько нужно положить в банк под среднюю ставку, чтобы получать <b className="text-white">{formatRub(goalKop)}</b> в месяц после налога. Вам не нужно вкладывать ни рубля: капитал складывается из клиентов.
          </p>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${capPct}%`, background: "linear-gradient(90deg, #7fe0b4, #ffffff)" }} />
          </div>
          <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[11px] text-white/85">
            <span>
              Ваш доход сейчас - как с вклада <b className="text-white pp-num">{mln(capNow)}</b>
            </span>
            {r.perClientKop > 0 && (
              <span>
                1 клиент - как вклад <b className="text-white pp-num">{mln(capPerClient)}</b>
              </span>
            )}
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/partner/vera-money.webp"
          alt="Вера с деньгами"
          className="pointer-events-none absolute -bottom-6 right-0 hidden h-[118%] w-auto object-contain sm:block"
          style={{ maskImage: "linear-gradient(to left, black 70%, transparent)", WebkitMaskImage: "linear-gradient(to left, black 70%, transparent)" }}
        />
      </section>

      {/* Bank deposit vs partnership */}
      <Card>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] items-stretch">
          <div className="rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)] p-4">
            <Label>Банковский вклад</Label>
            <div className="pp-num text-xl sm:text-2xl font-extrabold">положить {goalKop > 0 ? mln(capGoal) : "-"}</div>
            <ul className="mt-2 space-y-1 text-[13px] text-[var(--pp-muted)]">
              <li>Нужно <b className="text-[var(--pp-text)]">положить свои деньги</b></li>
              <li>Ставка <b className="text-[var(--pp-text)]">{rate}</b>, минус НДФЛ</li>
              <li>Ставки снижаются вслед за ключевой</li>
            </ul>
          </div>
          <div className="pp-head self-center justify-self-center text-xs text-[var(--pp-muted)]">VS</div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <Label>Партнёрство Altai Optima</Label>
            <div className="pp-num text-xl sm:text-2xl font-extrabold text-[var(--pp-money)]">
              привести {r.neededClients} {pluralClients(r.neededClients)}
            </div>
            <ul className="mt-2 space-y-1 text-[13px] text-[var(--pp-muted)]">
              <li><b className="text-[var(--pp-text)]">0 ₽</b> вложений</li>
              <li>Вы рекомендуете, Вера работает</li>
              <li>Доход растёт с каждым клиентом</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Numbers and the client dots */}
      <Card>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <Label>С одного клиента в месяц</Label>
            <Money kop={r.perClientKop} className="text-2xl font-extrabold" />
            <div className="text-[11px] text-[var(--pp-muted)]">ваша доля {formatBp(r.sellerBp)}</div>
          </div>
          <div>
            <Label>Нужно клиентов</Label>
            <div className="pp-num text-3xl font-extrabold">{r.neededClients}</div>
            <div className="text-[11px] text-[var(--pp-muted)]">для выхода на цель</div>
          </div>
          <div>
            <Label>Осталось привести</Label>
            <div className="pp-num text-3xl font-extrabold">{r.remainingClients}</div>
            <div className="text-[11px] text-[var(--pp-muted)]">платящих сейчас: {data.paying_clients}</div>
          </div>
          {me.is_agency && (
            <div>
              <Label>От команды в месяц</Label>
              <Money kop={r.teamKop} className="text-2xl font-extrabold" />
            </div>
          )}
        </div>
        {dots > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5" aria-label={`Клиентов уже есть ${data.paying_clients} из ${r.neededClients}`}>
            {Array.from({ length: dots }, (_, i) => (
              <span
                key={i}
                title={`Клиент ${i + 1}`}
                className={`h-5 w-5 rounded-full border ${i < data.paying_clients ? "border-[var(--pp-money)] bg-[var(--pp-money)]" : "border-[var(--pp-line)] bg-[var(--pp-accent-soft)]"}`}
              />
            ))}
            {r.neededClients > dots && <span className="self-center text-[11px] text-[var(--pp-muted)]">и ещё {r.neededClients - dots}</span>}
          </div>
        )}
        <div className="mt-4 rounded-xl bg-[var(--pp-accent-soft)] px-3 py-2.5 text-sm leading-relaxed">
          {r.perClientKop <= 0
            ? "Для выбранных параметров доля не задана. Выберите другой тариф или роль."
            : reached || r.remainingClients === 0
            ? "Нужное число клиентов у вас уже есть. Можно поставить цель выше."
            : r.months === null
            ? "Укажите, сколько новых клиентов в месяц вы планируете."
            : (
              <>
                При {pace} {pace === 1 ? "новом клиенте" : "новых клиентах"} в месяц через <b>{r.months} мес.</b> вы будете получать <b>{formatRub(goalKop)} в месяц</b>. Чтобы получать столько же с банковского вклада, пришлось бы положить в банк <b>{mln(capGoal)}</b> своих денег.
              </>
            )}
        </div>
      </Card>

      {/* Income by month */}
      {goalKop > 0 && r.perClientKop > 0 && (
        <Card>
          <Label>Ваш доход по месяцам</Label>
          <IncomeChart series={series} goalKop={goalKop} goalMonth={r.months} />
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-[var(--pp-muted)]">
            <span className="flex items-center gap-1.5"><i className="inline-block h-0.5 w-4 bg-[var(--pp-money)]" />Доход от партнёрства</span>
            <span className="flex items-center gap-1.5"><i className="inline-block w-4 border-t-2 border-dashed border-[var(--pp-gold)]" />Цель</span>
          </div>
        </Card>
      )}

      {reached && (
        <Card className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/partner/vera-okay.webp" alt="Вера показывает «окей»" className="h-24 w-24 shrink-0 rounded-2xl object-cover object-top" />
          <p className="text-sm">Цель достигнута: ваши клиенты уже приносят {formatRub(nowKop)} в месяц. Поставьте следующую.</p>
        </Card>
      )}

      {saveError && <ErrorBox text={saveError} />}
      <button type="button" onClick={save} disabled={saving || goalKop <= 0 || isCurrentGoal} className={`${btnPrimary} w-full sm:w-auto`}>
        {saved || isCurrentGoal ? "Это ваша цель" : saving ? "Сохраняем..." : "Сделать моей целью"}
      </button>

      <p className="text-[11px] leading-relaxed text-[var(--pp-muted)]">
        Сравнение с вкладом приблизительное. Ставка {rate} - средняя максимальная по 10 крупнейшим банкам по данным Банка России, {DEPOSIT.rateDate}; учтён НДФЛ на проценты. Партнёрский доход начисляется, пока клиенты платят за Веру, и облагается налогом по вашему статусу. Расчёт по ежемесячным ставкам, без выплат за запуск.
      </p>
    </div>
  );
}
