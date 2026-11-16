import { Loader2 } from "lucide-react";

export function Card({ className = "", children, hover = false, ...props }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-mist-200 shadow-card ${
        hover ? "transition-shadow hover:shadow-card-hover" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

const badgeVariants = {
  teal: "bg-teal-50 text-teal-700 border-teal-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  rose: "bg-rose-50 text-rose-700 border-rose-100",
  slate: "bg-mist-100 text-slate-600 border-mist-200",
};

export function Badge({ variant = "slate", className = "", children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${badgeVariants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Spinner({ className = "w-6 h-6" }) {
  return <Loader2 className={`animate-spin text-teal-600 ${className}`} />;
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Spinner className="w-8 h-8" />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-teal-600" />
        </div>
      )}
      <h3 className="font-display font-semibold text-ink-900 mb-1.5">{title}</h3>
      {description && <p className="text-sm text-slate-500 max-w-sm mb-5">{description}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-mist-200 rounded-lg ${className}`} />;
}

export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-card-hover w-full max-w-md p-6 fade-up">
        {title && <h3 className="font-display font-semibold text-lg text-ink-900 mb-2">{title}</h3>}
        <div className="text-sm text-slate-600">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}
