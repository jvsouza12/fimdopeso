const PAGE_CACHE = "nutriplan-pages";
const OFFLINE_PAGES = [
  "/", "/agua", "/assistente", "/calculadoras", "/caminhada", "/comecar",
  "/compras", "/dieta", "/evolucao", "/jejum", "/metas", "/perfil",
  "/premium", "/projecao", "/receitas", "/registrar", "/relatorios",
];

export interface OfflinePreparationStatus {
  phase: "idle" | "preparing" | "ready" | "partial" | "unavailable";
  available: number;
  total: number;
}

const initialStatus: OfflinePreparationStatus = {
  phase: "idle", available: 0, total: OFFLINE_PAGES.length,
};
let status = initialStatus;
const listeners = new Set<() => void>();
export const getOfflinePreparationStatus = () => status;
export const getOfflinePreparationServerStatus = () => initialStatus;
export function subscribeOfflinePreparation(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function publish(next: OfflinePreparationStatus) {
  status = next;
  listeners.forEach(listener => listener());
}

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;
let listening = false;
let preparing = false;

function refusedWorker() {
  const hostname = window.location.hostname;
  return !import.meta.env.PROD || window.self !== window.top ||
    hostname.startsWith("id-preview--") || hostname.startsWith("preview--") ||
    ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"].some(domain => hostname === domain || hostname.endsWith(`.${domain}`)) ||
    new URLSearchParams(window.location.search).get("sw") === "off";
}

/** Conta somente os documentos presentes, sem confundir internet com preparo offline. */
async function countPages(cache: Cache) {
  const matches = await Promise.all(OFFLINE_PAGES.map(path => cache.match(new URL(path, window.location.origin).href)));
  return matches.filter(response => response?.ok && response.headers.get("content-type")?.includes("text/html")).length;
}

/** Aguarda também a instalação dos arquivos estáticos pelo service worker. */
async function waitForWorker() {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Preparação interrompida")), 45000);
      }),
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

/** Prepara somente documentos públicos do app, nunca autenticação, RPC ou mapas externos. */
async function prepareOfflinePages() {
  if (preparing) return;
  if (!("caches" in window)) {
    publish({ ...status, phase: "unavailable" });
    return;
  }
  preparing = true;
  publish({ ...status, phase: "preparing" });
  try {
    await waitForWorker();
    const cache = await caches.open(PAGE_CACHE);
    publish({ ...status, available: await countPages(cache) });
    // Pequenos lotes evitam disputar toda a conexão com a tela em uso.
    for (let index = 0; index < OFFLINE_PAGES.length; index += 3) {
      if (!navigator.onLine) break;
      await Promise.all(OFFLINE_PAGES.slice(index, index + 3).map(async path => {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 20000);
        try {
          // Nunca prepara documentos com credenciais da conta.
          const response = await fetch(path, {
            credentials: "omit",
            cache: "no-store",
            redirect: "error",
            headers: { Accept: "text/html" },
            signal: controller.signal,
          });
          if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) return;
          const url = new URL(response.url);
          if (url.origin !== window.location.origin || url.pathname !== path) return;
          await cache.put(new Request(new URL(path, window.location.origin)), response);
        } catch {
          // Mantém a cópia anterior; a próxima conexão tenta preparar novamente.
        } finally {
          window.clearTimeout(timeout);
        }
      }));
      publish({ ...status, available: await countPages(cache) });
    }
    const available = await countPages(cache);
    publish({ phase: available === OFFLINE_PAGES.length ? "ready" : "partial", available, total: OFFLINE_PAGES.length });
  } catch {
    publish({ ...status, phase: "partial" });
  } finally {
    preparing = false;
  }
}

export async function retryOfflinePreparation() {
  const registration = await registerAppWorker();
  if (registration) await prepareOfflinePages();
}

export async function registerAppWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) {
    publish({ ...status, phase: "unavailable" });
    return null;
  }
  if (refusedWorker()) {
    publish({ ...status, phase: "unavailable" });
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const matches = registrations.filter(reg => [reg.active, reg.waiting, reg.installing].some(worker => worker && new URL(worker.scriptURL).pathname === "/sw.js"));
      await Promise.all(matches.map(reg => reg.unregister()));
    } catch {
      // O modo de prévia não depende de service worker.
    }
    return null;
  }

  if (!listening) {
    listening = true;
    window.addEventListener("online", () => {
      void registerAppWorker().then(reg => {
        if (!reg) return;
        void reg.update().catch(() => {});
        void prepareOfflinePages();
      });
    });
  }

  if (!registrationPromise) {
    publish({ ...status, phase: "preparing" });
    registrationPromise = navigator.serviceWorker.register("/sw.js").then(reg => {
      void reg.update().catch(() => {});
      void prepareOfflinePages();
      if (navigator.storage?.persist) void navigator.storage.persist().catch(() => {});
      return reg;
    }).catch(() => {
      registrationPromise = null;
      publish({ ...status, phase: "partial" });
      return null;
    });
  }
  return registrationPromise;
}
