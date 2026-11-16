import { Sun, Ruler, PenTool, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import { Card } from "../../components/ui/Primitives";
import Spiral from "../../components/Spiral";

const tips = [
  { icon: PenTool, title: "Use a dark pen", desc: "Black or dark blue ink on plain white paper gives the clearest contrast for analysis." },
  { icon: Sun, title: "Even, bright lighting", desc: "Avoid shadows across the page. Natural daylight or an overhead light works best." },
  { icon: Ruler, title: "Fill a reasonable area", desc: "Draw at a comfortable size — roughly a 10cm circle — not tiny or oversized." },
];

const doList = [
  "Draw at your natural, relaxed pace",
  "Keep the paper flat and steady",
  "Photograph straight-on, not at an angle",
  "Make sure the whole drawing is in frame",
];

const dontList = [
  "Don't trace over a printed template",
  "Don't use a pencil (low contrast)",
  "Don't crop out part of the drawing",
  "Don't photograph in dim or mixed lighting",
];

export default function Guide() {
  return (
    <DashboardLayout title="Drawing Guide" breadcrumb="Help">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="w-32 h-32 mx-auto text-navy-800 mb-4">
              <Spiral className="w-full h-full" strokeWidth={3} />
            </div>
            <h3 className="font-display font-semibold text-ink-900 text-center mb-2">Drawing a Spiral</h3>
            <p className="text-sm text-slate-500 text-center leading-relaxed">
              Start from the center and draw outward in a continuous, smooth spiral, making 4–5 full loops.
              Keep your hand relaxed and don't lift the pen until finished.
            </p>
          </Card>
          <Card className="p-6">
            <div className="w-32 h-24 mx-auto text-navy-800 mb-4 mt-4 flex items-center">
              <svg viewBox="0 0 200 80" className="w-full h-full" fill="none">
                <path d="M10 40 Q35 10 60 40 T110 40 T160 40 T210 40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="font-display font-semibold text-ink-900 text-center mb-2">Drawing a Wave</h3>
            <p className="text-sm text-slate-500 text-center leading-relaxed">
              Draw a smooth, continuous horizontal wave with 5–6 even peaks and troughs, left to right,
              at a natural, steady pace.
            </p>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="font-display font-semibold text-ink-900 mb-5">Image quality tips</h3>
          <div className="grid sm:grid-cols-3 gap-5">
            {tips.map((t) => (
              <div key={t.title} className="flex flex-col items-start">
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center mb-3">
                  <t.icon className="w-5 h-5 text-teal-600" />
                </div>
                <p className="font-medium text-sm text-ink-900 mb-1">{t.title}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid sm:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-display font-semibold text-teal-700 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Do
            </h3>
            <ul className="space-y-2.5">
              {doList.map((d) => (
                <li key={d} className="text-sm text-slate-600 flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" /> {d}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-6">
            <h3 className="font-display font-semibold text-rose-600 mb-4 flex items-center gap-2">
              <XCircle className="w-5 h-5" /> Don't
            </h3>
            <ul className="space-y-2.5">
              {dontList.map((d) => (
                <li key={d} className="text-sm text-slate-600 flex gap-2">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" /> {d}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="p-6 bg-amber-50/60 border-amber-100">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-display font-semibold text-ink-900 mb-1.5">Medical disclaimer</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                NeuroTrace provides an AI-assisted screening estimate based on handwriting analysis. It is not a
                medical diagnosis and should never replace professional clinical evaluation. If you have concerns
                about Parkinson's disease or any neurological symptoms, please consult a qualified neurologist.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
