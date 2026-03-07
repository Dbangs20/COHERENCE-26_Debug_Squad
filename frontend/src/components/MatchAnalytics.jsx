import { useMemo, useState } from "react";

const getStatusLabel = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("strong")) return "Strong";
  if (normalized.includes("moderate")) return "Moderate";
  return "Low";
};

const getBarColor = (score) => {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-rose-500";
};

const MatchAnalytics = ({ matchResults = [] }) => {
  const [filters, setFilters] = useState({
    disease: "",
    phase: "",
    minimumScore: 0,
  });

  const diseases = useMemo(
    () => [...new Set(matchResults.map((item) => item.disease).filter(Boolean))],
    [matchResults],
  );
  const phases = useMemo(
    () => [...new Set(matchResults.map((item) => item.phase).filter(Boolean))],
    [matchResults],
  );

  const filteredResults = useMemo(() => {
    return matchResults.filter((item) => {
      const matchesDisease = !filters.disease || String(item.disease || "").toLowerCase() === filters.disease.toLowerCase();
      const matchesPhase = !filters.phase || String(item.phase || "").toLowerCase() === filters.phase.toLowerCase();
      const matchesScore = Number(item.score || 0) >= Number(filters.minimumScore || 0);
      return matchesDisease && matchesPhase && matchesScore;
    });
  }, [matchResults, filters]);

  const distribution = useMemo(() => {
    const counts = { Strong: 0, Moderate: 0, Low: 0 };
    filteredResults.forEach((item) => {
      counts[getStatusLabel(item.status)] += 1;
    });
    return counts;
  }, [filteredResults]);

  const totalDistribution = distribution.Strong + distribution.Moderate + distribution.Low;
  const strongPercent = totalDistribution ? (distribution.Strong / totalDistribution) * 100 : 0;
  const moderatePercent = totalDistribution ? (distribution.Moderate / totalDistribution) * 100 : 0;
  const lowPercent = totalDistribution ? (distribution.Low / totalDistribution) * 100 : 0;

  const radarData = useMemo(() => {
    const top = filteredResults[0];
    const checks = top?.detailed_checks || [];
    const valueFor = (criterion) => {
      const found = checks.find((item) => String(item.criterion || "").toLowerCase() === criterion.toLowerCase());
      return Math.max(0, Number(found?.contribution || 0));
    };
    return [
      { name: "Age", value: valueFor("Age") || 0 },
      { name: "Disease", value: valueFor("Disease") || 0 },
      { name: "Stage", value: valueFor("Stage") || 0 },
      { name: "Biomarker", value: valueFor("Biomarker") || 0 },
      { name: "Location", value: valueFor("Location") || 0 },
    ];
  }, [filteredResults]);

  const radarPoints = useMemo(() => {
    const centerX = 110;
    const centerY = 110;
    const radius = 70;
    return radarData.map((item, index) => {
      const angle = ((Math.PI * 2) / radarData.length) * index - Math.PI / 2;
      const scaledRadius = (Number(item.value || 0) / 20) * radius;
      return {
        x: centerX + Math.cos(angle) * scaledRadius,
        y: centerY + Math.sin(angle) * scaledRadius,
        labelX: centerX + Math.cos(angle) * (radius + 20),
        labelY: centerY + Math.sin(angle) * (radius + 20),
        name: item.name,
      };
    });
  }, [radarData]);

  const polygonPoints = radarPoints.map((item) => `${item.x},${item.y}`).join(" ");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold text-slate-900">Trial Match Analytics</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <select
          className="input-base"
          value={filters.disease}
          onChange={(event) => setFilters((prev) => ({ ...prev, disease: event.target.value }))}
        >
          <option value="">Filter by disease</option>
          {diseases.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          className="input-base"
          value={filters.phase}
          onChange={(event) => setFilters((prev) => ({ ...prev, phase: event.target.value }))}
        >
          <option value="">Filter by trial phase</option>
          {phases.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <input
          className="input-base"
          type="number"
          min="0"
          max="100"
          value={filters.minimumScore}
          onChange={(event) => setFilters((prev) => ({ ...prev, minimumScore: event.target.value }))}
          placeholder="Minimum score"
        />
      </div>

      {filteredResults.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No trials available for selected analytics filters.</p>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
            <p className="text-sm font-semibold text-slate-900">Trial Match Score Comparison</p>
            <div className="mt-3 space-y-3">
              {filteredResults.map((trial) => (
                <div key={`bar-${trial.trial_id}`}>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                    <span className="truncate pr-3">{trial.title}</span>
                    <span className="font-semibold">{trial.score}</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-3 rounded-full ${getBarColor(Number(trial.score || 0))}`}
                      style={{ width: `${Math.max(Number(trial.score || 0), 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Eligibility Distribution</p>
            <div
              className="mx-auto mt-4 h-36 w-36 rounded-full border border-slate-200"
              style={{
                background: `conic-gradient(
                  #10b981 0% ${strongPercent}%,
                  #f59e0b ${strongPercent}% ${strongPercent + moderatePercent}%,
                  #ef4444 ${strongPercent + moderatePercent}% 100%
                )`,
              }}
            />
            <div className="mt-4 space-y-1 text-xs text-slate-700">
              <p><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> Strong: {distribution.Strong}</p>
              <p><span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> Moderate: {distribution.Moderate}</p>
              <p><span className="inline-block h-2 w-2 rounded-full bg-rose-500" /> Low: {distribution.Low}</p>
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 lg:col-span-3">
            <p className="text-sm font-semibold text-slate-900">Patient Eligibility Radar (Top Trial)</p>
            <div className="mt-3 flex flex-col items-center gap-3 md:flex-row md:items-start md:justify-between">
              <svg viewBox="0 0 220 220" className="h-56 w-56">
                <circle cx="110" cy="110" r="70" fill="none" stroke="#cbd5e1" />
                <circle cx="110" cy="110" r="52" fill="none" stroke="#e2e8f0" />
                <circle cx="110" cy="110" r="35" fill="none" stroke="#e2e8f0" />
                <polygon points={polygonPoints} fill="rgba(14,165,233,0.35)" stroke="#0284c7" strokeWidth="2" />
                {radarPoints.map((item) => (
                  <g key={item.name}>
                    <circle cx={item.x} cy={item.y} r="3" fill="#0284c7" />
                    <text x={item.labelX} y={item.labelY} textAnchor="middle" className="fill-slate-600 text-[10px]">
                      {item.name}
                    </text>
                  </g>
                ))}
              </svg>
              <div className="w-full max-w-sm space-y-2 text-xs text-slate-700">
                {radarData.map((item) => (
                  <div key={item.name}>
                    <div className="flex items-center justify-between">
                      <span>{item.name} Match</span>
                      <span>{item.value}/20</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-1.5 rounded-full bg-cyan-500" style={{ width: `${Math.max((item.value / 20) * 100, 2)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </div>
      )}
    </section>
  );
};

export default MatchAnalytics;
