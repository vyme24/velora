import { cn } from "@/lib/utils";

type GlassCardProps = React.HTMLAttributes<HTMLDivElement>;

export function GlassCard({ className, ...props }: GlassCardProps) {
  return <div className={cn("glass-card p-5 shadow-lg", className)} {...props} />;
}
