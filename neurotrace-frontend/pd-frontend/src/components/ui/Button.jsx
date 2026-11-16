import { Loader2 } from "lucide-react";

const variants = {
  primary: "bg-navy-800 text-white hover:bg-ink-900 shadow-sm",
  accent: "bg-teal-600 text-white hover:bg-teal-700 shadow-sm",
  outline: "border border-mist-200 text-ink-900 hover:border-teal-500 hover:text-teal-700 bg-white",
  ghost: "text-slate-600 hover:text-ink-900 hover:bg-mist-100",
  danger: "bg-white border border-rose-200 text-rose-600 hover:bg-rose-50",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-5 py-2.5 text-sm rounded-xl",
  lg: "px-7 py-3.5 text-base rounded-xl",
};

export default function Button({
  as: As = "button",
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  children,
  ...props
}) {
  return (
    <As
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-medium transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </As>
  );
}
