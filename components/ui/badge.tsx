import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "default" | "success" | "danger";
};

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        tone === "default" && "border-primary/30 bg-primary/10 text-primary",
        tone === "success" && "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
        tone === "danger" && "border-primary/30 bg-primary/10 text-primary/80",
        className
      )}
      {...props}
    />
  );
}
