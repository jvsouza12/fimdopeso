import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  UtensilsCrossed,
  Plus,
  TrendingUp,
  User,
  Droplets,
  Timer,
  Target,
  BarChart3,
  LineChart,
  Calculator,
  ChefHat,
  ShoppingCart,
  Sparkles,
  Moon,
  Sun,
  Crown,
  Footprints,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";

const primaryNav = [
  { to: "/", label: "Início", icon: Home },
  { to: "/dieta", label: "Dieta", icon: UtensilsCrossed },
  { to: "/registrar", label: "Registrar", icon: Plus },
  { to: "/evolucao", label: "Evolução", icon: TrendingUp },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

const secondaryNav = [
  { to: "/projecao", label: "Projeção", icon: LineChart },
  { to: "/agua", label: "Água", icon: Droplets },
  { to: "/jejum", label: "Jejum", icon: Timer },
  { to: "/metas", label: "Metas", icon: Target },
  { to: "/receitas", label: "Receitas", icon: ChefHat },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/calculadoras", label: "Calculadoras", icon: Calculator },
  { to: "/compras", label: "Compras", icon: ShoppingCart },
  { to: "/assistente", label: "Assistente", icon: Sparkles },
  { to: "/premium", label: "Premium", icon: Crown },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { state, update } = useStore();
  const { session } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname.replace(/\/$/, "") || "/" });
  const dark = state.settings.theme === "dark";
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const toggleTheme = () =>
    update((d) => ({ ...d, settings: { ...d.settings, theme: dark ? "light" : "dark" } }));

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-sidebar px-4 py-6 lg:flex">
        <Link to="/" className="mb-8 flex items-center gap-2.5 px-2">
          <span className="gradient-primary flex size-9 items-center justify-center rounded-xl text-primary-foreground">
            <UtensilsCrossed className="size-4.5" />
          </span>
          <span className="text-lg font-bold tracking-tight">CasalPlan</span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {primaryNav.map((item) => (
            <NavItem key={item.to} {...item} active={pathname === item.to} />
          ))}
          <div className="my-3 h-px bg-border" />
          {secondaryNav.map((item) => (
            <NavItem key={item.to} {...item} active={pathname === item.to} />
          ))}
          {session && <NavItem to="/caminhada" label="Caminhada" icon={Footprints} active={pathname === "/caminhada"} />}
        </nav>

        <button
          onClick={toggleTheme}
          className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        >
          {dark ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
          {dark ? "Tema claro" : "Tema escuro"}
        </button>
      </aside>

      <main className="w-full pb-28 lg:pb-12 lg:pl-64">
        <div className="mx-auto max-w-4xl px-4 pt-3 sm:px-6 lg:hidden">
          <div className="flex items-center justify-between gap-2">
            <Link to="/" className="text-lg font-bold tracking-tight text-foreground">CasalPlan</Link>
            <div className="flex items-center gap-1">
              {session && pathname !== "/caminhada" && (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/caminhada"><Footprints className="size-4" />Caminhada</Link>
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-expanded={menuOpen}
                aria-controls="mobile-resources"
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
                Menu
              </Button>
            </div>
          </div>
          {menuOpen && (
            <nav id="mobile-resources" aria-label="Mais recursos" className="mt-3 rounded-2xl border border-border bg-surface p-3 text-foreground">
              <div className="grid grid-cols-2 gap-1">
                {secondaryNav.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    aria-current={pathname === item.to ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                      pathname === item.to ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />{item.label}
                  </Link>
                ))}
              </div>
              <Button type="button" variant="ghost" className="mt-3 w-full border-t border-border" onClick={toggleTheme}>
                {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                {dark ? "Tema claro" : "Tema escuro"}
              </Button>
            </nav>
          )}
        </div>
        <div className="mx-auto w-full max-w-4xl px-4 pt-6 sm:px-6 lg:px-8">{children}</div>
      </main>

      {/* Bottom nav mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/90 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-lg items-end justify-around px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {primaryNav.map((item) => {
            const active = pathname === item.to;
            const highlight = item.to === "/registrar";
            if (highlight) {
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="gradient-primary glow -mt-6 flex size-14 items-center justify-center rounded-2xl text-primary-foreground transition-transform active:scale-95"
                  aria-label="Registrar"
                >
                  <Plus className="size-7" />
                </Link>
              );
            }
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex w-16 flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
      )}
    >
      <Icon className={cn("size-4.5", active && "text-primary")} />
      {label}
    </Link>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}
