import Spiral from "./Spiral";

export default function Logo({ dark = false, className = "" }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center shrink-0">
        <Spiral className="w-5 h-5 text-white" strokeWidth={5} animate={false} />
      </div>
      <span className={`font-display font-bold text-lg tracking-tight ${dark ? "text-white" : "text-ink-900"}`}>
        NeuroTrace
      </span>
    </div>
  );
}
