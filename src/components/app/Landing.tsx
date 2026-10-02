import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Barcode,
  Camera,
  Droplets,
  LineChart,
  Sparkles,
  Timer,
  UtensilsCrossed,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Camera,
    title: "Registre pela foto do prato",
    text: "Fotografe a refeição e receba a estimativa de calorias, proteínas, carboidratos e gorduras.",
  },
  {
    icon: Barcode,
    title: "Código de barras do produto",
    text: "Escaneie a embalagem e traga as informações do rótulo direto para o seu diário.",
  },
  {
    icon: LineChart,
    title: "Evolução real, sem achismo",
    text: "Peso, medidas e gráficos com média semanal — e metas que se ajustam ao seu ritmo.",
  },
  {
    icon: Droplets,
    title: "Água e lembretes",
    text: "Avisos na hora certa para beber água, comer e se pesar, mesmo com o app fechado na aba.",
  },
  {
    icon: Timer,
    title: "Jejum intermitente",
    text: "Cronômetro com metas de 12h a 18h e histórico completo das suas janelas.",
  },
  {
    icon: Sparkles,
    title: "Assistente que conhece você",
    text: "Sugestões de refeições com base nas suas metas, restrições e no que já comeu hoje.",
  },
];

const STEPS = [
  { n: "1", t: "Conte seus dados", d: "Idade, peso, altura, rotina e objetivo em menos de dois minutos." },
  { n: "2", t: "Receba seu plano", d: "Calorias, macros, fibras e água calculados para o seu corpo e prazo." },
  { n: "3", t: "Acompanhe a evolução", d: "Registre o dia a dia e veja o gráfico caminhar até a sua meta." },
];

/** Página pública de entrada — apresenta o produto antes do cadastro. */
export function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <span className="gradient-primary flex size-9 items-center justify-center rounded-xl text-primary-foreground">
            <UtensilsCrossed className="size-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">NutriPlan</span>
        </div>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Entrar</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/auth">Começar grátis</Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pt-10 pb-16 text-center sm:pt-16">
          <p className="mx-auto w-fit rounded-full border border-border bg-surface-2 px-3 py-1 text-xs font-medium text-muted-foreground">
            Dieta, emagrecimento e evolução em um só app
          </p>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">
            Emagreça acompanhando o que <span className="text-primary">realmente</span> muda
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Calorias, macros, fibras, água, jejum, peso e medidas — com metas calculadas para o seu corpo e ajustadas
            conforme sua evolução real.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/auth">
                Montar meu plano grátis <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
              <Link to="/auth">Já tenho conta</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Funciona sem cadastro e offline. Crie a conta só quando quiser sincronizar entre aparelhos.
          </p>

          <dl className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ["2 min", "para montar o plano"],
              ["+1.000", "alimentos e produtos"],
              ["7 telas", "de acompanhamento"],
              ["100%", "offline no aparelho"],
            ].map(([v, l]) => (
              <div key={l} className="card-surface p-4">
                <dt className="text-2xl font-bold tabular-nums text-primary">{v}</dt>
                <dd className="mt-1 text-xs text-muted-foreground">{l}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="border-y border-border bg-surface/50 py-16">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="text-center text-3xl font-bold tracking-tight">Tudo o que você precisa para manter a dieta</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <article key={f.title} className="card-surface p-5">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-surface-2 text-primary">
                    <f.icon className="size-5" />
                  </span>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-4xl px-5">
            <h2 className="text-center text-3xl font-bold tracking-tight">Como funciona</h2>
            <ol className="mt-10 grid gap-4 sm:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n} className="card-surface p-5">
                  <span className="gradient-primary flex size-9 items-center justify-center rounded-xl font-bold text-primary-foreground">
                    {s.n}
                  </span>
                  <h3 className="mt-4 font-semibold">{s.t}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{s.d}</p>
                </li>
              ))}
            </ol>

            <div className="card-surface mt-10 flex flex-col items-center gap-4 p-8 text-center">
              <ShieldCheck className="size-8 text-success" />
              <h2 className="text-2xl font-bold tracking-tight">Seus dados são seus</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Tudo fica salvo no seu aparelho e, se você criar uma conta, sincroniza com segurança para acessar de
                qualquer lugar. Você pode exportar ou apagar tudo quando quiser.
              </p>
              <Button asChild size="lg">
                <Link to="/auth">
                  Começar agora <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-5 text-center">
          <p className="text-sm font-semibold">NutriPlan</p>
          <p className="max-w-lg text-xs text-muted-foreground">
            As estimativas do app são referências educativas e não substituem a avaliação de nutricionista ou médico.
          </p>
        </div>
      </footer>
    </div>
  );
}
