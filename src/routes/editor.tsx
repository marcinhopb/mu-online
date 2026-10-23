import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Eye, Lock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ItemCard, LevelBadge, Page, PageHeader } from "@/components/site";
import { demo, useDemo } from "@/lib/demo-store";
import {
  hasTransparentAppearance, isPremiumLevel, MAX_EDITOR_LEVEL, relativePower, SLOT_LABEL, validateEdit, WHITELIST, type ItemOptions,
} from "@/lib/game-rules";

export const Route = createFileRoute("/editor")({
  head: () => ({
    meta: [
      { title: "Editor de Itens — MU Legacy Arena (Demo)" },
      { name: "description", content: "Ajuste itens de +0 a +11 com Luck, Skill, Additional e Excellent conforme a whitelist. Salvamento apenas local." },
      { property: "og:title", content: "Editor de Itens — MU Legacy Arena" },
      { property: "og:description", content: "+0 a +11 editável; +12 a +15 bloqueados (eventos oficiais ou Donate)." },
    ],
  }),
  component: Editor,
});

function Editor() {
  const { items } = useDemo();
  const [serial, setSerial] = useState(items[0]?.serial);
  const item = items.find((i) => i.serial === serial);
  const [draft, setDraft] = useState<ItemOptions | null>(null);
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (item) setDraft({ ...item.options, level: Math.min(item.options.level, MAX_EDITOR_LEVEL) });
    setPreview(false); setSaved(false);
  }, [serial]); // eslint-disable-line react-hooks/exhaustive-deps

  const lockedItem = item ? isPremiumLevel(item.options.level) : false;
  const w = item ? WHITELIST[item.slot] : null;
  const errors = useMemo(() => (item && draft ? validateEdit(item.slot, draft) : []), [item, draft]);
  if (!item || !draft || !w) return null;
  const upd = (p: Partial<ItemOptions>) => { setDraft({ ...draft, ...p }); setPreview(false); setSaved(false); };

  return (
    <Page>
      <PageHeader eyebrow="Ferramenta" title="Editor visual de itens" desc="Edite apenas no estado DEMO do navegador. Nenhuma alteração é enviada a servidor ou banco de dados." />
      <div className="grid gap-6 lg:grid-cols-[300px_1fr_340px]">
        <div className="panel max-h-[720px] space-y-2 overflow-auto p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Selecione um item</p>
          {items.map((i) => <ItemCard key={i.serial} item={i} selected={i.serial === serial} onClick={() => setSerial(i.serial)} />)}
        </div>

        <div className="panel p-6">
          <div className="flex items-center justify-between">
            <div><h2 className="text-xl font-bold">{item.name}</h2><p className="text-xs text-muted-foreground">{SLOT_LABEL[item.slot]} · serial {item.serial}</p></div>
            <LevelBadge level={item.options.level} />
          </div>

          {lockedItem ? (
            <div className="mt-6 rounded-lg border border-violet bg-accent/10 p-5 text-sm">
              <p className="flex items-center gap-2 font-semibold text-violet"><Lock className="h-4 w-4" />Item premium +{item.options.level} — LOCKED</p>
              <p className="mt-2 text-muted-foreground">Itens +12 a +15 são obtidos somente por eventos oficiais ou Donate e não podem ser editados pelo jogador.</p>
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              <div>
                <label className="text-sm font-semibold">Nível do item</label>
                <input type="range" min={0} max={15} value={draft.level}
                  onChange={(e) => upd({ level: Math.min(Number(e.target.value), MAX_EDITOR_LEVEL) })}
                  className="mt-3 w-full accent-[var(--gold)]" />
                <div className="mt-1 grid grid-cols-16 text-[10px]" style={{ gridTemplateColumns: "repeat(16, 1fr)" }}>
                  {Array.from({ length: 16 }).map((_, l) => (
                    <span key={l} className={`text-center ${l > MAX_EDITOR_LEVEL ? "text-locked" : l === draft.level ? "text-gold font-bold" : "text-muted-foreground"}`}>
                      {l > MAX_EDITOR_LEVEL ? "🔒" : `+${l}`}
                    </span>
                  ))}
                </div>
                <select className="field mt-3" value={draft.level} onChange={(e) => upd({ level: Number(e.target.value) })}>
                  {Array.from({ length: 16 }).map((_, l) => (
                    <option key={l} value={l} disabled={l > MAX_EDITOR_LEVEL}>+{l}{l > MAX_EDITOR_LEVEL ? " — LOCKED (eventos/Donate)" : ""}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(["luck", "skill"] as const).map((k) => (
                  <label key={k} className={`panel flex items-center gap-3 p-3 text-sm ${!w[k] ? "opacity-40" : "cursor-pointer"}`}>
                    <input type="checkbox" disabled={!w[k]} checked={draft[k]} onChange={(e) => upd({ [k]: e.target.checked })} />
                    {k === "luck" ? "Luck" : "Skill"} {!w[k] && <span className="text-xs text-muted-foreground">(não permitido)</span>}
                  </label>
                ))}
              </div>

              <div>
                <label className="text-sm font-semibold">Additional</label>
                <select className="field mt-2" disabled={!w.additional} value={draft.additional} onChange={(e) => upd({ additional: Number(e.target.value) })}>
                  {[0, 4, 8, 12, 16].map((v) => <option key={v} value={v}>+{v}</option>)}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">Excellent</label>
                  {w.excellent.length > 0 && (
                    <button className="text-xs text-gold" onClick={() => upd({ excellent: draft.excellent.length === w.excellent.length ? [] : [...w.excellent] })}>
                      {draft.excellent.length === w.excellent.length ? "Limpar" : "Marcar ALL"}
                    </button>
                  )}
                </div>
                {w.excellent.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">Este tipo não possui opções Excellent na whitelist.</p> : (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {w.excellent.map((e) => (
                      <label key={e} className="flex cursor-pointer items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs">
                        <input type="checkbox" checked={draft.excellent.includes(e)}
                          onChange={(ev) => upd({ excellent: ev.target.checked ? [...draft.excellent, e] : draft.excellent.filter((x) => x !== e) })} />
                        <span className="text-excellent">{e}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {errors.length > 0 && (
                <ul className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
                  {errors.map((e) => <li key={e}>{e}</li>)}
                </ul>
              )}

              <div className="flex gap-3">
                <button className="btn btn-ghost" onClick={() => setPreview(true)} disabled={errors.length > 0}><Eye className="h-4 w-4" />Gerar prévia</button>
                <button className="btn btn-gold" disabled={!preview || errors.length > 0 || saved}
                  onClick={() => { demo.saveItem(item.serial, draft); setSaved(true); }}>Confirmar (DEMO local)</button>
              </div>
              {saved && <p className="flex items-center gap-2 text-sm text-excellent"><CheckCircle2 className="h-4 w-4" />Salvo apenas no estado DEMO do navegador. Nenhum SQL foi executado.</p>}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className={`panel p-5 ${preview ? "border-primary" : ""}`}>
            <h3 className="font-bold">Prévia</h3>
            {!preview ? <p className="mt-2 text-xs text-muted-foreground">Clique em "Gerar prévia" para comparar antes de confirmar.</p> : (
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                {[["Atual", item.options], ["Novo", draft]].map(([lbl, op]) => {
                  const opts = op as ItemOptions;
                  return (
                    <div key={lbl as string} className="rounded-md bg-muted/50 p-3">
                      <p className="text-muted-foreground">{lbl as string}</p>
                      <p className="mt-1 font-display text-2xl text-gold">+{opts.level}</p>
                      <p>Luck: {opts.luck ? "sim" : "não"}</p>
                      <p>Skill: {opts.skill ? "sim" : "não"}</p>
                      <p>Add: +{opts.additional}</p>
                      <p className="text-excellent">EXC: {opts.excellent.length}</p>
                      <p className="mt-2">Força rel.: <b>{relativePower(opts.level)}</b></p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="panel p-5 text-xs text-muted-foreground">
            <p className="flex items-center gap-2 font-semibold text-warning"><AlertTriangle className="h-4 w-4" />Regras</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Editor: +0 a +{MAX_EDITOR_LEVEL}. Limite será aplicado no servidor futuramente.</li>
              <li>+12 a +15: somente eventos oficiais ou Donate.</li>
              <li>Aparência transparente: apenas +12 a +15 {hasTransparentAppearance(draft.level) ? "(ativa)" : ""}.</li>
              <li>Força relativa é meta de teste configurável, não balanceamento comprovado.</li>
            </ul>
            <Link to="/regras" className="mt-3 inline-block text-gold">Ver central de regras →</Link>
          </div>
        </div>
      </div>
    </Page>
  );
}