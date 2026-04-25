import { cn } from "@/lib/utils";

export function ComplexiteBadge({ level }: { level: number }) {
  const labels = ["", "Faible", "Moyenne", "Élevée"];
  const cls = [``, "badge-complexite-1", "badge-complexite-2", "badge-complexite-3"][level];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", cls)}>
      {labels[level]}
    </span>
  );
}

export function QualiteBadge({ level }: { level: number }) {
  const stars = ["", "⭐", "⭐⭐", "⭐⭐⭐"][level];
  const labels = ["", "Basique", "Bonne", "Excellente"];
  const cls = ["", "badge-qualite-1", "badge-qualite-2", "badge-qualite-3"][level];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium", cls)}>
      <span>{stars}</span>
      <span>{labels[level]}</span>
    </span>
  );
}

export function AbonneBadge({ status }: { status: string }) {
  if (status === "Oui") return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">✓ Oui</span>
  );
  if (status === "À vérifier") return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">⚠ À vérifier</span>
  );
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200">✗ Non</span>
  );
}

export function DelaiLabel({ days }: { days: number }) {
  const label = days === 0 ? "J0" : days === 1 ? "J+1" : days === 3 ? "J+3" : `J+${days}`;
  const ok = days <= 1;
  return (
    <span className={cn("text-xs font-medium", ok ? "text-green-700" : "text-amber-700")}>
      {label}
    </span>
  );
}

export function TypeBadge({ type }: { type: string }) {
  if (type === "note_interne") return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">Note interne</span>
  );
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">Question</span>
  );
}
