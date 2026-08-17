import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/compras")({
  head: () => ({
    meta: [
      { title: "Lista de compras — NutriPlan" },
      { name: "description", content: "Gere sua lista de compras da semana a partir da dieta planejada e marque o que já comprou." },
      { property: "og:title", content: "Lista de compras — NutriPlan" },
      { property: "og:description", content: "Da dieta planejada direto para o mercado." },
    ],
  }),
  component: ComprasPage,
});

function ComprasPage() {
  const { state, update, allFoods } = useStore();

  const generate = () => {
    const totals = new Map<string, { qty: number; unit: string; category: string; name: string }>();
    state.plan.forEach((p) => {
      const food = allFoods.find((f) => f.id === p.foodId);
      if (!food) return;
      const prev = totals.get(food.id);
      totals.set(food.id, {
        qty: (prev?.qty ?? 0) + p.amount,
        unit: food.unit,
        category: food.category,
        name: food.name,
      });
    });

    if (totals.size === 0) {
      toast.error("Planeje sua dieta primeiro em 'Minha dieta'");
      return;
    }

    const items = [...totals.values()].map((t) => ({
      id: crypto.randomUUID(),
      name: t.name,
      qty:
        t.unit === "un"
          ? `${Math.ceil(t.qty)} un`
          : t.qty >= 1000
            ? `${(t.qty / 1000).toFixed(1)} kg`
            : `${Math.round(t.qty)} ${t.unit}`,
      category: t.category,
      done: false,
    }));

    update((d) => ({ ...d, shopping: items }));
    toast.success("Lista da semana gerada");
  };

  const groups = state.shopping.reduce<Record<string, typeof state.shopping>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lista de compras"
        subtitle="Baseada na sua dieta planejada."
        action={
          <Button onClick={generate}>
            <ShoppingCart className="size-4" /> Gerar lista da semana
          </Button>
        }
      />

      {state.shopping.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhuma lista ainda. Planeje sua dieta e gere a lista da semana.
        </p>
      )}

      <div className="space-y-4">
        {Object.entries(groups).map(([cat, items]) => (
          <div key={cat} className="card-surface p-4">
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{cat}</p>
            <ul className="space-y-2">
              {items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 text-sm">
                  <Checkbox
                    checked={i.done}
                    onCheckedChange={() =>
                      update((d) => ({
                        ...d,
                        shopping: d.shopping.map((x) => (x.id === i.id ? { ...x, done: !x.done } : x)),
                      }))
                    }
                  />
                  <span className={i.done ? "text-muted-foreground line-through" : ""}>{i.name}</span>
                  <span className="ml-auto tabular-nums text-muted-foreground">{i.qty}</span>
                  <button onClick={() => update((d) => ({ ...d, shopping: d.shopping.filter((x) => x.id !== i.id) }))}>
                    <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
