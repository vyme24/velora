import { cn } from "@/lib/utils";

type ChatBubbleProps = {
  sender: "me" | "them";
  text: string;
  time: string;
};

export function ChatBubble({ sender, text, time }: ChatBubbleProps) {
  const mine = sender === "me";
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[82%] rounded-2xl px-4 py-2 text-sm shadow",
          mine ? "bg-velora-gradient text-white" : "bg-muted text-foreground"
        )}
      >
        <p>{text}</p>
        <p className={cn("mt-1 text-[10px]", mine ? "text-white/80" : "text-foreground/60")}>{time}</p>
      </div>
    </div>
  );
}
