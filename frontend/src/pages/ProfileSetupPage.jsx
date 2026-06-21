import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import api from "../utils/api";
import toast from "react-hot-toast";
import { CheckCircle2, ArrowRight, ArrowLeft, Brain, User, BookOpen } from "lucide-react";

const COURSE_COLORS = {
  "mern-stack":     "from-cyan-500/20 to-blue-500/20 border-cyan-500/30",
  "python-django":  "from-blue-500/20 to-indigo-500/20 border-blue-500/30",
  "data-science":   "from-orange-500/20 to-amber-500/20 border-orange-500/30",
  "java-springboot":"from-yellow-500/20 to-orange-500/20 border-yellow-500/30",
  "cloud-devops":   "from-slate-500/20 to-gray-500/20 border-slate-500/30",
  "react-native":   "from-cyan-500/20 to-teal-500/20 border-teal-500/30",
  "ui-ux":          "from-purple-500/20 to-pink-500/20 border-purple-500/30",
};

const STEPS = [
  { id: 1, label: "Personal Info",  icon: User         },
  { id: 2, label: "Select Courses", icon: BookOpen     },
  { id: 3, label: "All Set!",       icon: CheckCircle2 },
];

export default function ProfileSetupPage() {
  const [step,            setStep]            = useState(1);
  const [courses,         setCourses]         = useState([]);
  const [form,            setForm]            = useState({
    full_name: "", gender: "", phone: "",
    education: "", bio: "", date_of_birth: "",
  });
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [loading,         setLoading]         = useState(false);
  const { refreshUser }                       = useAuthStore();
  const navigate                              = useNavigate();

  // ── Fetch active courses — public endpoint, no auth needed ──
  useEffect(() => {
    api.get("/admin/courses/public")
      .then((r) => setCourses(r.data.filter(c => c.is_active !== false)))
      .catch(() => {
        // fallback: try the admin-protected list (works if student is logged in)
        api.get("/admin/courses")
          .then((r) => setCourses(r.data.filter(c => c.is_active !== false)))
          .catch(() => toast.error("Could not load courses"));
      });
  }, []);

  const toggleCourse = (id) => {
    setSelectedCourses((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!form.full_name.trim()) { toast.error("Name is required"); return; }
    if (selectedCourses.length === 0) { toast.error("Select at least one course"); return; }
    setLoading(true);
    try {
      await api.post("/student/profile/setup", { ...form, course_ids: selectedCourses });
      await refreshUser();
      toast.success("Profile setup complete! 🎉");
      setStep(3);
    } catch (e) {
      toast.error(e.response?.data?.error || "Setup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6">
      <div className="absolute top-0 left-0 w-full h-full bg-grid opacity-30 pointer-events-none" />
      <div className="absolute top-20 right-20 w-72 h-72 bg-primary-500/8 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl relative">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-4">
            <Brain className="w-4 h-4 text-primary-400" />
            <span className="text-sm text-dark-300">SkillTrack Setup</span>
          </div>
          <h1 className="font-display text-4xl font-bold text-white">
            {step === 3 ? "You're all set! 🎉" : "Set up your profile"}
          </h1>
          <p className="mt-2 text-dark-400">
            {step === 1 && "Tell us about yourself"}
            {step === 2 && "Pick the courses you want to master"}
            {step === 3 && "Start your learning journey"}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                step >= s.id
                  ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                  : "bg-dark-800 text-dark-500 border border-dark-700"
              }`}>
                <s.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:block">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 ${step > s.id ? "bg-primary-500" : "bg-dark-700"} transition-all`} />
              )}
            </div>
          ))}
        </div>

        <div className="card animate-fade-in">

          {/* ── Step 1: Personal Info ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Full Name *</label>
                  <input className="input-field" placeholder="Your full name"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Gender</label>
                  <select className="input-field" value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Date of Birth</label>
                  <input type="date" className="input-field" value={form.date_of_birth}
                    onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Phone</label>
                  <input className="input-field" placeholder="+91 9876543210"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Education</label>
                  <select className="input-field" value={form.education}
                    onChange={(e) => setForm({ ...form, education: e.target.value })}>
                    <option value="">Select education</option>
                    <option value="high_school">High School</option>
                    <option value="diploma">Diploma</option>
                    <option value="undergraduate">Undergraduate</option>
                    <option value="graduate">Graduate</option>
                    <option value="postgraduate">Post Graduate</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Bio (optional)</label>
                  <textarea className="input-field resize-none" rows={3}
                    placeholder="Tell us a little about yourself..."
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })} />
                </div>
              </div>
              <button
                onClick={() => {
                  if (!form.full_name.trim()) { toast.error("Name is required"); return; }
                  setStep(2);
                }}
                className="btn-primary w-full flex items-center justify-center gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Step 2: Courses ── */}
          {step === 2 && (
            <div className="space-y-5">
              <p className="text-sm text-dark-400">
                Select one or more courses (you can add more later)
              </p>

              {courses.length === 0 ? (
                <div className="text-center py-8 text-dark-500 text-sm">
                  Loading courses...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {courses.map((course) => {
                    const id       = course._id || course.id;
                    const selected = selectedCourses.includes(id);
                    const colorCls = COURSE_COLORS[course.slug]
                      || "from-primary-500/20 to-dark-700/20 border-primary-500/30";
                    return (
                      <button key={id} onClick={() => toggleCourse(id)}
                        className={`relative text-left p-4 rounded-xl border bg-gradient-to-br transition-all duration-200 ${
                          selected
                            ? colorCls + " scale-[1.02] shadow-card"
                            : "from-dark-800/50 to-dark-800/30 border-dark-700 hover:border-dark-600"
                        }`}>
                        {selected && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle2 className="w-5 h-5 text-primary-400" />
                          </div>
                        )}
                        <div className="text-2xl mb-2">{course.icon}</div>
                        <div className="font-semibold text-sm text-dark-100">{course.name}</div>
                        <div className="text-xs text-dark-500 mt-1">{course.description}</div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)}
                  className="btn-secondary flex items-center gap-2 px-4">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={handleSubmit}
                  disabled={loading || selectedCourses.length === 0}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><CheckCircle2 className="w-4 h-4" /> Complete Setup</>}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Done ── */}
          {step === 3 && (
            <div className="text-center space-y-6 py-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-500/20 to-primary-500/20 border border-emerald-500/30 flex items-center justify-center animate-float">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-display text-2xl font-bold text-white">Welcome to SkillTrack! 🚀</h3>
                <p className="mt-2 text-dark-400">Your profile is complete. Daily AI tasks are ready for you.</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Courses Enrolled", value: selectedCourses.length },
                  { label: "Today's Tasks",    value: "Ready"                },
                  { label: "Starting XP",      value: "0"                   },
                ].map(s => (
                  <div key={s.label} className="glass rounded-xl p-3">
                    <div className="font-display text-2xl font-bold text-primary-400">{s.value}</div>
                    <div className="text-xs text-dark-500 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate("/dashboard")}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}