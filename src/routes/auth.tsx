import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useSession } from "@/hooks/useSession";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  TrendingUp,
  UtensilsCrossed,
  WifiOff,
} from "lucide-react";
import authImage from "@/assets/nutriplan-auth.jpg";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar na sua conta — CasalPlan" },
      {
        name: "description",
        content: "Acesse sua conta CasalPlan para sincronizar dieta, peso e registros entre todos os seus aparelhos.",
      },
      { property: "og:title", content: "Entrar na sua conta — CasalPlan" },
      { property: "og:description", content: "Sincronize sua dieta e evolução em qualquer aparelho." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido").max(255),
  password: z.string().min(1, "Digite sua senha").max(72),
});

const signupSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido").max(255),
  password: z
    .string()
    .min(8, "Use pelo menos 8 caracteres")
    .max(72, "Use no máximo 72 caracteres")
    .regex(/[A-Za-zÀ-ÿ]/, "Inclua pelo menos uma letra")
    .regex(/[0-9]/, "Inclua pelo menos um número"),
});

/** Traduz as mensagens do serviço de contas para algo que a pessoa entende. */
function friendlyError(raw: string): { text: string; description?: string; needsConfirmation?: boolean } {
  const message = raw.toLowerCase();
  if (message.includes("invalid login credentials")) {
    return { text: "E-mail ou senha incorretos", description: "Confira os dados ou use “Esqueci minha senha”." };
  }
  if (message.includes("email not confirmed")) {
    return { text: "Confirme seu e-mail para entrar", needsConfirmation: true };
  }
  if (
    message.includes("already registered") ||
    message.includes("user already exists") ||
    message.includes("email address is already")
  ) {
    return { text: "Este e-mail já tem conta", description: "Use “Entrar” ou recupere a senha." };
  }
  if (message.includes("rate limit") || message.includes("too many") || message.includes("security purposes")) {
    return { text: "Muitas tentativas em pouco tempo", description: "Aguarde alguns segundos e tente novamente." };
  }
  if (message.includes("password should") || message.includes("weak password") || message.includes("password is too weak")) {
    return { text: "Escolha uma senha mais forte", description: "Use pelo menos 8 caracteres, com letras e números." };
  }
  if (message.includes("invalid email") || message.includes("unable to validate email")) {
    return { text: "Informe um e-mail válido" };
  }
  if (message.includes("failed to fetch") || message.includes("networkerror") || message.includes("network error")) {
    return { text: "Sem conexão com o servidor", description: "Verifique sua internet e tente novamente." };
  }
  return { text: raw };
}

const STRENGTH_STYLES = [
  { label: "Muito fraca", bar: "bg-destructive", text: "text-destructive" },
  { label: "Fraca", bar: "bg-destructive", text: "text-destructive" },
  { label: "Razoável", bar: "bg-warning", text: "text-warning" },
  { label: "Boa", bar: "bg-primary", text: "text-primary" },
  { label: "Forte", bar: "bg-success", text: "text-success" },
];

