import { useSyncExternalStore } from "react";
import { CheckCircle2, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getOfflinePreparationStatus,
  getOfflinePreparationServerStatus,
  subscribeOfflinePreparation,
  retryOfflinePreparation,
} from "@/lib/pwa";

export function OfflinePreparation({ online }: { online: boolean }) {
  const status = useSyncExternalStore(subscribeOfflinePreparation, getOfflinePreparationStatus, getOfflinePreparationServerStatus);
  const preparing = status.phase === "preparing";
  const ready = status.phase === "ready";
  const unavailable = status.phase === "unavailable";

  return <section className="space-y-3 rounded-lg border border-border bg-surface p-4 text-foreground" aria-label="Preparação offline">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div role="status" className="flex items-center gap-2 text-sm font-medium">
        {preparing ? <Loader2 className="size-4 animate-spin text-primary" /> : ready ? <CheckCircle2 className="size-4 text-primary" /> : <Download className="size-4 text-muted-foreground" />}
        {preparing ? "Preparando páginas offline…" : ready ? "Páginas disponíveis offline" : unavailable ? "Preparação offline indisponível aqui" : "Preparação offline incompleta"}
      </div>
      {!unavailable && <Button size="sm" variant="outline" disabled={preparing || !online} onClick={() => { void retryOfflinePreparation(); }}>
        {preparing ? "Preparando…" : ready ? "Verificar novamente" : "Tentar novamente"}
      </Button>}
    </div>
    {!unavailable && <>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Páginas salvas para uso offline" aria-valuemin={0} aria-valuemax={status.total} aria-valuenow={status.available}>
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${status.available / status.total * 100}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{status.available} de {status.total} páginas salvas neste aparelho.{!online && !ready ? " Reconecte à internet para terminar." : ""}</p>
    </>}
    <p className="text-xs leading-relaxed text-muted-foreground">
      {unavailable ? "Abra a versão publicada em um navegador compatível para preparar o acesso sem internet. " : "Antes de sair, aguarde a preparação e mantenha sua conta conectada. "}
      O GPS e os percursos salvos funcionam sem internet. Login, assistente e buscas em serviços online precisam de conexão. Páginas disponíveis não significam backup dos seus dados; limpar os dados do site remove as cópias locais.
    </p>
  </section>;
}
