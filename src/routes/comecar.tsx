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
          "Depois de escolher como acessar, responda algumas perguntas rápidas e receba metas de calorias, macros, fibras e água.",
      },
      { property: "og:title", content: "Montar meu plano — NutriPlan" },
      {
        property: "og:description",
        content: "Plano de dieta personalizado em menos de dois minutos, com conta sincronizada ou uso local.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
