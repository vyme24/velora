"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { GradientButton } from "@/components/ui/gradient-button";

type ProfileCardProps = {
  name: string;
  age: number;
  distance: string;
  bio: string;
  interests: string[];
  image: string;
  onLike?: () => void;
  onPass?: () => void;
  onSuperLike?: () => void;
};

export function ProfileCard({ name, age, distance, bio, interests, image, onLike, onPass, onSuperLike }: ProfileCardProps) {
  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      whileHover={{ scale: 1.01 }}
      className="overflow-hidden rounded-3xl border border-border bg-card shadow-lg"
    >
      <div className="relative h-96">
        <Image src={image} alt={name} fill className="object-cover" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/65 to-transparent" />
      </div>
      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-semibold">{name}, {age}</h3>
          <p className="text-sm text-foreground/70">{distance}</p>
        </div>
        <p className="text-sm text-foreground/80">{bio}</p>
        <div className="flex flex-wrap gap-2">
          {interests.map((tag) => (
            <span key={tag} className="rounded-full border border-border bg-muted px-3 py-1 text-xs">
              {tag}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={onPass} className="h-11 rounded-2xl border border-border bg-background text-sm font-semibold">Pass</button>
          <GradientButton onClick={onLike}>Like</GradientButton>
          <button onClick={onSuperLike} className="h-11 rounded-2xl border border-primary/40 bg-primary/10 text-sm font-semibold text-primary">Super</button>
        </div>
      </div>
    </motion.div>
  );
}
