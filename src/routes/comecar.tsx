import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/comecar")({
  head: () => ({
    meta: [
      { title: "Montar meu plano — NutriPlan" },
      {
        name: "description",
        content:
          "Responda algumas perguntas rápidas e receba um plano de calorias, macros, fibras e água feito para o seu corpo e objetivo.",
      },
      { property: "og:title", content: "Montar meu plano — NutriPlan" },
      {
        property: "og:description",
        content: "Plano de dieta personalizado em menos de dois minutos, grátis e sem cadastro.",
      },
    ],
  }),
  component: ComecarPage,
});

/** Quando o perfil já existe, o onboarding não aparece: levamos ao painel. */
function ComecarPage() {
  const { state, hydrated } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (hydrated && state.onboarded) void navigate({ to: "/", replace: true });
  }, [hydrated, state.onboarded, navigate]);

  return null;
}
