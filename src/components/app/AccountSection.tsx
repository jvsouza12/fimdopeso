import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useSyncStatus } from "@/lib/cloud-sync";
import { Button } from "@/components/ui/button";
import { Cloud, CloudOff, LogIn, LogOut, RefreshCw, Check, AlertTriangle } from "lucide-react";

const STATUS_LABEL: Record<string, { text: string; icon: typeof Cloud }> = {
  offline: { text: "Somente neste aparelho", icon: CloudOff },
  loading: { text: "Carregando seus dados…", icon: RefreshCw },
  saving: { text: "Salvando na nuvem…", icon: RefreshCw },
  synced: { text: "Tudo sincronizado", icon: Check },
  error: { text: "Falha ao sincronizar", icon: AlertTriangle },
};

export function AccountSection() {
  const { session } = useSession();
  const status = useSyncStatus();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const info = STATUS_LABEL[status] ?? STATUS_LABEL["offline"]!;
  const Icon = info.icon;

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Você saiu da conta");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <section className="card-surface space-y-3 p-4">
      <p className="font-semibold">Conta e sincronização</p>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className={`size-4 ${status === "saving" || status === "loading" ? "animate-spin" : ""}`} />
        <span>{info.text}</span>
      </div>

      {session ? (
        <>
          <p className="text-sm">
            Conectado como <strong className="text-foreground">{session.user.email}</strong>
          </p>
          <Button variant="secondary" className="w-full" onClick={signOut}>
            <LogOut className="size-4" /> Sair da conta
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Crie uma conta para guardar sua dieta, peso e registros na nuvem e acessar de qualquer aparelho. Os dados
            deste aparelho são enviados automaticamente no primeiro login.
          </p>
          <Button className="w-full" onClick={() => navigate({ to: "/auth" })}>
            <LogIn className="size-4" /> Entrar ou criar conta
          </Button>
        </>
      )}
    </section>
  );
}
