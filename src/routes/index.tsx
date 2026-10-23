import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Lock, Play, Swords, Trophy } from "lucide-react";
import hero from "@/assets/hero-arena.jpg";
import { Page } from "@/components/site";
import { mockRanking, NEWS } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MU Legacy Arena — Portal da Comunidade (Demo)" },
      { name: "description", content: "Portal demonstrativo de um MMORPG clássico original: notícias, rankings PvP, editor de itens e mercado simulado." },
      { property: "og:title", content: "MU Legacy Arena — Portal da Comunidade" },
      { property: "og:description", content: "Protótipo navegável em modo demonstração. Sem pagamentos, sem integração com o jogo." },
    ],
  }),
  component: Index,
});

function Index() {
  const top = mockRanking("semanal").slice(0, 5);
  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <img src={hero} alt="Arena sombria com cavaleiro e feiticeiro" width={1920} height={912} className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6 py-28 md:py-36">
          <span className="chip border-violet text-violet">STATUS: PROTÓTIPO DEMO</span>
          <h1 className="mt-5 max-w-3xl text-5xl font-extrabold leading-tight text-gold-gradient md:text-6xl">A arena clássica renasce.</h1>
          <p className="mt-4 max-w-xl text-muted-foreground">Comunidade, PvP balanceado e itens até +15 — um portal original para reviver a experiência social de 2017.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/jogador" className="btn btn-gold"><Swords className="h-4 w-4" />Entrar no painel demo</Link>
            <Link to="/rankings" className="btn btn-ghost"><Trophy className="h-4 w-4" />Ver rankings</Link>
          </div>
        </div>
      </section>
      <Page>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="panel lg:col-span-2 overflow-hidden">
            <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-muted/40">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary text-primary"><Play className="h-7 w-7" /></div>
              <p className="font-display text-lg">Trailer em produção</p>
              <p className="text-xs text-muted-foreground">Espaço reservado — nenhum vídeo publicado ainda</p>
            </div>
          </div>
          <div className="panel p-5">
            <h2 className="text-lg font-bold">Top 5 semanal <span className="chip ml-2 text-muted-foreground">mock</span></h2>
            <ol className="mt-4 space-y-2">
              {top.map((r) => (
                <li key={r.name} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                  <span><span className="mr-2 font-display text-gold">{r.pos}</span>{r.name} <span className="text-xs text-muted-foreground">{r.cls}</span></span>
                  <span className="font-semibold">{r.points}</span>
                </li>
              ))}
            </ol>
            <Link to="/rankings" className="btn btn-ghost mt-4 w-full">Ranking completo</Link>
          </div>
        </div>

        <h2 className="mt-14 text-2xl font-bold">Notícias</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {NEWS.map((n) => (
            <article key={n.title} className="panel p-5">
              <div className="flex justify-between text-xs"><span className="chip text-violet">{n.tag}</span><span className="text-muted-foreground">{n.date}</span></div>
              <h3 className="mt-3 text-lg font-semibold">{n.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{n.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <div className="panel p-6">
            <h2 className="text-xl font-bold">Downloads</h2>
            <p className="mt-2 text-sm text-muted-foreground">O cliente de jogo ainda não está disponível. Downloads desativados nesta fase.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button disabled className="btn btn-gold"><Download className="h-4 w-4" />Cliente completo</button>
              <button disabled className="btn btn-ghost"><Lock className="h-4 w-4" />Patch</button>
            </div>
            <p className="mt-3 text-xs text-warning">Desativado — protótipo sem cliente distribuído.</p>
          </div>
          <div className="panel p-6">
            <h2 className="text-xl font-bold">Explore o portal</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Link to="/editor" className="btn btn-ghost">Editor de itens</Link>
              <Link to="/premios" className="btn btn-ghost">Prêmios</Link>
              <Link to="/mercado" className="btn btn-ghost">Mercado TradePay</Link>
              <Link to="/regras" className="btn btn-ghost">Regras & FAQ</Link>
            </div>
          </div>
        </div>
      </Page>
    </>
  );
}