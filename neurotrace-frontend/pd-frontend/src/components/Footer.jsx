import Logo from "./Logo";

export default function Footer() {
  return (
    <footer id="contact" className="bg-ink-950 text-mist-100">
      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-10">
        <div className="col-span-2">
          <Logo dark />
          <p className="mt-4 text-sm text-slate-400 max-w-xs leading-relaxed">
            AI-assisted handwriting analysis to help flag early motor signs of Parkinson's disease.
            A screening aid, not a diagnostic replacement for clinical care.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white mb-3">Company</h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li><a href="#how-it-works" className="hover:text-white transition-colors">About</a></li>
            <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white mb-3">Legal</h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} NeuroTrace. For screening purposes only — not a medical diagnosis.</p>
          <p>contact@neurotrace.example</p>
        </div>
      </div>
    </footer>
  );
}
