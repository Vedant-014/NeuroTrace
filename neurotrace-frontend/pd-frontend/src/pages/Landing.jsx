import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserPlus, MailCheck, LogIn, ClipboardList, PenTool, Cpu, LineChart, Mail, History, MessageSquareHeart,
  Brain, ShieldCheck, Clock, Sparkles, ChevronDown, ActivitySquare, Microscope, Users,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Spiral from "../components/Spiral";
import Button from "../components/ui/Button";
import { Card, Badge } from "../components/ui/Primitives";

const workflow = [
  { icon: UserPlus, label: "Create Account" },
  { icon: MailCheck, label: "Verify Email" },
  { icon: LogIn, label: "Login" },
  { icon: ClipboardList, label: "Complete Profile" },
  { icon: PenTool, label: "Upload Drawing" },
  { icon: Cpu, label: "AI Analysis" },
  { icon: LineChart, label: "View Result" },
  { icon: Mail, label: "Receive PDF Report" },
  { icon: History, label: "View Records" },
  { icon: MessageSquareHeart, label: "Give Feedback" },
];

const features = [
  { icon: Brain, title: "Dual-model AI analysis", desc: "A CNN trained on drawing images, cross-checked by a classical model reading tremor and stroke metrics." },
  { icon: Clock, title: "Results in seconds", desc: "Upload a spiral or wave drawing and get a screening estimate almost instantly." },
  { icon: ShieldCheck, title: "Private by design", desc: "Every record, image, and report is scoped to your account alone." },
  { icon: Sparkles, title: "Explainable scoring", desc: "See the tremor index and smoothness score behind every prediction, not just a black-box number." },
  { icon: Mail, title: "Reports delivered to your inbox", desc: "A professional PDF report is emailed automatically after every analysis." },
  { icon: History, title: "Full screening history", desc: "Track results over time, filter by drawing type or outcome, and revisit past reports anytime." },
];

const advantages = [
  { icon: ActivitySquare, title: "Early signal detection", desc: "Motor changes in handwriting can appear before more visible symptoms, making early screening valuable." },
  { icon: Microscope, title: "Objective, consistent scoring", desc: "Removes subjectivity from visual inspection by quantifying tremor and stroke irregularity." },
  { icon: Users, title: "Accessible anywhere", desc: "No specialist equipment needed — just a drawing, a camera, and an internet connection." },
];

