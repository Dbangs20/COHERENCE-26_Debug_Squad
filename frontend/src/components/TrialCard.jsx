import StatusBadge from "./StatusBadge";

const TrialCard = ({ trial }) => {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{trial.trial_id}</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{trial.title}</h3>
          <p className="mt-1 text-sm text-slate-600">Location: {trial.location}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Match Score</p>
          <p className="text-xl font-bold text-primary">{trial.score}</p>
          <p className="mt-1 text-xs text-slate-500">Confidence: {trial.confidence}%</p>
          <div className="mt-2">
            <StatusBadge status={trial.status} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-800">Reasons</h4>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {trial.reasons.map((reason, index) => (
              <li key={`${trial.trial_id}-reason-${index}`}>- {reason}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-800">Missing Data</h4>
          {trial.missing_data.length === 0 ? (
            <p className="mt-2 text-sm text-emerald-700">No missing critical fields.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-amber-700">
              {trial.missing_data.map((item) => (
                <li key={`${trial.trial_id}-${item}`}>- {item}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  );
};

export default TrialCard;
