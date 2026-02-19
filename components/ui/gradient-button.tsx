"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type GradientButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  glow?: boolean;
};

export function GradientButton({ className, glow = true, children, ...props }: GradientButtonProps) {
  return (
    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-flex">
      <button
        className={cn(
          "inline-flex h-11 items-center justify-center rounded-2xl bg-velora-gradient px-5 text-sm font-semibold text-white transition",
          glow && "shadow-[0_0_25px_rgba(83,58,253,0.40)]",
          className
        )}
        {...props}
      >
        {children}
      </button>
    </motion.div>
  );
}
