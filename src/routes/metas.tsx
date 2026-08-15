import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { lastNDays, todayKey, fromKey } from "@/lib/date";
import { computeStreak } from "./index";
import { Flame, Trash2, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/metas")({
  head: () => ({
    meta: [
      { title: "Metas e conquistas — NutriPlan" },
      { name: "description", content: "Crie metas pessoais, acompanhe seu progresso e mantenha sua sequência de dias." },
      { property: "og:title", content: "Metas e conquistas — NutriPlan" },
      { property: "og:description", content: "Sequência de dias, conquistas e metas personalizadas." },
    ],
  }),
  component: MetasPage,
});

function MetasPage() {
  const { state, update } = useStore();
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState(1);
  const [unit, setUnit] = useState("dias");

  const loggedDays = new Set(state.logs.map((l) => l.date));
  const streak = computeStreak([...loggedDays]);
  const days = lastNDays(35);

  const achievements = [
    { label: "Primeiro registro", done: state.logs.length > 0 },
    { label: "3 dias seguidos", done: streak >= 3 },
    { label: "7 dias seguidos", done: streak >= 7 },
    { label: "30 dias seguidos", done: streak >= 30 },
    { label: "Primeiro peso registrado", done: state.weights.length > 0 },
    { label: "Primeira receita criada", done: state.recipes.length > 0 },
    { label: "Primeiro jejum concluído", done: state.fasts.some((f) => f.endedAt) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Metas" subtitle="Progresso constante vale mais que perfeição." />

      <div className="card-surface p-5">
        <div className="flex items-center gap-3">
          <Flame className="size-7 text-warning" />
          <div>
            <p className="text-2xl font-bold tabular-nums">{streak} dias consecutivos</p>
            <p className="text-xs text-muted-foreground">Registre pelo menos uma refeição por dia.</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-1.5">
          {days.map((d) => (
            <div
              key={d}
              title={d}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg text-[10px]",
                loggedDays.has(d) ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground",
                d === todayKey() && "ring-2 ring-primary",
              )}
            >
              {fromKey(d).getDate()}
            </div>
          ))}
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold tracking-tight">Suas metas</h2>
        <div className="space-y-3">
          {state.goals.map((g) => (
            <div key={g.id} className="card-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{g.title}</p>
                <button onClick={() => update((d) => ({ ...d, goals: d.goals.filter((x) => x.id !== g.id) }))}>
                  <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="gradient-primary h-full rounded-full"
                  style={{ width: `${Math.min(100, (g.current / g.target) * 100)}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {g.current} / {g.target} {g.unit}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      goals: d.goals.map((x) =>
                        x.id === g.id ? { ...x, current: Math.min(x.target, x.current + 1) } : x,
                      ),
                    }))
                  }
                >
                  +1
                </Button>
              </div>
            </div>
          ))}
          {state.goals.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma meta criada.</p>}
        </div>
      </section>

      <div className="card-surface space-y-3 p-4">
        <p className="font-semibold">Nova meta</p>
        <div className="space-y-2">
          <Label>Título</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Perder 5 kg" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Alvo</Label>
            <Input type="number" value={target} onChange={(e) => setTarget(Math.max(1, +e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Unidade</Label>
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={12} />
          </div>
        </div>
        <Button
          className="w-full"
          onClick={() => {
            if (!title.trim()) {
              toast.error("Informe um título");
              return;
            }
            update((d) => ({
              ...d,
              goals: [{ id: crypto.randomUUID(), title: title.trim(), target, current: 0, unit }, ...d.goals],
            }));
            setTitle("");
            toast.success("Meta criada");
          }}
        >
          Criar meta
        </Button>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold tracking-tight">Conquistas</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {achievements.map((a) => (
            <div
              key={a.label}
              className={cn(
                "card-surface flex items-center gap-2 p-3 text-sm",
                !a.done && "opacity-50",
              )}
            >
              <Trophy className={cn("size-4", a.done ? "text-warning" : "text-muted-foreground")} />
              {a.label}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
