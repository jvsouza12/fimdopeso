import { useRef, useState } from "react";
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
  const [signingOut, setSigningOut] = useState(false);
  const signOutPending = useRef(false);

  const info = STATUS_LABEL[status] ?? STATUS_LABEL["offline"]!;
  const Icon = info.icon;

  const signOut = async () => {
    if (signOutPending.current) return;
    signOutPending.current = true;
    setSigningOut(true);
    try {
      await queryClient.cancelQueries();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      queryClient.clear();
      toast.success("Você saiu da conta");
      await navigate({ to: "/auth", replace: true });
    } catch {
      toast.error("Não foi possível concluir a saída. Tente novamente.");
    } finally {
      signOutPending.current = false;
      setSigningOut(false);
    }
  };

  return (
    <section className="card-surface space-y-3 p-4">
      <p className="font-semibold">Conta e sincronização</p>

      <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
        <Icon className={`size-4 ${status === "saving" || status === "loading" ? "animate-spin" : ""}`} />
        <span>{info.text}</span>
      </div>

      {session ? (
        <>
          <p className="text-sm">
            Conectado como <strong className="text-foreground">{session.user.email}</strong>
          </p>
          <Button variant="secondary" className="w-full" onClick={signOut} disabled={signingOut}>
            <LogOut className="size-4" /> {signingOut ? "Saindo…" : "Sair da conta"}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Sem conta, seus registros ficam neste navegador. Os dados de cada conta ficam separados;
            os registros feitos como visitante não são transferidos automaticamente ao entrar.
          </p>
          <Button className="w-full" onClick={() => navigate({ to: "/auth" })}>
            <LogIn className="size-4" /> Entrar ou criar conta
          </Button>
        </>
      )}
    </section>
  );
}
