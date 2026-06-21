import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Brain, Zap, TrendingUp, Shield, ChevronRight,
  Code2, Bug, HelpCircle, BarChart3, Trophy,
  Flame, Users, Star, ArrowRight, Play,
  CheckCircle, Clock, Target
} from "lucide-react";

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ end, suffix = "", duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          let start = 0;
          const step = end / (duration / 16);
          const timer = setInterval(() => {
            start += step;
            if (start >= end) { setCount(end); clearInterval(timer); }
            else setCount(Math.floor(start));
          }, 16);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ── Floating particle ─────────────────────────────────────────────────────────
function Particle({ x, y, size, delay, color }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: `${x}%`, top: `${y}%`,
        width: size, height: size,
        background: color,
        opacity: 0.15,
        animation: `particleFloat ${3 + delay}s ease-in-out ${delay}s infinite alternate`,
      }}
    />
  );
}

// ── Task type card ────────────────────────────────────────────────────────────
function TaskTypeCard({ icon: Icon, label, count, color, bg, desc }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/3 p-6 hover:bg-white/6 hover:border-white/10 transition-all duration-300 hover:-translate-y-1">
      <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div className={`text-3xl font-black font-mono mb-1 ${color}`}>{count}</div>
      <div className="text-white font-bold text-sm mb-1">{label}</div>
      <div className="text-white/40 text-xs leading-relaxed">{desc}</div>
      <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-5 group-hover:opacity-10 transition-opacity duration-300" style={{ background: `radial-gradient(circle, currentColor, transparent)` }} />
    </div>
  );
}

