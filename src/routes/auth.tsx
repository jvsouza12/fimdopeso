import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Utensils, Loader2 } from "lucide-react";

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

const schema = z.object({
  email: z.string().trim().email("Informe um e-mail válido").max(255),
  password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres").max(72),
  name: z.string().trim().max(60).optional(),
});

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { session } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) navigate({ to: "/", replace: true });
  }, [session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password, name });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: parsed.data.name || null },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          toast.success("Conta criada! Confirme o e-mail para entrar.");
          return;
        }
        toast.success("Conta criada com sucesso");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Utensils className="size-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "login" ? "Entrar no NutriPlan" : "Criar sua conta"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Sua dieta, peso e registros sincronizados em todos os aparelhos.
          </p>
        </div>

        {sent ? (
          <div className="card-surface space-y-3 p-5 text-center text-sm">
            <p>
              Enviamos um link de confirmação para <strong>{email}</strong>. Confirme para acessar sua conta.
            </p>
            <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
              Voltar
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="card-surface space-y-4 p-5">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Como quer ser chamado" maxLength={60} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                maxLength={255}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo de 8 caracteres"
                maxLength={72}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              {mode === "login" ? "Entrar" : "Criar conta"}
            </Button>

            {mode === "login" && (
              <button type="button" onClick={reset} className="w-full text-xs text-muted-foreground underline-offset-4 hover:underline">
                Esqueci minha senha
              </button>
            )}
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          {mode === "login" ? "Ainda não tem conta?" : "Já tem uma conta?"}{" "}
          <button
            type="button"
            className="font-medium text-primary underline-offset-4 hover:underline"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Criar conta" : "Entrar"}
          </button>
        </p>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/" className="underline-offset-4 hover:underline">
            Continuar sem conta (dados só neste aparelho)
          </Link>
        </p>
      </div>
    </div>
  );
}
