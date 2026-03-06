const LoadingSpinner = () => {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      Finding and ranking matching clinical trials...
    </div>
  );
};

export default LoadingSpinner;
