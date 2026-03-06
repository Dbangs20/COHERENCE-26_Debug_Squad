const FeatureCard = ({ title, description }) => {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </article>
  );
};

export default FeatureCard;
