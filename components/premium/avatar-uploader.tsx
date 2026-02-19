"use client";

import { useRef, useState } from "react";

export function AvatarUploader() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState("No file selected");

  return (
    <div className="rounded-2xl border border-dashed border-border p-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => setName(event.target.files?.[0]?.name || "No file selected")}
      />
      <button onClick={() => inputRef.current?.click()} className="rounded-2xl border border-border px-4 py-2 text-sm">
        Upload photo
      </button>
      <p className="mt-2 text-xs text-foreground/70">{name}</p>
    </div>
  );
}
