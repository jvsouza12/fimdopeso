export async function registerAppWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const hostname = window.location.hostname;
    const refused = !import.meta.env.PROD || window.self !== window.top ||
      hostname.startsWith("id-preview--") || hostname.startsWith("preview--") ||
      ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"].some(domain => hostname === domain || hostname.endsWith(`.${domain}`)) ||
      new URLSearchParams(window.location.search).get("sw") === "off";
    const registrations = await navigator.serviceWorker.getRegistrations();
    const matches = registrations.filter(reg => [reg.active, reg.waiting, reg.installing].some(worker => worker && new URL(worker.scriptURL).pathname === "/sw.js"));
    if (refused) {
      await Promise.all(matches.map(reg => reg.unregister()));
      return null;
    }
    const reg = await navigator.serviceWorker.register("/sw.js");
    void reg.update().catch(() => {});
    return reg;
  } catch {
    return null;
  }
}
