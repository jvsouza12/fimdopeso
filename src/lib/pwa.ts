const PAGE_CACHE = "nutriplan-pages";
const OFFLINE_PAGES = [
  "/", "/agua", "/assistente", "/calculadoras", "/caminhada", "/comecar",
  "/compras", "/dieta", "/evolucao", "/jejum", "/metas", "/perfil",
  "/premium", "/projecao", "/receitas", "/registrar", "/relatorios",
];

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

/** Prepara somente documentos públicos do app, nunca autenticação, RPC ou mapas externos. */
async function prepareOfflinePages() {
  if (preparing || !navigator.onLine || !("caches" in window)) return;
  preparing = true;
  try {
    const cache = await caches.open(PAGE_CACHE);
    // Pequenos lotes evitam disputar toda a conexão com a tela em uso.
    for (let index = 0; index < OFFLINE_PAGES.length; index += 3) {
      if (!navigator.onLine) break;
      await Promise.all(OFFLINE_PAGES.slice(index, index + 3).map(async path => {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 20000);
        try {
          // O HTML do shell não deve conter uma resposta autenticada em cache.
          // Os dados privados continuam nos armazenamentos locais separados por conta.
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
    }
  } catch {
    // Falta de espaço não impede o uso online nem apaga dados locais.
  } finally {
    preparing = false;
  }
}

export async function registerAppWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  if (refusedWorker()) {
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
    registrationPromise = navigator.serviceWorker.register("/sw.js").then(reg => {
      void reg.update().catch(() => {});
      void prepareOfflinePages();
      if (navigator.storage?.persist) void navigator.storage.persist().catch(() => {});
      return reg;
    }).catch(() => {
      registrationPromise = null;
      return null;
    });
  }
  return registrationPromise;
}
