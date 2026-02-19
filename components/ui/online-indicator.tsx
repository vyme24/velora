import { cn } from "@/lib/utils";

export function OnlineIndicator({ online, className }: { online: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 rounded-full",
        online ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" : "bg-slate-400",
        className
      )}
    />
  );
}