// ── Feature row ───────────────────────────────────────────────────────────────
function Feature({ icon: Icon, title, desc, color, index }) {
  return (
    <div
      className="flex gap-4 p-6 rounded-2xl border border-white/5 hover:border-white/10 hover:bg-white/3 transition-all duration-300 group"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color} group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-white font-semibold text-sm mb-1">{title}</h3>
        <p className="text-white/45 text-xs leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ── Course badge ──────────────────────────────────────────────────────────────
function CourseBadge({ icon, name, color }) {
  return (
    <div
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15 transition-all duration-200 cursor-pointer group"
    >
      <span className="text-lg group-hover:scale-110 transition-transform duration-200">{icon}</span>
      <span className="text-white/70 text-xs font-medium group-hover:text-white/90 transition-colors">{name}</span>
    </div>
  );
}

// ── Testimonial card ──────────────────────────────────────────────────────────
function TestimonialCard({ name, role, quote, level, xp }) {
  return (
    <div className="relative p-6 rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm hover:border-white/15 hover:bg-white/5 transition-all duration-300">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500/30 to-violet-500/30 border border-white/15 flex items-center justify-center text-sm font-bold text-white">
          {name[0]}
        </div>
        <div>
          <p className="text-white text-sm font-semibold">{name}</p>
          <p className="text-white/40 text-xs">{role}</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
        </div>
      </div>
      <p className="text-white/60 text-sm leading-relaxed mb-4">"{quote}"</p>
      <div className="flex items-center gap-3 pt-3 border-t border-white/6">
        <span className="text-xs text-sky-400 font-mono font-bold">Lv.{level}</span>
        <span className="text-white/20">·</span>
        <span className="text-xs text-amber-400 font-mono flex items-center gap-1">
          <Zap className="w-3 h-3" />{xp.toLocaleString()} XP
        </span>
      </div>
    </div>
  );
}

// ── Mock dashboard preview ────────────────────────────────────────────────────
function DashboardPreview() {
  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Glow behind */}
      <div className="absolute inset-0 bg-sky-500/10 blur-3xl rounded-3xl scale-110" />

      <div className="relative rounded-2xl border border-white/10 bg-dark-900/90 backdrop-blur-xl overflow-hidden shadow-2xl">
        {/* Header bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/3">
          <div className="w-3 h-3 rounded-full bg-rose-500/70" />
          <div className="w-3 h-3 rounded-full bg-amber-500/70" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
          <div className="ml-2 flex-1 bg-white/5 rounded-md h-5 px-2 flex items-center">
            <span className="text-white/30 text-xs">skilltrack.app/dashboard</span>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Greeting */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/40 text-xs">Good morning</p>
              <h4 className="text-white font-bold text-base">Arunkumar 👋</h4>
            </div>
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-400 text-xs font-bold">12 day streak</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Total XP", value: "4,820", color: "text-sky-400" },
              { label: "Level",    value: "Lv.7",   color: "text-violet-400" },
              { label: "Skill",    value: "82/100", color: "text-emerald-400" },
            ].map(s => (
              <div key={s.label} className="bg-white/4 rounded-xl p-3 text-center border border-white/5">
                <div className={`font-black font-mono text-lg ${s.color}`}>{s.value}</div>
                <div className="text-white/35 text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Course card */}
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">⚛️</span>
              <div>
                <p className="text-white text-sm font-semibold">MERN Stack</p>
                <p className="text-sky-400/70 text-xs">Day 14 · 3 tests pending</p>
              </div>
              <div className="ml-auto">
                <div className="w-10 h-10 rounded-full border-2 border-sky-500/40 flex items-center justify-center">
                  <span className="text-sky-400 font-black text-sm font-mono">82</span>
                </div>
              </div>
            </div>

            {/* Task type pills */}
            <div className="flex gap-1.5 mb-3">
              <span className="text-xs px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-400 border border-violet-500/25 font-medium">MCQ ×10</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/25 font-medium">Debug ×4</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 font-medium">Coding ×1</span>
            </div>

            <button className="w-full bg-sky-500 hover:bg-sky-400 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors duration-200">
              <Play className="w-4 h-4" />
              Start Day 14 Test
            </button>
          </div>

          {/* Skill bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-white/40 text-xs">Skill Score</span>
              <span className="text-emerald-400 text-xs font-bold font-mono">82/100 — Proficient</span>
            </div>
            <div className="h-2 bg-white/6 rounded-full overflow-hidden">
              <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-sky-500 to-emerald-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main HomePage ─────────────────────────────────────────────────────────────
export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const particles = [
    { x: 10, y: 15, size: 6, delay: 0, color: "#0ea5e9" },
    { x: 85, y: 10, size: 10, delay: 1, color: "#a855f7" },
    { x: 70, y: 40, size: 5, delay: 2, color: "#00ff88" },
    { x: 20, y: 60, size: 8, delay: 0.5, color: "#0ea5e9" },
    { x: 90, y: 70, size: 6, delay: 1.5, color: "#a855f7" },
    { x: 50, y: 85, size: 9, delay: 2.5, color: "#ff6b35" },
    { x: 5, y: 90, size: 5, delay: 1.2, color: "#00ff88" },
    { x: 95, y: 30, size: 7, delay: 0.8, color: "#0ea5e9" },
  ];

  const courses = [
    { icon: "⚛️", name: "MERN Stack" },
    { icon: "🐍", name: "Python & Django" },
    { icon: "📊", name: "Data Science & ML" },
    { icon: "☕", name: "Java & Spring Boot" },
    { icon: "☁️", name: "Cloud & DevOps" },
    { icon: "📱", name: "React Native" },
    { icon: "🎨", name: "UI/UX Design" },
  ];

  const features = [
    { icon: Zap,       title: "Daily Adaptive Tests",       color: "bg-sky-500/15 text-sky-400",     desc: "15 questions per day — 10 MCQ, 4 Debug, 1 Coding — automatically calibrated to your phase and skill." },
    { icon: TrendingUp,title: "Skill Decay Detection",      color: "bg-violet-500/15 text-violet-400",desc: "A composite engine tracks inactivity, weak topics, and failure streaks, alerting you before skills fade." },
    { icon: Shield,    title: "Recovery Mode",               color: "bg-emerald-500/15 text-emerald-400",desc: "When your score drops below 50, easier tasks are served automatically to rebuild confidence and score." },
    { icon: Trophy,    title: "XP & Leaderboard",           color: "bg-amber-500/15 text-amber-400", desc: "Earn XP on every correct answer. Climb the leaderboard and maintain streaks across enrolled courses." },
    { icon: BarChart3, title: "Deep Analytics",             color: "bg-rose-500/15 text-rose-400",   desc: "Per-topic accuracy, weak area identification, daily submission trends and skill score progression charts." },
    { icon: Clock,     title: "Midnight Day Unlock (IST)",  color: "bg-cyan-500/15 text-cyan-400",   desc: "Pass today's test and the next day unlocks at midnight IST — keeping your schedule disciplined and consistent." },
  ];

  const testimonials = [
    { name: "Priya S.",    role: "MERN Stack student",    level: 8,  xp: 5200, quote: "The daily tests are addictive — I went from knowing nothing about Node.js to building full APIs in 3 weeks." },
    { name: "Rajan K.",    role: "Data Science track",    level: 6,  xp: 3800, quote: "Skill decay alerts saved me twice. I was slipping on pandas and got notified before my score dropped too far." },
    { name: "Ananya M.",   role: "Python & Django track", level: 10, xp: 7400, quote: "The debug questions are tough but rewarding. I now spot off-by-one errors instantly." },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-x-hidden">
      {/* CSS for particles & misc animations */}
      <style>{`
        @keyframes particleFloat {
          0% { transform: translateY(0px) scale(1); }
          100% { transform: translateY(-20px) scale(1.2); }
        }
        @keyframes heroReveal {
          0% { opacity: 0; transform: translateY(24px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmerBg {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .hero-text { animation: heroReveal 0.8s ease-out both; }
        .hero-text-1 { animation-delay: 0.1s; }
        .hero-text-2 { animation-delay: 0.25s; }
        .hero-text-3 { animation-delay: 0.4s; }
        .hero-text-4 { animation-delay: 0.55s; }
        .gradient-shimmer {
          background: linear-gradient(135deg, #0ea5e9, #a855f7, #00d4ff, #a855f7, #0ea5e9);
          background-size: 300% 300%;
          animation: shimmerBg 5s ease infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .mesh-bg {
          background:
            radial-gradient(ellipse at 20% 20%, rgba(14,165,233,0.12) 0%, transparent 55%),
            radial-gradient(ellipse at 80% 10%, rgba(168,85,247,0.10) 0%, transparent 50%),
            radial-gradient(ellipse at 10% 80%, rgba(0,255,136,0.06) 0%, transparent 50%),
            radial-gradient(ellipse at 90% 90%, rgba(255,107,53,0.05) 0%, transparent 50%);
        }
        .bg-grid {
          background-image:
            linear-gradient(rgba(14,165,233,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(14,165,233,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
        }
        .glow-line {
          background: linear-gradient(90deg, transparent, rgba(14,165,233,0.5), transparent);
        }
      `}</style>

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-[#020617]/90 backdrop-blur-xl border-b border-white/5" : "bg-transparent"
      }`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center shadow-lg shadow-sky-500/30">
              <Brain className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <span className="font-black text-lg tracking-tight text-white">
              Skill<span className="text-sky-400">Track</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm text-white/50">
            <a href="#features" className="hover:text-white/80 transition-colors">Features</a>
            <a href="#courses" className="hover:text-white/80 transition-colors">Courses</a>
            <a href="#how-it-works" className="hover:text-white/80 transition-colors">How It Works</a>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-white/60 hover:text-white transition-colors font-medium hidden md:block">
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-sm font-bold bg-sky-500 hover:bg-sky-400 text-white px-5 py-2 rounded-xl transition-all duration-200 shadow-lg shadow-sky-500/25 hover:shadow-sky-400/30"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Background layers */}
        <div className="absolute inset-0 bg-grid opacity-100" />
        <div className="absolute inset-0 mesh-bg" />
        {/* Particles */}
        {particles.map((p, i) => <Particle key={i} {...p} />)}
        {/* Horizontal glow line */}
        <div className="absolute top-1/2 left-0 right-0 h-px glow-line opacity-30" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: text */}
          <div>
            {/* Eyebrow */}
            <div className="hero-text hero-text-1 inline-flex items-center gap-2 bg-sky-500/10 border border-sky-500/20 px-4 py-2 rounded-full mb-8">
              <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span className="text-sky-400 text-xs font-bold uppercase tracking-widest">Task-Based Intelligence Monitoring</span>
            </div>

            <h1 className="hero-text hero-text-2 font-black text-5xl md:text-6xl leading-[1.05] tracking-tight mb-6">
              Master Skills{" "}
              <br />
              <span className="gradient-shimmer">That Actually</span>
              <br />
              Stick
            </h1>

            <p className="hero-text hero-text-3 text-white/50 text-lg leading-relaxed mb-10 max-w-md">
              15 daily questions — MCQ, debug, and coding — with adaptive difficulty,
              real-time skill decay alerts, and midnight unlocks to keep you consistent.
            </p>

            <div className="hero-text hero-text-4 flex flex-wrap gap-4 mb-12">
              <Link
                to="/register"
                className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-bold px-7 py-3.5 rounded-xl transition-all duration-200 shadow-xl shadow-sky-500/25 hover:shadow-sky-400/35 hover:-translate-y-0.5 text-sm"
              >
                Start Learning Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/80 hover:text-white font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 text-sm"
              >
                <Play className="w-4 h-4" />
                View Demo
              </Link>
            </div>

            {/* Social proof numbers */}
            <div className="hero-text hero-text-4 flex items-center gap-6 text-sm">
              <div>
                <div className="text-white font-black text-2xl font-mono">
                  <Counter end={2400} suffix="+" />
                </div>
                <div className="text-white/35 text-xs">students enrolled</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <div className="text-white font-black text-2xl font-mono">
                  <Counter end={7} /> courses
                </div>
                <div className="text-white/35 text-xs">across tech tracks</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <div className="text-white font-black text-2xl font-mono">
                  <Counter end={95} suffix="%" />
                </div>
                <div className="text-white/35 text-xs">completion rate</div>
              </div>
            </div>
          </div>

          {/* Right: dashboard preview */}
          <div className="hero-text hero-text-3">
            <DashboardPreview />
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <div className="w-5 h-8 rounded-full border border-white/15 flex items-start justify-center pt-1.5">
            <div className="w-1 h-2 rounded-full bg-white/30" />
          </div>
        </div>
      </section>

      {/* ── TASK TYPES ─────────────────────────────────────────────────────── */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-white/1" />
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sky-400 text-xs font-bold uppercase tracking-widest mb-3">Every. Single. Day.</p>
            <h2 className="text-white font-black text-3xl md:text-4xl tracking-tight mb-4">
              15 Questions. 3 Types. Zero Shortcuts.
            </h2>
            <p className="text-white/45 max-w-xl mx-auto text-sm leading-relaxed">
              Each day is a structured gauntlet. The same format, every day — so you build real habits, not one-off cramming sessions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <TaskTypeCard
              icon={HelpCircle}
              label="Multiple Choice"
              count="10"
              color="text-violet-400"
              bg="bg-violet-500/10"
              desc="Concept recall, edge cases, and syntax gotchas — all with instant explanations after submission."
            />
            <TaskTypeCard
              icon={Bug}
              label="Debug Challenges"
              count="4"
              color="text-amber-400"
              bg="bg-amber-500/10"
              desc="Real buggy code snippets. Find the issue, fix it, rate your confidence. Self-scored with model solutions."
            />
            <TaskTypeCard
              icon={Code2}
              label="Coding Problem"
              count="1"
              color="text-cyan-400"
              bg="bg-cyan-500/10"
              desc="One meaty algorithm or function per day with starter code, constraints, and a clean reference solution."
            />
          </div>

          {/* Phase progression */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { phase: "Days 1–15",  label: "Foundation",  color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
              { phase: "Days 16–30", label: "Core Skills", color: "bg-sky-500/15 text-sky-400 border-sky-500/20" },
              { phase: "Days 31–60", label: "Advanced",    color: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
              { phase: "Days 61+",   label: "Expert",      color: "bg-rose-500/15 text-rose-400 border-rose-500/20" },
            ].map(p => (
              <div key={p.phase} className={`rounded-xl border p-3 text-center ${p.color}`}>
                <div className="font-black text-xs mb-0.5">{p.label}</div>
                <div className="text-white/30 text-xs font-mono">{p.phase}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 relative">
        <div className="absolute inset-0 mesh-bg opacity-50" />
        <div className="max-w-6xl mx-auto px-6 relative">
          <div className="text-center mb-14">
            <p className="text-violet-400 text-xs font-bold uppercase tracking-widest mb-3">Under the hood</p>
            <h2 className="text-white font-black text-3xl md:text-4xl tracking-tight mb-4">
              Built Different. Tracks Everything.
            </h2>
            <p className="text-white/45 max-w-xl mx-auto text-sm leading-relaxed">
              SkillTrack doesn't just quiz you — it watches your patterns and responds intelligently.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {features.map((f, i) => <Feature key={f.title} {...f} index={i} />)}
          </div>
        </div>
      </section>

      {/* ── COURSES ────────────────────────────────────────────────────────── */}
      <section id="courses" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3">7 tracks available</p>
            <h2 className="text-white font-black text-3xl md:text-4xl tracking-tight mb-4">
              Pick Your Stack, Own It.
            </h2>
            <p className="text-white/45 max-w-xl mx-auto text-sm leading-relaxed">
              From MERN to ML. Each course has its own curriculum, phase progression, and question bank — built for the real job market.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 justify-center mb-10">
            {courses.map(c => <CourseBadge key={c.name} {...c} />)}
          </div>

          <div className="text-center">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 text-sm font-bold text-sky-400 hover:text-sky-300 border border-sky-500/25 hover:border-sky-400/40 px-6 py-3 rounded-xl transition-all duration-200 hover:bg-sky-500/5"
            >
              Enroll in a course
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-white/1">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-3">Simple. Consistent. Effective.</p>
            <h2 className="text-white font-black text-3xl md:text-4xl tracking-tight">
              How SkillTrack Works
            </h2>
          </div>

          <div className="relative">
            {/* Connector line */}
            <div className="hidden md:block absolute left-1/2 top-8 bottom-8 w-px bg-gradient-to-b from-sky-500/40 via-violet-500/30 to-transparent -translate-x-1/2" />

            <div className="space-y-8 md:space-y-12">
              {[
                {
                  step: "01", side: "left",
                  icon: Target, color: "text-sky-400", bg: "bg-sky-500/10",
                  title: "Sign up & pick your courses",
                  desc: "Create an account, set up your profile, and enroll in one or more of our 7 tech tracks. Your Day 1 test is ready immediately.",
                },
                {
                  step: "02", side: "right",
                  icon: Play, color: "text-violet-400", bg: "bg-violet-500/10",
                  title: "Take your daily 15-question test",
                  desc: "Each day unlocks at midnight after the previous day's test is submitted. 10 MCQ + 4 Debug + 1 Coding, calibrated to your phase.",
                },
                {
                  step: "03", side: "left",
                  icon: BarChart3, color: "text-emerald-400", bg: "bg-emerald-500/10",
                  title: "Get instant feedback & score updates",
                  desc: "Your skill score updates after each submission. Explanations are shown inline. Weak topics are flagged for the next decay check.",
                },
                {
                  step: "04", side: "right",
                  icon: Shield, color: "text-amber-400", bg: "bg-amber-500/10",
                  title: "Skill decay engine watches overnight",
                  desc: "At midnight the engine runs. Inactivity, failed streaks, and weak topic patterns trigger decay — and recovery tasks if needed.",
                },
              ].map((item, i) => (
                <div key={item.step} className={`flex items-center gap-8 ${item.side === "right" ? "md:flex-row-reverse" : ""}`}>
                  <div className="flex-1 p-6 rounded-2xl border border-white/6 bg-white/2 hover:bg-white/4 hover:border-white/10 transition-all duration-300">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                        <item.icon className={`w-6 h-6 ${item.color}`} />
                      </div>
                      <div>
                        <div className={`text-xs font-black font-mono mb-1 ${item.color} opacity-60`}>STEP {item.step}</div>
                        <h3 className="text-white font-bold text-base mb-2">{item.title}</h3>
                        <p className="text-white/45 text-sm leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                  {/* Center dot */}
                  <div className="hidden md:flex w-4 h-4 rounded-full border-2 border-sky-500/50 bg-sky-500/20 shrink-0 items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  </div>
                  <div className="hidden md:block flex-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────────────────────────── */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-500/5 via-violet-500/5 to-sky-500/5" />
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: 2400, suffix: "+", label: "Students",       color: "text-sky-400" },
              { value: 15,   suffix: "",  label: "Questions/Day",  color: "text-violet-400" },
              { value: 7,    suffix: "",  label: "Tech Courses",   color: "text-emerald-400" },
              { value: 180,  suffix: "d", label: "Curriculum",     color: "text-amber-400" },
            ].map(s => (
              <div key={s.label} className="p-6">
                <div className={`font-black text-4xl font-mono mb-2 ${s.color}`}>
                  <Counter end={s.value} suffix={s.suffix} />
                </div>
                <div className="text-white/35 text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-rose-400 text-xs font-bold uppercase tracking-widest mb-3">From our students</p>
            <h2 className="text-white font-black text-3xl md:text-4xl tracking-tight">
              Real People. Real Progress.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testimonials.map(t => <TestimonialCard key={t.name} {...t} />)}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-violet-500/8 to-transparent" />
        <div className="absolute inset-0 mesh-bg" />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full mb-8">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-xs font-bold">Free to get started · No credit card required</span>
          </div>

          <h2 className="text-white font-black text-4xl md:text-5xl leading-tight tracking-tight mb-6">
            Stop Reading Tutorials.<br />
            <span className="gradient-shimmer">Start Building Muscle Memory.</span>
          </h2>

          <p className="text-white/45 text-base leading-relaxed mb-10 max-w-lg mx-auto">
            Join 2,400+ students who test every single day. Your first 15 questions are waiting right now.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to="/register"
              className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-black px-8 py-4 rounded-xl transition-all duration-200 shadow-2xl shadow-sky-500/30 hover:shadow-sky-400/40 hover:-translate-y-0.5 text-sm"
            >
              Create Free Account
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/70 hover:text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 text-sm"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-base text-white">Skill<span className="text-sky-400">Track</span></span>
              <span className="text-white/20 text-sm hidden md:block">· Task-Based Intelligence Monitoring System</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-white/30">
              <span>© 2025 SkillTrack</span>
              <span>·</span>
              <span>7 Courses</span>
              <span>·</span>
              <Link to="/login" className="hover:text-white/60 transition-colors">Sign In</Link>
              <span>·</span>
              <Link to="/register" className="hover:text-white/60 transition-colors">Register</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}