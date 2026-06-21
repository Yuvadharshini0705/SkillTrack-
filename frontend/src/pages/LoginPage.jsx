import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";
import { Eye, EyeOff, Zap, Brain, TrendingUp } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const { login, isLoading }    = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success) {
      toast.success("Welcome back!");
      const user = result.user;
      if (user?.role === "admin") {
        navigate("/admin");
      } else if (!user?.profile?.profile_completed) {
        // First time login → profile not set up yet
        navigate("/setup");
      } else {
        // Returning user → go straight to dashboard
        navigate("/dashboard");
      }
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex overflow-hidden">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 bg-gradient-to-br from-dark-900 to-dark-950">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-neon-purple/8 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-neon-purple flex items-center justify-center shadow-neon-blue">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-white">SkillTrack</span>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="font-display text-5xl font-bold text-white leading-tight">
              Intelligence-Driven<br />
              <span className="gradient-text">Skill Mastery</span>
            </h1>
            <p className="mt-4 text-dark-400 text-lg leading-relaxed">
            Daily tasks, real-time skill decay detection, and adaptive recovery — all in one platform.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: Zap, color: "text-neon-blue", bg: "bg-neon-blue/10", title: "Daily Tests", desc: "Each day has its own set of MCQs, debugging & coding tasks" },
              { icon: Brain, color: "text-neon-purple", bg: "bg-neon-purple/10", title: "Skill Decay Detection", desc: "Rule-based engine monitors performance and alerts before skills fade" },
              { icon: TrendingUp, color: "text-neon-green", bg: "bg-neon-green/10", title: "Day-by-Day Curriculum", desc: "Structured learning path from beginner to expert across 7 tech tracks" },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-4 glass rounded-xl p-4">
                <div className={`${f.bg} rounded-lg p-2 mt-0.5 shrink-0`}>
                  <f.icon className={`w-4 h-4 ${f.color}`} />
                </div>
                <div>
                  <p className="font-semibold text-dark-100 text-sm">{f.title}</p>
                  <p className="text-dark-400 text-xs mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-slide-up">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-neon-purple flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-white">SkillTrack</span>
          </div>

          <h2 className="font-display text-3xl font-bold text-white">Welcome back</h2>
          <p className="mt-2 text-dark-400">Sign in to continue your learning journey</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="input-field" placeholder="you@example.com" required autoComplete="email" />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-12" placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              className="btn-primary w-full py-3 mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : "Sign In"}
            </button>

            {/* Demo credentials */}
            <div className="glass rounded-xl p-3 text-center">
              <p className="text-dark-500 text-xs mb-1.5">Credentials</p>
              <div className="flex gap-2 justify-center flex-wrap">
                <button type="button" onClick={() => { setEmail("yuvadharshini0705@gmail.com"); setPassword("admin@123"); }}
                  className="text-xs bg-primary-500/10 text-primary-400 border border-primary-500/20 px-2.5 py-1 rounded-lg hover:bg-primary-500/20 transition-colors">
                  Admin Login
                </button>
                <button type="button" onClick={() => { setEmail("student@test.com"); setPassword("student@123"); }}
                  className="text-xs bg-neon-purple/10 text-purple-400 border border-purple-500/20 px-2.5 py-1 rounded-lg hover:bg-neon-purple/20 transition-colors">
                  Student Login
                </button>
              </div>
            </div>
          </form>

          <p className="mt-6 text-center text-dark-400 text-sm">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary-400 hover:text-primary-300 font-semibold transition-colors">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}