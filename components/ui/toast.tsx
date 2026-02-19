"use client";

import { AnimatePresence, motion } from "framer-motion";

export function Toast({ open, message }: { open: boolean; message: string }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-slate-900 px-4 py-2 text-sm text-white shadow-xl dark:bg-white dark:text-slate-900"
        >
          {message}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
