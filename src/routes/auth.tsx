import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Check, Eye, EyeOff, Loader2, LockKeyhole, Mail, UtensilsCrossed } from "lucide-react";
import authImage from "@/assets/nutriplan-auth.jpg";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar na sua conta — NutriPlan" },
      {
        name: "description",
        content: "Acesse sua conta NutriPlan para sincronizar dieta, peso e registros entre todos os seus aparelhos.",
      },
      { property: "og:title", content: "Entrar na sua conta — NutriPlan" },
      { property: "og:description", content: "Sincronize sua dieta e evolução em qualquer aparelho." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const credentialsSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido").max(255),
  password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres").max(72),
});

const signupPasswordSchema = z
  .string()
  .min(8, "Use pelo menos 8 caracteres")
  .max(72)
  .regex(/[A-Za-zÀ-ÿ]/, "Inclua pelo menos uma letra")
  .regex(/[0-9]/, "Inclua pelo menos um número");

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { session } = useSession();
  const { state, hydrated } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (session && hydrated) navigate({ to: state.onboarded ? "/" : "/comecar", replace: true });
  }, [session, hydrated, state.onboarded, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    if (mode === "signup") {
      const passwordResult = signupPasswordSchema.safeParse(parsed.data.password);
      if (!passwordResult.success) {
        toast.error(passwordResult.error.issues[0]?.message ?? "Senha inválida");
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          toast.success("Conta criada! Confirme o e-mail para entrar.");
          return;
        }
        toast.success("Conta criada com sucesso");
        await navigate({ to: "/comecar", replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
        await navigate({ to: state.onboarded ? "/" : "/comecar", replace: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível continuar";
      toast.error(
        msg.includes("Invalid login credentials")
          ? "E-mail ou senha incorretos"
          : msg.includes("already registered")
            ? "Este e-mail já tem conta. Faça login."
            : msg,
      );
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    const parsed = z.string().email().safeParse(email.trim());
    if (!parsed.success) {
      toast.error("Informe seu e-mail para recuperar a senha");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Enviamos um link de redefinição para seu e-mail");
  };

  return (
    <main className="min-h-screen bg-background lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(440px,0.92fr)]">
      <section className="relative hidden min-h-screen overflow-hidden lg:block" aria-label="Alimentação saudável">
        <img
          src={authImage}
          alt="Refeição equilibrada com frango, arroz, feijão, abacate e vegetais"
          width={1200}
          height={1600}
          className="absolute inset-0 size-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-background/30" />
        <div className="absolute inset-x-0 bottom-0 bg-background/80 px-10 py-10 backdrop-blur-md">
          <p className="max-w-xl text-3xl font-bold leading-tight">Seu plano, seus registros e sua evolução em um só lugar.</p>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
            {["Metas personalizadas", "Sincronização automática", "Evolução clara"].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <Check className="size-4 text-success" /> {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-10 lg:px-14">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-10 inline-flex items-center gap-2.5" aria-label="NutriPlan — início">
            <span className="gradient-primary flex size-10 items-center justify-center rounded-xl text-primary-foreground">
              <UtensilsCrossed className="size-5" />
            </span>
            <span className="text-lg font-bold">NutriPlan</span>
          </Link>

          <header>
            <p className="text-sm font-semibold text-primary">{mode === "login" ? "BEM-VINDO DE VOLTA" : "COMECE POR AQUI"}</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              {mode === "login" ? "Entre na sua conta" : "Crie sua conta grátis"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {mode === "login"
                ? "Acesse seu plano e continue de onde parou em qualquer aparelho."
                : "Primeiro criamos seu acesso. Depois você informa nome, peso e objetivo para montar o plano."}
            </p>
          </header>

          <div className="mt-7 grid grid-cols-2 rounded-lg bg-surface-2 p-1" aria-label="Escolha entre entrar ou criar conta">
            <Button
              type="button"
              variant={mode === "login" ? "secondary" : "ghost"}
              className="h-10 shadow-none"
              onClick={() => {
                setMode("login");
                setSent(false);
              }}
            >
              Entrar
            </Button>
            <Button
              type="button"
              variant={mode === "signup" ? "secondary" : "ghost"}
              className="h-10 shadow-none"
              onClick={() => {
                setMode("signup");
                setSent(false);
              }}
            >
              Criar conta
            </Button>
          </div>

          {sent ? (
            <div className="mt-6 space-y-5 rounded-lg border border-border bg-surface p-6 text-center">
              <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-success/15 text-success">
                <Mail className="size-5" />
              </span>
              <div>
                <h2 className="font-semibold">Confira seu e-mail</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Enviamos um link de confirmação para <strong className="text-foreground">{email}</strong>.
                </p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
                Voltar para o cadastro
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="h-12 pl-10"
                    maxLength={255}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="password">Senha</Label>
                  {mode === "login" && (
                    <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={reset}>
                      Esqueci minha senha
                    </Button>
                  )}
                </div>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "login" ? "Digite sua senha" : "8 caracteres, com letra e número"}
                    className="h-12 px-10"
                    maxLength={72}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
                {mode === "signup" && <p className="text-xs text-muted-foreground">Números podem se repetir; basta incluir uma letra.</p>}
              </div>

              <Button type="submit" size="lg" className="h-12 w-full" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : mode === "login" ? "Entrar na minha conta" : "Criar conta e continuar"}
                {!loading && <ArrowRight />}
              </Button>
            </form>
          )}

          <div className="my-7 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            ou
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button asChild variant="outline" size="lg" className="h-12 w-full">
            <Link to="/comecar">
              Continuar sem conta <ArrowRight />
            </Link>
          </Button>
          <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
            Sem conta, seus dados ficam somente neste aparelho. Você poderá criar uma conta depois.
          </p>
        </div>
      </section>
    </main>
  );
}
