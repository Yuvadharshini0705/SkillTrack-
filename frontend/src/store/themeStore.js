// frontend/src/store/themeStore.js
import { create } from "zustand";

const applyTheme = (theme) => {
  const root = document.documentElement;
  if (theme === "light") {
    root.classList.remove("dark");
    root.classList.add("light");
  } else {
    root.classList.remove("light");
    root.classList.add("dark");
  }
};

export const useThemeStore = create((set) => ({
  theme: "dark",   // default: dark

  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },

  toggleTheme: () =>
    set((state) => {
      const next = state.theme === "dark" ? "light" : "dark";
      applyTheme(next);
      return { theme: next };
    }),

  initTheme: () => {
    // On first load, apply dark (default)
    applyTheme("dark");
  },
}));