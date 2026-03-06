const badgeStyles = {
  Eligible: "bg-emerald-100 text-emerald-700",
  "Partially Eligible": "bg-amber-100 text-amber-700",
  "Insufficient Data": "bg-sky-100 text-sky-700",
  "Not Eligible": "bg-rose-100 text-rose-700",
};

const StatusBadge = ({ status }) => {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeStyles[status] || "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
