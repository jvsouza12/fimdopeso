import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — CasalPlan" },
      { name: "description", content: "Defina uma nova senha para acessar sua conta CasalPlan." },
      { property: "og:title", content: "Redefinir senha — CasalPlan" },
      { property: "og:description", content: "Crie uma nova senha e volte a acompanhar sua dieta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

const passwordSchema = z.string()
  .min(8, "Use pelo menos 8 caracteres")
  .max(72, "Use no máximo 72 caracteres")
  .regex(/[A-Za-zÀ-ÿ]/, "Inclua pelo menos uma letra")
  .regex(/[0-9]/, "Inclua pelo menos um número");

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const { session, loading: sessionLoading } = useSession();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || sessionLoading) return;
    if (!session) {
      toast.error("Abra o link de recuperação enviado ao seu e-mail ou solicite um novo link.");
      return;
    }
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Senha inválida");
      return;
    }
    if (password !== confirmation) {
      toast.error("As senhas não coincidem");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: parsed.data });
      if (error) throw error;
      toast.success("Senha atualizada");
      await navigate({ to: "/", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground">
      <div className="card-surface w-full max-w-sm space-y-4 p-5">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <KeyRound className="size-6" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Nova senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">Use pelo menos 8 caracteres, incluindo uma letra e um número.</p>
        </div>
        {sessionLoading ? (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Verificando seu acesso…
          </p>
        ) : !session ? (
          <div role="status" className="space-y-4 rounded-xl bg-surface-2 p-4">
            <p className="text-sm text-muted-foreground">Não há uma sessão válida para redefinir a senha. Abra o link enviado ao seu e-mail. Se ele expirou, solicite outro em “Esqueci minha senha”.</p>
            <Button asChild className="w-full"><Link to="/auth">Voltar para entrar</Link></Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" aria-busy={loading}>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Senha</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                maxLength={72}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirme a senha</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                minLength={8}
                maxLength={72}
                disabled={loading}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Salvar nova senha
            </Button>
          </form>
        )}
        <Button asChild variant="ghost" className="w-full"><Link to="/">Voltar ao início</Link></Button>
      </div>
    </div>
  );
}
