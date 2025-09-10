import { create } from 'zustand';

export const useAppStore = create((set) => ({
  selectedFloat: null,
  selectedProfile: null,
  selectedParameter: 'temp', 
  setFloat: (floatId) => set({ selectedFloat: floatId, selectedProfile: null }),
  setProfile: (profileId) => set({ selectedProfile: profileId }),
  setParameter: (param) => set({ selectedParameter: param }),
}));