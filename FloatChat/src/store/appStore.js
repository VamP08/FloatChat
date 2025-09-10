import { create } from "zustand";

export const useAppStore = create((set) => ({
  selectedFloat: null,
  selectedProfile: null,
  setFloat: (id) => set({ selectedFloat: id, selectedProfile: null }),
  setProfile: (id) => set({ selectedProfile: id }),
}));
