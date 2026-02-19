"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { heroUsers, shuffleUsers } from "@/lib/hero-users";

export function FloatingCards() {
  const users = useMemo(() => shuffleUsers(heroUsers).slice(0, 3), []);
  const cards = useMemo(
    () =>
      users.map((user, index) => {
        const presets = [
          { x: "left-4 top-4", w: "w-44", dy: [0, -10, 0], d: 4, meta: user.distance },
          { x: "right-8 top-20", w: "w-44", dy: [0, 12, 0], d: 5, meta: user.status },
          { x: "bottom-6 left-16", w: "w-48", dy: [0, -8, 0], d: 4.6, meta: user.status }
        ];
        return {
          name: `${user.name}, ${user.age}`,
          photo: user.photo,
          ...presets[index]
        };
      }),
    [users]
  );

  return (
    <div className="relative h-[360px] w-full">
      {cards.map((card) => (
        <motion.div
          key={card.name}
          animate={{ y: card.dy }}
          transition={{ duration: card.d, repeat: Infinity }}
          className={`absolute ${card.x} ${card.w} overflow-hidden rounded-3xl border border-white/40 bg-white/20 backdrop-blur`}
        >
          <div className="relative h-48">
            <Image src={card.photo} alt={card.name} fill className="object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-3">
              <p className="text-sm font-semibold text-white">{card.name}</p>
              <p className="text-xs text-white/85">{card.meta}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
