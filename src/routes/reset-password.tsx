import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — NutriPlan" },
      { name: "description", content: "Defina uma nova senha para acessar sua conta NutriPlan." },
      { property: "og:title", content: "Redefinir senha — NutriPlan" },
      { property: "og:description", content: "Crie uma nova senha e volte a acompanhar sua dieta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().min(8, "A senha precisa ter ao menos 8 caracteres").max(72).safeParse(password);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Senha inválida");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Senha atualizada");
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="card-surface w-full max-w-sm space-y-4 p-5">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <KeyRound className="size-6" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Nova senha</h1>
          <p className="text-sm text-muted-foreground">Escolha uma senha com pelo menos 8 caracteres.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-password">Senha</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={72}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          Salvar nova senha
        </Button>
      </form>
    </div>
  );
}
