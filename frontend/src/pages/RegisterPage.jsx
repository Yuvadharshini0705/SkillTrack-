import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";
import { Eye, EyeOff, Brain, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPass, setShowPass] = useState(false);
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const passwordStrength = () => {
    if (password.length === 0) return 0;
    let s = 0;
    if (password.length >= 6)           s++;
    if (password.length >= 10)          s++;
    if (/[A-Z]/.test(password))         s++;
    if (/[0-9]/.test(password))         s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  };

  const strengthColors = ["", "bg-rose-500", "bg-orange-500", "bg-yellow-500", "bg-emerald-500", "bg-emerald-400"];
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { toast.error("Passwords don't match"); return; }
    if (password.length < 6)  { toast.error("Password must be at least 6 characters"); return; }

    const result = await register(email, password);
    if (result.success) {
      toast.success("Account created! Please login to continue.");
      // After register → go to LOGIN page (not setup)
      navigate("/login");
    } else {
      toast.error(result.error);
    }
  };

  const strength = passwordStrength();

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-8">
      <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-72 h-72 bg-neon-purple/8 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative animate-slide-up">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-neon-purple flex items-center justify-center shadow-neon-blue">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="font-display text-xl font-bold text-white">SkillTrack</span>
        </div>

        <div className="card">
          <h2 className="font-display text-2xl font-bold text-white text-center">Create your account</h2>
          <p className="mt-1 text-dark-400 text-center text-sm">Start your learning journey</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="input-field" placeholder="you@example.com" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-12" placeholder="Min. 6 characters" required />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength ? strengthColors[strength] : "bg-dark-700"} transition-all`} />
                    ))}
                  </div>
                  <p className="text-xs text-dark-500">{strengthLabels[strength]}</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Confirm Password</label>
              <div className="relative">
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  className="input-field pr-10" placeholder="Re-enter password" required />
                {confirm && password === confirm && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                )}
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              className="btn-primary w-full py-3 mt-2 disabled:opacity-50">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : "Create Account"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-dark-400 text-sm">
          Already have an account?{" "}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 font-semibold transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}