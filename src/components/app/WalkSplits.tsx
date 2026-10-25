import { walkPace, walkSplits, walkTime, type Walk } from "@/lib/walking";

export function WalkSplits({ walk }: { walk: Walk }) {
  const splits = walkSplits(walk);
  if (!splits.length) return null;
  const complete = splits.filter(split => !split.partial);
  const best = complete.length > 1 ? complete.reduce((a, b) => (b.seconds < a.seconds ? b : a)) : null;
  return <section className="space-y-2">
    <h3 className="text-sm font-semibold">Parciais por quilômetro</h3>
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
      {splits.map(split => <li key={split.km} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="w-12 tabular-nums text-muted-foreground">{split.km} km</span>
          <span className="tabular-nums">{walkPace(split.meters, split.seconds)} /km</span>
          {split.partial
            ? <span className="text-xs text-muted-foreground">em andamento</span>
            : best && best.km === split.km
              ? <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">melhor</span>
              : null}
        </span>
        <span className="shrink-0 tabular-nums text-muted-foreground">{walkTime(split.seconds)}</span>
      </li>)}
    </ul>
  </section>;
}
