export interface FastStage {
  id: string;
  from: number; // horas
  to: number | null; // null = em diante
  name: string;
  short: string;
  description: string;
  benefits: string[];
  emoji: string;
}

/**
 * Estágios metabólicos do jejum. Baseado na literatura de referência sobre
 * jejum intermitente (Anton et al., "Flipping the metabolic switch", Obesity 2018;
 * Cahill, "Fuel metabolism in starvation", Annu Rev Nutr 2006; de Cabo & Mattson,
 * NEJM 2019 "Effects of Intermittent Fasting on Health, Aging, and Disease").
 * Os tempos são aproximados e variam conforme a última refeição, o treino e o metabolismo.
 */
export const FAST_STAGES: FastStage[] = [
  {
    id: "fed",
    from: 0,
    to: 4,
    name: "Digestão",
    short: "Estado alimentado",
    emoji: "🍽️",
    description:
      "O corpo ainda absorve a última refeição. A insulina está alta e a energia vem direto da glicose do sangue.",
    benefits: ["Nutrientes sendo absorvidos", "Glicogênio sendo reposto"],
  },
  {
    id: "post",
    from: 4,
    to: 8,
    name: "Pós-absortivo",
    short: "Insulina caindo",
    emoji: "📉",
    description:
      "A absorção terminou e a insulina começa a cair. O fígado passa a liberar o glicogênio guardado para manter a glicose estável.",
    benefits: ["Insulina em queda", "Glicose vem do fígado"],
  },
  {
    id: "glycogen",
    from: 8,
    to: 12,
    name: "Glicogênio",
    short: "Reservas em uso",
    emoji: "🔋",
    description:
      "As reservas de glicogênio do fígado vão se esgotando. O corpo começa a recorrer mais à gordura para produzir energia.",
    benefits: ["Estoques de açúcar diminuindo", "Lipólise começando"],
  },
  {
    id: "fatburn",
    from: 12,
    to: 16,
    name: "Queima de gordura",
    short: "Virada metabólica",
    emoji: "🔥",
    description:
      "É a chamada 'virada metabólica': com o glicogênio baixo, a gordura vira a principal fonte de energia e o fígado começa a produzir corpos cetônicos.",
    benefits: ["Gordura como combustível", "Primeiras cetonas", "Sensibilidade à insulina melhora"],
  },
  {
    id: "ketosis",
    from: 16,
    to: 18,
    name: "Cetose leve",
    short: "Cetonas subindo",
    emoji: "⚡",
    description:
      "As cetonas sobem de forma consistente e servem de energia para o cérebro. Muita gente relata foco mais estável nesta faixa.",
    benefits: ["Cetonas em alta", "Foco mental", "Fome tende a estabilizar"],
  },
  {
    id: "autophagy",
    from: 18,
    to: 24,
    name: "Autofagia inicial",
    short: "Faxina celular",
    emoji: "♻️",
    description:
      "As células intensificam a reciclagem de componentes danificados (autofagia) e o hormônio do crescimento aumenta, ajudando a preservar massa magra.",
    benefits: ["Autofagia ativa", "Hormônio do crescimento maior", "Inflamação tende a cair"],
  },
  {
    id: "deep",
    from: 24,
    to: 48,
    name: "Jejum profundo",
    short: "Autofagia acentuada",
    emoji: "🌒",
    description:
      "Cetose consolidada e autofagia acentuada. Nesta faixa é importante hidratar bem e repor eletrólitos — não faça sem orientação profissional.",
    benefits: ["Cetose consolidada", "Reciclagem celular intensa"],
  },
  {
    id: "extended",
    from: 48,
    to: null,
    name: "Jejum prolongado",
    short: "Somente com acompanhamento",
    emoji: "🩺",
    description:
      "Jejuns acima de 48h exigem acompanhamento médico. A insulina fica no mínimo e há sinais de renovação de células-tronco, mas o risco também aumenta.",
    benefits: ["Insulina no mínimo", "Renovação celular"],
  },
];

export function stageAt(hours: number): FastStage {
  return (
    FAST_STAGES.find((s) => hours >= s.from && (s.to === null || hours < s.to)) ?? FAST_STAGES[0]!
  );
}

export function stageIndexAt(hours: number): number {
  return FAST_STAGES.findIndex((s) => s.id === stageAt(hours).id);
}

export function nextStage(hours: number): FastStage | null {
  const i = stageIndexAt(hours);
  return FAST_STAGES[i + 1] ?? null;
}

/** Progresso 0–1 dentro do estágio atual. */
export function stageProgress(hours: number): number {
  const s = stageAt(hours);
  if (s.to === null) return 1;
  return Math.min(1, Math.max(0, (hours - s.from) / (s.to - s.from)));
}
