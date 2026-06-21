import { useState, useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import api from "../utils/api";
import Sidebar from "../components/shared/Sidebar";
import SkillRing from "../components/shared/SkillRing";
import toast from "react-hot-toast";
import {
  User, Mail, Phone, BookOpen, Calendar, Edit3,
  Save, X, Flame, Zap, Trophy, Target, TrendingUp
} from "lucide-react";

export default function ProfilePage() {
  const { user, refreshUser } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [dashboard, setDashboard] = useState(null);

  const profile = user?.profile;

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        gender: profile.gender || "",
        phone: profile.phone || "",
        education: profile.education || "",
        bio: profile.bio || "",
      });
    }
    api.get("/student/dashboard").then((r) => setDashboard(r.data)).catch(() => {});
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post("/student/profile/setup", {
        ...form,
        course_ids: profile?.courses?.map((c) => c.course_id) || [],
      });
      await refreshUser();
      setEditing(false);
      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const levelProgress = profile
    ? (() => {
        const thresholds = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 5700, 7500];
        const lvl = profile.level || 1;
        const curr = thresholds[lvl - 1] || 0;
        const next = thresholds[lvl] || curr + 500;
        return (((profile.total_xp || 0) - curr) / (next - curr)) * 100;
      })()
    : 0;

  return (
    <div className="flex h-screen bg-dark-950 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="font-display text-2xl font-bold text-white">My Profile</h1>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-2">
                <Edit3 className="w-4 h-4" /> Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="btn-secondary flex items-center gap-2">
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                  {saving
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left — Avatar + Stats */}
            <div className="space-y-5">
              {/* Avatar card */}
              <div className="card text-center">
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary-500/30 to-neon-purple/30 border-2 border-primary-500/40 flex items-center justify-center text-4xl font-bold text-white mb-4">
                  {profile?.full_name?.[0]?.toUpperCase() || "?"}
                </div>
                <h2 className="font-display text-xl font-bold text-white">{profile?.full_name || "Student"}</h2>
                <p className="text-dark-400 text-sm mt-1">{user?.email}</p>
                <div className="mt-3 flex items-center justify-center gap-1.5">
                  <span className="badge bg-primary-500/15 text-primary-400 border border-primary-500/25 px-3 py-1">
                    Level {profile?.level || 1}
                  </span>
                </div>

                {/* XP Progress */}
                <div className="mt-4 px-2">
                  <div className="flex justify-between text-xs text-dark-500 mb-1">
                    <span>{profile?.total_xp || 0} XP</span>
                    <span>Level {(profile?.level || 1) + 1}</span>
                  </div>
                  <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                    <div
                      className="xp-bar h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, Math.max(0, levelProgress))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="card space-y-3">
                <h3 className="text-sm font-semibold text-dark-400 uppercase tracking-wider">Stats</h3>
                {[
                  { icon: Flame,     label: "Current Streak",  value: `${profile?.current_streak || 0} days`,  color: "text-orange-400" },
                  { icon: Trophy,    label: "Longest Streak",  value: `${profile?.longest_streak || 0} days`,  color: "text-yellow-400" },
                  { icon: Zap,       label: "Total XP",        value: (profile?.total_xp || 0).toLocaleString(), color: "text-primary-400" },
                  { icon: Target,    label: "Level",           value: `Level ${profile?.level || 1}`,           color: "text-purple-400" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-dark-400">
                      <s.icon className={`w-4 h-4 ${s.color}`} />
                      {s.label}
                    </div>
                    <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Info + Courses */}
            <div className="lg:col-span-2 space-y-5">
              {/* Personal Info */}
              <div className="card space-y-4">
                <h3 className="font-semibold text-dark-200 flex items-center gap-2">
                  <User className="w-4 h-4 text-primary-400" /> Personal Information
                </h3>

                {editing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-dark-400 mb-1">Full Name</label>
                      <input className="input-field" value={form.full_name}
                        onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs text-dark-400 mb-1">Gender</label>
                      <select className="input-field" value={form.gender}
                        onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer_not">Prefer not to say</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-dark-400 mb-1">Phone</label>
                      <input className="input-field" value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs text-dark-400 mb-1">Education</label>
                      <select className="input-field" value={form.education}
                        onChange={(e) => setForm({ ...form, education: e.target.value })}>
                        <option value="">Select</option>
                        <option value="high_school">High School</option>
                        <option value="diploma">Diploma</option>
                        <option value="undergraduate">Undergraduate</option>
                        <option value="graduate">Graduate</option>
                        <option value="postgraduate">Post Graduate</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-dark-400 mb-1">Bio</label>
                      <textarea className="input-field resize-none" rows={3} value={form.bio}
                        onChange={(e) => setForm({ ...form, bio: e.target.value })}
                        placeholder="Tell us about yourself..." />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[
                      { icon: User,     label: "Full Name",  value: profile?.full_name   },
                      { icon: Mail,     label: "Email",      value: user?.email          },
                      { icon: Phone,    label: "Phone",      value: profile?.phone       },
                      { icon: BookOpen, label: "Education",  value: profile?.education   },
                    ].map((f) => (
                      <div key={f.label} className="flex items-center gap-3 py-2 border-b border-dark-800/50 last:border-0">
                        <f.icon className="w-4 h-4 text-dark-500 shrink-0" />
                        <span className="text-sm text-dark-500 w-24 shrink-0">{f.label}</span>
                        <span className="text-sm text-dark-200">{f.value || <span className="text-dark-600 italic">Not set</span>}</span>
                      </div>
                    ))}
                    {profile?.bio && (
                      <div className="pt-2">
                        <p className="text-xs text-dark-500 mb-1">Bio</p>
                        <p className="text-sm text-dark-300 leading-relaxed">{profile.bio}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Enrolled Courses */}
              <div className="card">
                <h3 className="font-semibold text-dark-200 flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-primary-400" /> Enrolled Courses
                </h3>
                {profile?.courses?.length > 0 ? (
                  <div className="space-y-3">
                    {profile.courses.map((c, i) => (
                      <div key={i} className="flex items-center gap-4 glass rounded-xl p-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-dark-100 truncate">{c.course_name}</p>
                          <p className="text-xs text-dark-500 mt-0.5">
                            Day {c.current_day} · Enrolled{" "}
                            {new Date(c.enrolled_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <SkillRing score={c.skill_score || 0} size={60} strokeWidth={5} label="" />
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-lg font-bold ${
                            c.skill_score >= 70 ? "text-emerald-400" :
                            c.skill_score >= 50 ? "text-yellow-400" : "text-rose-400"
                          }`}>{Math.round(c.skill_score || 0)}</p>
                          <p className="text-xs text-dark-600">skill</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-dark-500 text-sm">No courses enrolled yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
