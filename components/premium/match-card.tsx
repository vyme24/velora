"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { OnlineIndicator } from "@/components/ui/online-indicator";

type MatchCardProps = {
  name: string;
  lastMessage: string;
  online: boolean;
  image: string;
};

export function MatchCard({ name, lastMessage, online, image }: MatchCardProps) {
  return (
    <motion.div whileHover={{ scale: 1.03 }} className="rounded-3xl border border-border bg-card p-4 shadow-lg">
      <div className="relative mb-3 h-48 overflow-hidden rounded-2xl">
        <Image src={image} alt={name} fill className="object-cover" />
      </div>
      <div className="flex items-center justify-between">
        <p className="font-semibold">{name}</p>
        <OnlineIndicator online={online} />
      </div>
      <p className="mt-1 line-clamp-1 text-sm text-foreground/70">{lastMessage}</p>
    </motion.div>
  );
}
