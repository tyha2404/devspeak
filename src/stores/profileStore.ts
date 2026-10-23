import { create } from "zustand";
import type { Bootstrap } from "@/lib/contracts/bootstrap";

interface ProfileState {
  profile: Bootstrap["profile"] | null;
  setProfile: (p: Bootstrap["profile"]) => void;
}

/** Mirror of the server-owned profile. The client never computes XP or level itself. */
export const useProfileStore = create<ProfileState>()((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
}));
