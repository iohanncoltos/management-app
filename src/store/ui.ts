import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface UIState {
  sidebarOpen: boolean;
  commandPaletteOpen: boolean;
  setSidebarOpen: (state: boolean) => void;
  toggleSidebar: () => void;
  setCommandPaletteOpen: (state: boolean) => void;
}

export const useUIState = create<UIState>()(
  devtools(
    (set) => ({
      sidebarOpen: true,
      commandPaletteOpen: false,
      setSidebarOpen: (state) => set({ sidebarOpen: state }),
      toggleSidebar: () => set((prev) => ({ sidebarOpen: !prev.sidebarOpen })),
      setCommandPaletteOpen: (state) => set({ commandPaletteOpen: state }),
    }),
    { name: "UIState" },
  ),
);
