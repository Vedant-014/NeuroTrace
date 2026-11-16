import { Link } from "react-router-dom";
import Logo from "./Logo";
import Spiral from "./Spiral";

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: form */}
      <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12">
        <div className="max-w-sm mx-auto w-full">
          <Link to="/"><Logo className="mb-10" /></Link>
          <h1 className="font-display font-bold text-2xl text-ink-900 mb-1.5">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mb-8">{subtitle}</p>}
          {children}
          {footer && <div className="mt-6 text-sm text-slate-500">{footer}</div>}
        </div>
      </div>

      {/* Right: visual */}
      <div className="hidden lg:flex relative bg-navy-800 items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]">
          <Spiral className="w-[140%] h-[140%] -translate-x-10 text-white" strokeWidth={1.5} animate={false} />
        </div>
        <div className="relative z-10 max-w-md px-10 text-center">
          <div className="w-40 h-40 mx-auto mb-8 text-teal-300">
            <Spiral className="w-full h-full" strokeWidth={2.5} />
          </div>
          <p className="font-display text-xl text-white leading-snug">
            "A spiral drawing takes seconds. What it reveals about motor control can take years off a diagnosis timeline."
          </p>
          <p className="mt-4 text-sm text-teal-200/70">AI-assisted screening from handwriting analysis</p>
        </div>
      </div>
    </div>
  );
}
