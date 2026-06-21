import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../utils/api";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await api.post("/auth/login", { email, password });
          const { token, user } = res.data;
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          set({ user, token, isLoading: false });
          return { success: true, user };
        } catch (err) {
          set({ isLoading: false });
          return { success: false, error: err.response?.data?.error || "Login failed" };
        }
      },

      // Register only creates account — does NOT log in
      register: async (email, password) => {
        set({ isLoading: true });
        try {
          await api.post("/auth/register", { email, password });
          set({ isLoading: false });
          return { success: true };
        } catch (err) {
          set({ isLoading: false });
          return { success: false, error: err.response?.data?.error || "Registration failed" };
        }
      },

      logout: () => {
        delete api.defaults.headers.common["Authorization"];
        set({ user: null, token: null });
      },

      refreshUser: async () => {
        try {
          const res = await api.get("/auth/me");
          set({ user: res.data });
        } catch {}
      },

      updateUser: (user) => set({ user }),
    }),
    {
      name: "skilltrack-auth",
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          api.defaults.headers.common["Authorization"] = `Bearer ${state.token}`;
        }
      },
    }
  )
);