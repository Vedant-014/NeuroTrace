export function Select({ label, error, className = "", id, children, ...props }) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className={className}>
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-ink-900 mb-1.5">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full px-4 py-2.5 rounded-xl border bg-white text-sm text-ink-900
          transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/30
          ${error ? "border-rose-400" : "border-mist-200 focus:border-teal-500"}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

export function Textarea({ label, error, className = "", id, ...props }) {
  const areaId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className={className}>
      {label && (
        <label htmlFor={areaId} className="block text-sm font-medium text-ink-900 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        id={areaId}
        rows={3}
        className={`w-full px-4 py-2.5 rounded-xl border bg-white text-sm text-ink-900 placeholder:text-slate-500/70
          transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/30 resize-none
          ${error ? "border-rose-400" : "border-mist-200 focus:border-teal-500"}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
