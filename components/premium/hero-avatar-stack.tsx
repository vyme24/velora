"use client";

import Image from "next/image";
import { useMemo } from "react";
import { heroUsers, shuffleUsers } from "@/lib/hero-users";

export function HeroAvatarStack() {
  const users = useMemo(() => shuffleUsers(heroUsers).slice(0, 3), []);

  return (
    <div className="flex -space-x-2">
      {users.map((user) => (
        <div key={`${user.name}-${user.photo}`} className="relative h-8 w-8 overflow-hidden rounded-full border border-white/60">
          <Image src={user.photo} alt={`${user.name} avatar`} fill className="object-cover" />
        </div>
      ))}
    </div>
  );
}

