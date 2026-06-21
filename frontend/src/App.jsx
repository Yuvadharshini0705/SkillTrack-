// frontend/src/App.jsx
// Enhanced: animated Toaster, theme-aware styles, smooth toast transitions

import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./store/authStore";
import { useThemeStore } from "./store/themeStore";

import LoginPage         from "./pages/LoginPage";
import RegisterPage      from "./pages/RegisterPage";
import ProfileSetupPage  from "./pages/ProfileSetupPage";
import StudentDashboard  from "./pages/StudentDashboard";
import TestPage          from "./pages/TestPage";
import AnalyticsPage     from "./pages/AnalyticsPage";
import LeaderboardPage   from "./pages/LeaderboardPage";
import NotificationsPage from "./pages/NotificationsPage";
import ProfilePage       from "./pages/ProfilePage";

import AdminDashboard         from "./pages/admin/AdminDashboard";
import AdminTasksPage         from "./pages/admin/AdminTasksPage";
import AdminStudentsPage      from "./pages/admin/AdminStudentsPage";
import AdminCoursesPage       from "./pages/admin/AdminCoursesPage";
import AdminBulkUploadPage    from "./pages/admin/AdminBulkUploadPage";
import AdminAnalyticsPage     from "./pages/admin/AdminAnalyticsPage";
import AdminRecoveryDashboard from "./pages/admin/AdminRecoveryDashboard";

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

function ProfileGuard({ children }) {
  const { user } = useAuthStore();
  if (user?.role !== "admin" && user?.profile && !user.profile.profile_completed) {
    return <Navigate to="/setup" replace />;
  }
  return children;
}

function PublicRoute({ children }) {
  const { user, token } = useAuthStore();
  if (!token) return children;
  if (user?.role === "admin") return <Navigate to="/admin" replace />;
  if (!user?.profile?.profile_completed) return <Navigate to="/setup" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  const { theme, initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
  }, []);

  const isLight = theme === "light";

  // Theme-aware toast styles
  const toastStyle = isLight
    ? {
        background: "#ffffff",
        color: "#13103a",
        border: "1px solid rgba(99,102,241,0.18)",
        boxShadow: "0 8px 32px rgba(79,70,229,0.12), 0 2px 8px rgba(0,0,0,0.06)",
        borderRadius: "0.875rem",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "0.9rem",
      }
    : {
        background: "#0d1425",
        color: "#eef2ff",
        border: "1px solid rgba(99,120,255,0.18)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.40), 0 2px 8px rgba(0,0,0,0.20)",
        borderRadius: "0.875rem",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "0.9rem",
      };

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        gutter={10}
        toastOptions={{
          duration: 3500,
          style: toastStyle,
          success: {
            iconTheme: { primary: "#34d399", secondary: isLight ? "#ffffff" : "#0d1425" },
            style: {
              ...toastStyle,
              borderColor: "rgba(52,211,153,0.28)",
            },
          },
          error: {
            iconTheme: { primary: "#fb7185", secondary: isLight ? "#ffffff" : "#0d1425" },
            style: {
              ...toastStyle,
              borderColor: "rgba(251,113,133,0.28)",
            },
          },
          loading: {
            iconTheme: { primary: "#818cf8", secondary: isLight ? "#ffffff" : "#0d1425" },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/setup"    element={<ProtectedRoute><ProfileSetupPage /></ProtectedRoute>} />

        <Route path="/dashboard"      element={<ProtectedRoute><ProfileGuard><StudentDashboard /></ProfileGuard></ProtectedRoute>} />
        <Route path="/test/:courseId" element={<ProtectedRoute><ProfileGuard><TestPage /></ProfileGuard></ProtectedRoute>} />
        <Route path="/analytics"      element={<ProtectedRoute><ProfileGuard><AnalyticsPage /></ProfileGuard></ProtectedRoute>} />
        <Route path="/leaderboard"    element={<ProtectedRoute><ProfileGuard><LeaderboardPage /></ProfileGuard></ProtectedRoute>} />
        <Route path="/notifications"  element={<ProtectedRoute><ProfileGuard><NotificationsPage /></ProfileGuard></ProtectedRoute>} />
        <Route path="/profile"        element={<ProtectedRoute><ProfileGuard><ProfilePage /></ProfileGuard></ProtectedRoute>} />

        <Route path="/admin"           element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/tasks"     element={<ProtectedRoute adminOnly><AdminTasksPage /></ProtectedRoute>} />
        <Route path="/admin/students"  element={<ProtectedRoute adminOnly><AdminStudentsPage /></ProtectedRoute>} />
        <Route path="/admin/courses"   element={<ProtectedRoute adminOnly><AdminCoursesPage /></ProtectedRoute>} />
        <Route path="/admin/upload"    element={<ProtectedRoute adminOnly><AdminBulkUploadPage /></ProtectedRoute>} />
        <Route path="/admin/recovery"  element={<ProtectedRoute adminOnly><AdminRecoveryDashboard /></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute adminOnly><AdminAnalyticsPage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}