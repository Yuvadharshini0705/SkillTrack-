import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem("skilltrack-auth");
    if (stored) {
      const token = JSON.parse(stored)?.state?.token;
      if (token) config.headers["Authorization"] = `Bearer ${token}`;
    }
  } catch (_) {}
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || "";
    const is401 = err.response?.status === 401;
    const isAuthRoute =
      url.includes("/auth/login") || url.includes("/auth/register");
    if (is401 && !isAuthRoute) {
      localStorage.removeItem("skilltrack-auth");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;