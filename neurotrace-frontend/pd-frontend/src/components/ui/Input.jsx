export default function Input({ label, error, hint, className = "", id, ...props }) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-ink-900 mb-1.5">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-4 py-2.5 rounded-xl border bg-white text-sm text-ink-900 placeholder:text-slate-500/70
          transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/30
          ${error ? "border-rose-400 focus:border-rose-500" : "border-mist-200 focus:border-teal-500"}`}
        {...props}
      />
      {hint && !error && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
