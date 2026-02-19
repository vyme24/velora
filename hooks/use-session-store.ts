import { create } from "zustand";

type SessionState = {
  userId: string | null;
  role: "user" | "admin" | null;
  setSession: (payload: { userId: string; role: "user" | "admin" }) => void;
  clearSession: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  userId: null,
  role: null,
  setSession: ({ userId, role }) => set({ userId, role }),
  clearSession: () => set({ userId: null, role: null })
}));
