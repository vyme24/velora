import { cn } from "@/lib/utils";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none ring-0 transition focus:border-primary/60 focus:shadow-[0_0_0_4px_rgba(83,58,253,0.16)]",
        className
      )}
      {...props}
    />
  );
}