const faqs = [
  { q: "Is this a medical diagnosis?", a: "No. NeuroTrace produces an AI-assisted screening estimate based on handwriting patterns, not a clinical diagnosis. Always consult a neurologist for a definitive evaluation." },
  { q: "What do I need to upload?", a: "A clear photo or scan of a hand-drawn spiral or wave, drawn on plain paper with a dark pen. Our Guide page walks through exactly how to draw and photograph it." },
  { q: "How accurate is the AI model?", a: "The model is trained on a published, peer-reviewed handwriting dataset, and reports a confidence score with every result so you can gauge certainty rather than treat it as a yes/no verdict." },
  { q: "Who can see my results?", a: "Only you. Every sample, report, and profile field is scoped to your account and never visible to other users." },
  { q: "Can I delete my data?", a: "Yes — you can delete any analysis record and its associated files at any time from your Records page." },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-mist-200 py-5">
      <button className="w-full flex items-center justify-between text-left gap-4" onClick={() => setOpen(!open)}>
        <span className="font-medium text-ink-900">{q}</span>
        <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="mt-3 text-sm text-slate-500 leading-relaxed fade-up">{a}</p>}
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/60 via-white to-white">
        <div className="max-w-7xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-2 gap-16 items-center">
          <div className="fade-up">
            <Badge variant="teal" className="mb-6">AI-Assisted Neurological Screening</Badge>
            <h1 className="font-display font-bold text-4xl sm:text-5xl text-ink-900 leading-[1.1] tracking-tight mb-6">
              What your handwriting can reveal, before the tremor is obvious.
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed mb-8 max-w-lg">
              NeuroTrace analyzes a simple spiral or wave drawing to flag early motor signs associated
              with Parkinson's disease — combining a trained AI model with clinically-inspired handwriting metrics.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" variant="accent" onClick={() => navigate("/signup")}>Get Started</Button>
              <Button size="lg" variant="outline" as="a" href="#how-it-works">Learn More</Button>
            </div>
            <div className="flex items-center gap-6 mt-10 text-sm text-slate-500">
              <div><span className="font-display font-bold text-ink-900 text-xl">2</span> AI models ensembled</div>
              <div className="w-px h-8 bg-mist-200" />
              <div><span className="font-display font-bold text-ink-900 text-xl">&lt;30s</span> to a result</div>
            </div>
          </div>

          <div className="relative fade-up" style={{ animationDelay: "0.15s" }}>
            <div className="absolute -inset-10 bg-gradient-to-tr from-teal-200/40 to-transparent rounded-full blur-3xl" />
            <Card className="relative p-8">
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-medium text-slate-500">Sample Analysis</span>
                <Badge variant="teal">Low likelihood</Badge>
              </div>
              <div className="w-40 h-40 mx-auto text-navy-800 mb-6">
                <Spiral className="w-full h-full" strokeWidth={3} />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Confidence</span>
                  <span className="font-semibold text-ink-900">21.4%</span>
                </div>
                <div className="h-2 rounded-full bg-mist-100 overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full" style={{ width: "21.4%" }} />
                </div>
                <div className="flex justify-between text-sm pt-2">
                  <span className="text-slate-500">Smoothness score</span>
                  <span className="font-semibold text-ink-900">78 / 100</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <h2 className="font-display font-bold text-3xl text-ink-900 mb-4">About Parkinson's disease</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Parkinson's disease is a progressive neurological condition that affects movement, often producing
            tremors, stiffness, and changes in fine motor control. One of the earliest and most measurable signs
            shows up in handwriting — smaller, shakier, and less fluid strokes, a pattern known as micrographia.
          </p>
          <p className="text-slate-600 leading-relaxed">
            Because these changes can appear before a formal diagnosis, handwriting analysis has become a
            well-studied, non-invasive screening signal in clinical research — the same idea this platform builds on.
          </p>
        </div>
        <Card className="p-8 bg-navy-800 border-none text-white">
          <h3 className="font-display font-semibold text-lg mb-4">Why handwriting?</h3>
          <ul className="space-y-3 text-sm text-teal-100">
            <li className="flex gap-3"><span className="text-teal-400 font-bold">→</span> Fine motor control is one of the first systems affected</li>
            <li className="flex gap-3"><span className="text-teal-400 font-bold">→</span> Drawing a spiral takes seconds and needs no special equipment</li>
            <li className="flex gap-3"><span className="text-teal-400 font-bold">→</span> Tremor and stroke irregularity can be quantified objectively</li>
            <li className="flex gap-3"><span className="text-teal-400 font-bold">→</span> Widely used in published Parkinson's screening research</li>
          </ul>
        </Card>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-mist-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2 className="font-display font-bold text-3xl text-ink-900 mb-3">How NeuroTrace works</h2>
            <p className="text-slate-600">From account creation to your emailed report, in ten clear steps.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {workflow.map((step, i) => (
              <div key={step.label} className="relative">
                <Card hover className="p-5 h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                      <step.icon className="w-5 h-5 text-teal-600" />
                    </div>
                    <span className="text-xs font-semibold text-slate-300">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <p className="text-sm font-medium text-ink-900">{step.label}</p>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-xl mx-auto mb-14">
          <h2 className="font-display font-bold text-3xl text-ink-900 mb-3">Built for accurate, trustworthy screening</h2>
          <p className="text-slate-600">Every part of the pipeline is designed to be transparent, not just a black box.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <Card key={f.title} hover className="p-6">
              <div className="w-11 h-11 rounded-xl bg-navy-800 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-teal-300" />
              </div>
              <h3 className="font-display font-semibold text-ink-900 mb-1.5">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Advantages */}
      <section className="bg-navy-800 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2 className="font-display font-bold text-3xl text-white mb-3">Advantages of AI-based detection</h2>
            <p className="text-teal-100/70">Why a data-driven approach complements traditional evaluation.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {advantages.map((a) => (
              <div key={a.title} className="text-center px-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-white/10 flex items-center justify-center mb-5">
                  <a.icon className="w-7 h-7 text-teal-300" />
                </div>
                <h3 className="font-display font-semibold text-white mb-2">{a.title}</h3>
                <p className="text-sm text-teal-100/70 leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-20">
        <h2 className="font-display font-bold text-3xl text-ink-900 mb-3 text-center">Frequently asked questions</h2>
        <p className="text-slate-600 text-center mb-10">Everything you should know before your first screening.</p>
        <div>
          {faqs.map((f) => <FaqItem key={f.q} {...f} />)}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <Card className="bg-gradient-to-br from-teal-600 to-navy-800 border-none p-10 sm:p-16 text-center overflow-hidden relative">
          <div className="absolute -right-10 -top-10 w-64 h-64 opacity-10 text-white">
            <Spiral className="w-full h-full" strokeWidth={2} animate={false} />
          </div>
          <h2 className="font-display font-bold text-3xl text-white mb-4 relative">Start your first screening today</h2>
          <p className="text-teal-50 max-w-md mx-auto mb-8 relative">
            It takes less than five minutes from sign-up to your first AI-assisted result.
          </p>
          <Button size="lg" className="bg-white text-navy-800 hover:bg-teal-50 relative" onClick={() => navigate("/signup")}>
            Get Started Free
          </Button>
        </Card>
      </section>

      <Footer />
    </div>
  );
}
