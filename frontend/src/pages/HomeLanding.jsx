import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DnaHelixBackground from "../components/DnaHelixBackground";

const HomeLanding = () => {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY || 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const floatOffset = useMemo(() => Math.min(120, scrollY * 0.12), [scrollY]);
  const pulseScale = useMemo(() => 1 + Math.min(0.08, scrollY / 6000), [scrollY]);

  return (
    <div className="space-y-16 pb-12">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-soft sm:p-12">
        <DnaHelixBackground />
        <div className="hero-grid absolute inset-0 opacity-55" />
        <div
          className="hero-orb absolute -right-16 -top-14 h-56 w-56 rounded-full"
          style={{ transform: `translateY(${floatOffset * 0.5}px) scale(${pulseScale})` }}
        />
        <div
          className="hero-orb-alt absolute -left-12 bottom-0 h-44 w-44 rounded-full"
          style={{ transform: `translateY(${-floatOffset * 0.35}px)` }}
        />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <p className="mx-auto inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            <span>🧬</span>
            AI-Powered Clinical Trials
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight text-slate-900 sm:text-5xl">
            Find the Right <span className="bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 bg-clip-text text-transparent">Clinical Trials</span> with AI
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Transform anonymized patient records into explainable trial recommendations, reduce manual screening effort, and improve
            healthcare research workflows.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" className="btn-primary" onClick={() => navigate("/login?role=patient&mode=login")}>
              Get Started
            </button>
            <button type="button" className="btn-secondary" onClick={() => navigate("/login?role=doctor&mode=login")}>
              Learn More
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { icon: "🎯", title: "Smart Matching", text: "Rule-based + NLP-assisted matching with clear scores and reason traces." },
          { icon: "🛡️", title: "Privacy First", text: "Anonymization checks, redaction logs, and secure patient references." },
          { icon: "⚖️", title: "Fairness Snapshot", text: "Cohort match-rate visibility by gender, age band, and city." },
        ].map((item) => (
          <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
            <p className="text-2xl">{item.icon}</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{item.text}</p>
          </article>
        ))}
      </section>

    </div>
  );
};

export default HomeLanding;
