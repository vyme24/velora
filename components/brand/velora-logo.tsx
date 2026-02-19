import Link from "next/link";
import { cn } from "@/lib/utils";

type VeloraLogoProps = {
  href?: string;
  className?: string;
  compact?: boolean;
  light?: boolean;
};

export function VeloraLogo({ href = "/", className, compact = false, light = false }: VeloraLogoProps) {
  const content = (
    <span className={cn("inline-flex items-center", className)}>
      <span
        className={cn(
          "text-2xl font-black tracking-tight",
          compact ? "text-xl" : "text-2xl",
          light ? "text-white" : "text-primary"
        )}
      >
        Velora
      </span>
    </span>
  );

  return <Link href={href}>{content}</Link>;
}
