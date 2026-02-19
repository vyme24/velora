"use client";

import { triggerAuthModal } from "@/lib/client-api";

type OpenAuthModalButtonProps = {
  label: string;
  className: string;
  mode?: "login" | "join";
};

export function OpenAuthModalButton({ label, className, mode }: OpenAuthModalButtonProps) {
  return (
    <button
      type="button"
      onClick={() => triggerAuthModal("Please log in or create an account to continue.", mode)}
      className={className}
    >
      {label}
    </button>
  );
}
