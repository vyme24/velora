import { cn } from "@/lib/utils";

type StatChipProps = {
  label: string;
  value: string;
  className?: string;
};

export function StatChip({ label, value, className }: StatChipProps) {
  return (
    <div className={cn("rounded-2xl border border-border/60 bg-card/70 px-4 py-3", className)}>
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-xs text-foreground/70">{label}</p>
    </div>
  );
}
