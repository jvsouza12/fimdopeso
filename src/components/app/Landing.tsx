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
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import painelShot from "@/assets/landing-painel.webp.asset.json";
import jejumShot from "@/assets/landing-jejum.webp.asset.json";
import projecaoShot from "@/assets/landing-projecao.webp.asset.json";

const SHOWCASE = [
  {
    icon: UtensilsCrossed,
    title: "Seu dia inteiro em uma tela",
    text: "Calorias, proteínas, carboidratos e gorduras com metas feitas para o seu corpo — e quanto ainda falta comer hoje.",
    points: ["Fibras, açúcar e sódio sob controle", "Água, peso e jejum no mesmo lugar", "Refeições organizadas por horário"],
    img: painelShot.url,
    alt: "Painel com anel de calorias e barras de macros",
  },
  {
    icon: Timer,
    title: "Saiba o que acontece no seu jejum",
    text: "O cronômetro mostra em qual estágio você está — da digestão à queima de gordura e cetose — e quanto falta para o próximo.",
    points: ["8 estágios explicados em linguagem simples", "Metas de 12 a 24 horas", "Histórico de todos os jejuns"],
    img: jejumShot.url,
    alt: "Tela de jejum com cronômetro em 14 horas no estágio de queima de gordura",
  },
  {
    icon: LineChart,
    title: "Descubra quando vai chegar na meta",
    text: "Com base nas suas pesagens, o app calcula seu ritmo e mostra quanto você deve pesar em qualquer data futura.",
    points: ["Ritmo semanal real", "Data estimada para a meta", "Gráfico do histórico e da projeção"],
    img: projecaoShot.url,
    alt: "Gráfico de projeção de peso com linha tracejada até a meta",
  },
];

function ScreenFrame({ src, alt, priority }: { src: string; alt: string; priority?: boolean }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5" aria-hidden>
        <span className="size-2.5 rounded-full bg-muted" />
        <span className="size-2.5 rounded-full bg-muted" />
        <span className="size-2.5 rounded-full bg-muted" />
      </div>
      <img
        src={src}
        alt={alt}
        className="block w-full"
        width={1300}
        height={1000}
        loading={priority ? "eager" : "lazy"}
      />
    </figure>
  );
}


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

          <div className="relative mx-auto mt-14 max-w-5xl">
            <div className="absolute -inset-x-10 -top-10 bottom-10 -z-10 rounded-[3rem] bg-primary/20 blur-3xl" aria-hidden />
            <ScreenFrame src={painelShot.url} alt="Painel do NutriPlan com calorias, macros, água, peso e jejum do dia" priority />
          </div>

          <dl className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ["2 min", "para montar o plano"],
              ["+1.000", "alimentos e produtos"],
              ["8 estágios", "de jejum explicados"],
              ["100%", "dos dados com você"],
            ].map(([v, l]) => (
              <div key={l} className="card-surface p-4">
                <dt className="text-2xl font-bold tabular-nums text-primary">{v}</dt>
                <dd className="mt-1 text-xs text-muted-foreground">{l}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-6xl space-y-20 px-5">
            <div className="text-center">
              <p className="text-xs font-semibold tracking-widest text-primary uppercase">Veja por dentro</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">Telas reais do app, sem maquiagem</h2>
            </div>
            {SHOWCASE.map((s, i) => (
              <div key={s.title} className="grid items-center gap-8 lg:grid-cols-5 lg:gap-12">
                <div className={i % 2 ? "lg:order-2 lg:col-span-2" : "lg:col-span-2"}>
                  <span className="flex size-10 items-center justify-center rounded-xl bg-surface-2 text-primary">
                    <s.icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-2xl font-bold tracking-tight">{s.title}</h3>
                  <p className="mt-3 text-muted-foreground">{s.text}</p>
                  <ul className="mt-5 space-y-2 text-sm">
                    {s.points.map((p) => (
                      <li key={p} className="flex gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={i % 2 ? "lg:order-1 lg:col-span-3" : "lg:col-span-3"}>
                  <ScreenFrame src={s.img} alt={s.alt} />
                </div>
              </div>
            ))}
          </div>
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
