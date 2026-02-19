"use client";

import { AnimatePresence, motion } from "framer-motion";
import { GradientButton } from "@/components/ui/gradient-button";

type AnimatedModalProps = {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
};

export function AnimatedModal({ open, title, description, onClose }: AnimatedModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-md rounded-3xl border border-primary/30 bg-card p-6 text-center shadow-[0_0_25px_rgba(83,58,253,0.40)]"
          >
            <h3 className="text-2xl font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-foreground/70">{description}</p>
            <GradientButton className="mt-5 w-full" onClick={onClose}>Continue</GradientButton>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