/** Medidor simples de força da senha, usado só como orientação visual. */
function measurePassword(password: string) {
  if (!password) return { score: 0, ...STRENGTH_STYLES[0] };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Za-zÀ-ÿ]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score += 1;
  return { score, ...STRENGTH_STYLES[score] };
}

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentReason, setSentReason] = useState<"created" | "confirm">("created");
  const [resending, setResending] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const { session } = useSession();
  const { hydrated } = useStore();
  const navigate = useNavigate();
  const strength = useMemo(() => measurePassword(password), [password]);

  // Quem já está logado não fica preso na tela de entrada.
  useEffect(() => {
    if (session && hydrated) void navigate({ to: "/", replace: true });
  }, [session, hydrated, navigate]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;

    if (mode === "signup") {
      const parsed = signupSchema.safeParse({ email, password });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
        return;
      }
      if (password !== confirmation) {
        toast.error("As duas senhas precisam ser iguais");
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;

        if (!data.session) {
          // Sem sessão: ou falta confirmar o e-mail, ou o e-mail já existia.
          const alreadyRegistered = (data.user?.identities?.length ?? 0) === 0;
          setSentReason(alreadyRegistered ? "confirm" : "created");
          setSent(true);
          if (alreadyRegistered) {
            toast.info("Este e-mail já tem conta", {
              description: "Tente entrar ou usar “Esqueci minha senha”.",
            });
          } else {
            toast.success("Conta criada! Confirme o e-mail para entrar.");
          }
          return;
        }

        setPassword("");
        setConfirmation("");
        toast.success("Conta criada com sucesso");
        await navigate({ to: "/", replace: true });
      } catch (err) {
        const raw = err instanceof Error ? err.message : "Não foi possível continuar";
        const info = friendlyError(raw);
        if (info.needsConfirmation) {
          setSentReason("confirm");
          setSent(true);
        }
        toast.error(info.text, info.description ? { description: info.description } : undefined);
      } finally {
        setLoading(false);
      }
      return;
    }

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (error) throw error;
      toast.success("Bem-vindo de volta!");
      await navigate({ to: "/", replace: true });
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Não foi possível continuar";
      const info = friendlyError(raw);
      if (info.needsConfirmation) {
        setSentReason("confirm");
        setSent(true);
      }
      toast.error(info.text, info.description ? { description: info.description } : undefined);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (resending || resendIn > 0) return;
    const parsed = z.string().trim().email().safeParse(email);
    if (!parsed.success) {
      toast.error("Informe o e-mail usado no cadastro");
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: parsed.data,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
      toast.success("Enviamos um novo link de confirmação");
      setResendIn(60);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Não foi possível reenviar agora";
      toast.error(friendlyError(raw).text);
    } finally {
      setResending(false);
    }
  };

  const reset = async () => {
    const parsed = z.string().trim().email().safeParse(email);
    if (!parsed.success) {
      toast.error("Informe seu e-mail para recuperar a senha");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(friendlyError(error.message).text);
    else toast.success("Enviamos um link de redefinição para seu e-mail");
  };

  const signInWithGoogle = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Não foi possível entrar com o Google. Tente novamente.");
        return;
      }
      if (result.redirected) return;
      toast.success("Bem-vindo!");
    } catch {
      toast.error("Não foi possível entrar com o Google. Tente novamente.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Painel de apresentação */}
      <section className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-14">
        <img
          src={authImage}
          alt="Refeição equilibrada com frango, arroz, feijão, abacate e vegetais"
          width={1200}
          height={1600}
          className="absolute inset-0 size-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/40" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,var(--primary),transparent_55%)] opacity-15" />

        <div className="relative z-10 flex items-center gap-2.5">
          <span className="gradient-primary flex size-10 items-center justify-center rounded-xl text-primary-foreground shadow-lg">
            <UtensilsCrossed className="size-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">CasalPlan</span>
        </div>

        <div className="relative z-10 max-w-lg">
          <p className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <ShieldCheck className="size-3.5 text-success" /> Conta protegida e dados sincronizados
          </p>
          <h2 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight">
            Sua dieta, sua evolução e seus registros em um só lugar.
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Entre para continuar de onde parou e manter tudo sincronizado entre celular e computador.
          </p>

          <ul className="mt-8 space-y-4">
            {[
              {
                icon: TrendingUp,
                title: "Evolução que faz sentido",
                text: "Peso, medidas e médias semanais em gráficos fáceis de ler.",
              },
              {
                icon: UtensilsCrossed,
                title: "Plano sob medida",
                text: "Calorias, macros e água calculados para o seu corpo.",
              },
              {
                icon: WifiOff,
                title: "Funciona sem internet",
                text: "Registre refeições e caminhadas mesmo offline.",
              },
            ].map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface/80 text-primary ring-1 ring-border/60 backdrop-blur">
                  <item.icon className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 flex items-center gap-3 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-success" />
          Suas informações são privadas. Você pode exportar ou apagar tudo quando quiser.
        </div>
      </section>

      {/* Formulário */}
      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10 lg:px-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2.5 lg:hidden" aria-label="CasalPlan — início">
            <span className="gradient-primary flex size-10 items-center justify-center rounded-xl text-primary-foreground">
              <UtensilsCrossed className="size-5" />
            </span>
            <span className="text-lg font-bold tracking-tight">CasalPlan</span>
          </Link>

          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              {mode === "login" ? "Bem-vindo de volta" : "Comece por aqui"}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {mode === "login" ? "Entre na sua conta" : "Crie sua conta grátis"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {mode === "login"
                ? "Acesse seu plano e continue de onde parou em qualquer aparelho."
                : "Primeiro criamos seu acesso. Depois você informa nome, peso e objetivo para montar o plano."}
            </p>
          </header>

          <div
            className="mt-7 flex rounded-xl border border-border bg-surface-2 p-1"
            role="tablist"
            aria-label="Escolha entre entrar ou criar conta"
          >
            {(["login", "signup"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => {
                  setMode(value);
                  setSent(false);
                  if (value === "login") setConfirmation("");
                }}
                className={cn(
                  "flex-1 cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  mode === value
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {value === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          {sent ? (
            <div className="card-surface mt-6 space-y-5 p-6 text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
                <Mail className="size-5" />
              </span>
              <div>
                <h2 className="font-semibold">
                  {sentReason === "created" ? "Confira seu e-mail" : "Confirme seu e-mail para entrar"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {sentReason === "created" ? (
                    <>
                      Enviamos um link de confirmação para <strong className="text-foreground">{email}</strong>.
                    </>
                  ) : (
                    <>
                      A conta <strong className="text-foreground">{email}</strong> ainda não foi confirmada. Reenvie o link
                      abaixo para receber um novo.
                    </>
                  )}
                </p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  O link vale por alguns minutos. Se não encontrar a mensagem, confira a pasta de spam.
                </p>
              </div>
              <Button className="h-11 w-full rounded-xl" variant="secondary" onClick={resend} disabled={resending || resendIn > 0}>
                {resending ? <Loader2 className="animate-spin" /> : <Mail />}
                {resendIn > 0 ? `Reenviar em ${resendIn}s` : "Reenviar link de confirmação"}
              </Button>
              <Button
                variant="outline"
                className="h-11 w-full rounded-xl"
                onClick={() => {
                  setSent(false);
                  setMode("login");
                }}
              >
                Já confirmei, quero entrar
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-5" aria-busy={loading} noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="h-12 rounded-xl pl-10 text-base md:text-sm"
                    maxLength={255}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="password">Senha</Label>
                  {mode === "login" && (
                    <Button type="button" variant="link" className="h-auto p-0 text-xs font-semibold" onClick={reset}>
                      Esqueci minha senha
                    </Button>
                  )}
                </div>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "login" ? "Digite sua senha" : "8 caracteres, com letra e número"}
                    className="h-12 rounded-xl pl-10 pr-11 text-base md:text-sm"
                    maxLength={72}
                    disabled={loading}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1.5 top-1/2 size-9 -translate-y-1/2 text-muted-foreground hover:bg-transparent hover:text-foreground"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>

                {mode === "signup" && (
                  <div className="pt-1">
                    <div className="flex gap-1.5" aria-hidden="true">
                      {[0, 1, 2, 3].map((index) => (
                        <span
                          key={index}
                          className={cn(
                            "h-1.5 flex-1 rounded-full transition-colors",
                            index < strength.score ? strength.bar : "bg-border",
                          )}
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
                      {password ? (
                        <>
                          Força da senha: <span className={cn("font-semibold", strength.text)}>{strength.label}</span>. Use
                          letras, números e um caractere especial.
                        </>
                      ) : (
                        "Use pelo menos 8 caracteres, incluindo uma letra e um número."
                      )}
                    </p>
                  </div>
                )}
              </div>

              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="password-confirmation">Repita a senha</Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password-confirmation"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value)}
                      placeholder="Digite a mesma senha"
                      className="h-12 rounded-xl pl-10 text-base md:text-sm"
                      maxLength={72}
                      disabled={loading}
                      required
                    />
                  </div>
                  {confirmation.length > 0 && confirmation !== password && (
                    <p className="text-xs text-destructive">As duas senhas ainda não são iguais.</p>
                  )}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="h-12 w-full rounded-xl text-sm font-semibold shadow-lg shadow-primary/20"
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin" /> : mode === "login" ? "Entrar na minha conta" : "Criar conta e continuar"}
                {!loading && <ArrowRight />}
              </Button>
            </form>
          )}

          <div className="my-7 flex items-center gap-3 text-xs font-medium text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            ou continue com
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 w-full gap-3 rounded-xl"
            onClick={signInWithGoogle}
            disabled={googleLoading || loading}
          >
            {googleLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <svg className="size-5" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.6 17.7 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.1 5.4-4.5 7l7.2 5.6c4.2-3.9 6.9-9.7 6.9-17.1z" />
                <path fill="#FBBC05" d="M10.5 28.6a14.5 14.5 0 0 1 0-9.2l-7.9-6.2a24 24 0 0 0 0 21.6l7.9-6.2z" />
                <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.2-5.6c-2 1.4-4.7 2.3-8.7 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.2C6.5 42.6 14.6 48 24 48z" />
              </svg>
            )}
            Continuar com Google
          </Button>

          <Button asChild variant="ghost" size="lg" className="mt-2 h-11 w-full rounded-xl text-muted-foreground">
            <Link to="/comecar">
              Continuar sem conta <ArrowRight />
            </Link>
          </Button>

          <div className="mt-6 space-y-2 border-t border-border pt-5 text-center">
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Check className="size-3.5 text-success" /> Sem conta, seus dados ficam somente neste aparelho.
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              As estimativas do CasalPlan são referências educativas e não substituem nutricionista ou médico.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
