"use client";

const emojis = ["😀", "😍", "🔥", "🥂", "💬", "✨", "🎉", "🤍"];

export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2 rounded-2xl border border-border bg-card p-3">
      {emojis.map((emoji) => (
        <button key={emoji} onClick={() => onPick(emoji)} className="rounded-xl bg-muted px-2 py-2 text-lg">
          {emoji}
        </button>
      ))}
    </div>
  );
}
