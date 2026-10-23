import { Link } from "@tanstack/react-router";
import { Lock, ShieldAlert, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { hasTransparentAppearance, isPremiumLevel, SLOT_LABEL } from "@/lib/game-rules";
import type { DemoItem } from "@/lib/mock-data";

const NAV = [
  { to: "/", label: "Início" },
  { to: "/jogador", label: "Jogador" },
  { to: "/editor", label: "Editor" },
  { to: "/rankings", label: "Rankings" },
  { to: "/premios", label: "Prêmios" },
  { to: "/mercado", label: "Mercado" },
  { to: "/carteira", label: "Carteira" },
  { to: "/admin", label: "Admin" },
  { to: "/regras", label: "Regras" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="bg-accent/20 py-1 text-center text-xs font-semibold text-accent-foreground">
        <ShieldAlert className="mr-1 inline h-3 w-3" /> MODO DEMONSTRAÇÃO — sem integração com o jogo, sem pagamentos, dados fictícios
      </div>
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
        <Link to="/" className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-gold" />
          <span className="font-display text-lg font-bold text-gold-gradient">MU Legacy Arena</span>
        </Link>
        <nav className="flex flex-1 flex-wrap gap-1 text-sm">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" }}
              className="rounded-md px-3 py-1.5 text-muted-foreground transition hover:text-foreground"
              activeProps={{ className: "bg-secondary text-primary" }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <span className="chip text-gold">DEMO</span>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border py-8 text-center text-xs text-muted-foreground">
      MU Legacy Arena — projeto original de comunidade. Protótipo sem afiliação, sem assets proprietários, sem cobrança.
      Economias e recompensas exibidas não são reais.
    </footer>
  );
}

export function PageHeader({ eyebrow, title, desc, children }: { eyebrow: string; title: string; desc?: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold text-gold-gradient md:text-4xl">{title}</h1>
        {desc && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>;
}

export function LevelBadge({ level }: { level: number }) {
  const premium = isPremiumLevel(level);
  return (
    <span className={`chip ${premium ? "border-violet text-violet" : level >= 9 ? "text-gold" : "text-muted-foreground"}`}>
      {premium && <Lock className="h-3 w-3" />}+{level}
    </span>
  );
}

export function ItemCard({ item, selected, onClick }: { item: DemoItem; selected?: boolean; onClick?: () => void }) {
  const lvl = item.options.level;
  const transparent = hasTransparentAppearance(lvl);
  return (
    <button type="button" onClick={onClick}
      className={`panel w-full p-3 text-left transition hover:border-primary ${selected ? "border-primary shadow-[var(--shadow-glow)]" : ""} ${transparent ? "opacity-90" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm font-semibold ${item.options.excellent.length ? "text-excellent" : ""}`}>{item.name}</span>
        <LevelBadge level={lvl} />
      </div>
      <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
        <span>{SLOT_LABEL[item.slot]}</span>
        {item.options.luck && <span>· Luck</span>}
        {item.options.skill && <span>· Skill</span>}
        {item.options.additional > 0 && <span>· Add +{item.options.additional}</span>}
        {item.options.excellent.length > 0 && <span>· EXC×{item.options.excellent.length}</span>}
        {item.reserved && <span className="text-warning">· reservado</span>}
      </div>
    </button>
  );
}