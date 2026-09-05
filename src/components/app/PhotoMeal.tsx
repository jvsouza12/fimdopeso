import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./EmptyState";
import { MEAL_LABELS } from "./FoodPicker";
import { analyzeMealPhoto } from "@/lib/ai.functions";
import { useStore } from "@/lib/store";
import { useSession } from "@/hooks/useSession";
import { round } from "@/lib/nutrition";
import type { MealType } from "@/lib/types";
import { Link } from "@tanstack/react-router";

interface Item {
  name: string;
  amount: number;
  unit: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

async function fileToDataUrl(file: File, maxSide = 1024): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas indisponível");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

/** Estima a refeição a partir de uma foto usando IA. */
export function PhotoMeal({ meal }: { meal: MealType }) {
  const analyze = useServerFn(analyzeMealPhoto);
  const { addLog } = useStore();
  const { session } = useSession();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(false);

  if (!session) {
    return (
      <EmptyState
        icon={<Sparkles className="size-5" />}
        title="Entre para usar a foto do prato"
        description="A leitura por foto usa inteligência artificial e fica disponível quando você está conectado à sua conta."
      >
        <Button asChild className="mt-1">
          <Link to="/auth">Entrar ou criar conta</Link>
        </Button>
      </EmptyState>
    );
  }

  const onFile = async (file: File) => {
    setLoading(true);
    setItems(null);
    try {
      const image = await fileToDataUrl(file);
      setPreview(image);
      const res = await analyze({ data: { image } });
      if (res.error === "rate_limit") toast.error("Muitas análises seguidas. Tente de novo em instantes.");
      else if (res.error === "credits") toast.error("Créditos de IA esgotados.");
      else if (res.error) toast.error("Não foi possível analisar a foto agora.");
      setItems(res.items as Item[]);
      if (res.items.length === 0 && !res.error) toast.error("Não identificamos alimentos nessa foto.");
    } catch {
      toast.error("Não foi possível ler essa imagem.");
    } finally {
      setLoading(false);
    }
  };

  const total = (items ?? []).reduce((a, i) => a + i.kcal, 0);

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-label="Escolher foto da refeição"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onFile(file);
          e.target.value = "";
        }}
      />

      <div className="card-surface space-y-3 p-4">
        {preview ? (
          <img src={preview} alt="Foto da refeição enviada" className="aspect-video w-full rounded-2xl object-cover" />
        ) : null}
        <Button className="w-full" onClick={() => inputRef.current?.click()} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          {loading ? "Analisando o prato…" : preview ? "Enviar outra foto" : "Tirar ou escolher foto"}
        </Button>
        <p className="text-xs text-muted-foreground">
          A estimativa é aproximada — confira as quantidades antes de registrar.
        </p>
      </div>

      {items && items.length > 0 ? (
        <div className="space-y-3">
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {items.map((i, idx) => (
              <div key={`${i.name}-${idx}`} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{i.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {round(i.amount)} {i.unit} · {round(i.kcal)} kcal · {round(i.protein, 1)}P
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    addLog({
                      meal,
                      name: i.name,
                      amount: i.amount,
                      macros: {
                        kcal: i.kcal,
                        protein: i.protein,
                        carbs: i.carbs,
                        fat: i.fat,
                        fiber: i.fiber,
                      },
                    });
                    toast.success(`${i.name} registrado`);
                  }}
                >
                  <Plus className="size-4" /> Add
                </Button>
              </div>
            ))}
          </div>
          <Button
            className="w-full"
            onClick={() => {
              items.forEach((i) =>
                addLog({
                  meal,
                  name: i.name,
                  amount: i.amount,
                  macros: { kcal: i.kcal, protein: i.protein, carbs: i.carbs, fat: i.fat, fiber: i.fiber },
                }),
              );
              toast.success(`Refeição registrada em ${MEAL_LABELS[meal]} (${round(total)} kcal)`);
              setItems(null);
              setPreview(null);
            }}
          >
            Registrar tudo ({round(total)} kcal)
          </Button>
        </div>
      ) : null}
    </div>
  );
}
