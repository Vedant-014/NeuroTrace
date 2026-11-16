import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import Input from "../components/ui/Input";
import { Select, Textarea } from "../components/ui/FormFields";
import Button from "../components/ui/Button";
import { Card } from "../components/ui/Primitives";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const STEPS = ["Basic details", "Health background", "Lifestyle"];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [form, setForm] = useState({
    full_name: "", age: "", gender: "", date_of_birth: "", phone_number: "", address: "",
    existing_diseases: "", family_history_parkinsons: false, current_medications: "", medical_history: "",
    smoking_status: "", alcohol_consumption: "", exercise_habits: "", additional_notes: "",
  });
  const { refreshUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  // Guards against a fast double-click landing on the submit button that
  // occupies the same screen position right after "Continue" advances the step.
  // Pointer events on the whole form are blocked for the duration, not just the
  // button itself, so a stray second click can't reach anything underneath.
  function goNext() {
    if (transitioning) return;
    setTransitioning(true);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
    setTimeout(() => setTransitioning(false), 400);
  }

  function goBack() {
    if (transitioning) return;
    setTransitioning(true);
    setStep((s) => Math.max(0, s - 1));
    setTimeout(() => setTransitioning(false), 400);
  }

  async function handleFinish(e) {
    e.preventDefault();
    if (transitioning) return;
    if (!form.full_name.trim()) {
      toast.error("Full name is required");
      setStep(0);
      return;
    }
    setLoading(true);
    try {
      const payload = { ...form, age: form.age ? Number(form.age) : null, date_of_birth: form.date_of_birth || null };
      await api.post("/profile", payload);
      await refreshUser();
      toast.success("Profile complete. Let's get started!");
      navigate("/app");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save your profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-mist-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Logo className="justify-center mb-8" />

        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  i <= step ? "bg-teal-600 text-white" : "bg-mist-200 text-slate-500"
                }`}
              >
                {i + 1}
              </div>
              <span className={`text-sm hidden sm:inline ${i === step ? "text-ink-900 font-medium" : "text-slate-400"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-mist-200 mx-1" />}
            </div>
          ))}
        </div>

        <Card className="p-6 sm:p-8">
          {/*
            pointer-events-none + opacity dip during transitions blocks ANY click
            anywhere in the form for the guard window, not just on the button that
            was clicked. This is what makes fast double-clicks harmless.
          */}
          <form
            onSubmit={handleFinish}
            className={transitioning ? "pointer-events-none opacity-90 transition-opacity" : "transition-opacity"}
          >
            {step === 0 && (
              <div className="space-y-4 fade-up">
                <h2 className="font-display font-semibold text-lg text-ink-900 mb-1">Tell us about yourself</h2>
                <p className="text-sm text-slate-500 mb-4">This information helps personalize your screening report.</p>
                <Input label="Full name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Age" type="number" min="0" max="130" value={form.age} onChange={(e) => set("age", e.target.value)} />
                  <Select label="Gender" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Date of birth" type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
                  <Input label="Phone number" type="tel" value={form.phone_number} onChange={(e) => set("phone_number", e.target.value)} />
                </div>
                <Input label="Address (optional)" value={form.address} onChange={(e) => set("address", e.target.value)} />
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4 fade-up">
                <h2 className="font-display font-semibold text-lg text-ink-900 mb-1">Health background</h2>
                <p className="text-sm text-slate-500 mb-4">Helps contextualize your screening results.</p>
                <Textarea label="Existing diseases (if any)" value={form.existing_diseases} onChange={(e) => set("existing_diseases", e.target.value)} />
                <label className="flex items-center gap-2.5 text-sm text-ink-900">
                  <input
                    type="checkbox"
                    checked={form.family_history_parkinsons}
                    onChange={(e) => set("family_history_parkinsons", e.target.checked)}
                    className="w-4 h-4 rounded border-mist-200 text-teal-600 focus:ring-teal-500/30"
                  />
                  Family history of Parkinson's disease
                </label>
                <Textarea label="Current medications" value={form.current_medications} onChange={(e) => set("current_medications", e.target.value)} />
                <Textarea label="Medical history" value={form.medical_history} onChange={(e) => set("medical_history", e.target.value)} />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 fade-up">
                <h2 className="font-display font-semibold text-lg text-ink-900 mb-1">Lifestyle</h2>
                <p className="text-sm text-slate-500 mb-4">Almost done — last section.</p>
                <Select label="Smoking status" value={form.smoking_status} onChange={(e) => set("smoking_status", e.target.value)}>
                  <option value="">Select</option>
                  <option value="never">Never</option>
                  <option value="former">Former</option>
                  <option value="current">Current</option>
                </Select>
                <Select label="Alcohol consumption" value={form.alcohol_consumption} onChange={(e) => set("alcohol_consumption", e.target.value)}>
                  <option value="">Select</option>
                  <option value="none">None</option>
                  <option value="occasional">Occasional</option>
                  <option value="regular">Regular</option>
                </Select>
                <Select label="Exercise habits" value={form.exercise_habits} onChange={(e) => set("exercise_habits", e.target.value)}>
                  <option value="">Select</option>
                  <option value="sedentary">Sedentary</option>
                  <option value="light">Light</option>
                  <option value="moderate">Moderate</option>
                  <option value="active">Active</option>
                </Select>
                <Textarea label="Additional health notes (optional)" value={form.additional_notes} onChange={(e) => set("additional_notes", e.target.value)} />
              </div>
            )}

            <div className="flex justify-between mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={goBack}
                className={step === 0 ? "invisible" : ""}
              >
                Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button type="button" variant="accent" onClick={goNext} disabled={transitioning}>
                  Continue
                </Button>
              ) : (
                <Button type="submit" variant="accent" loading={loading}>
                  Complete profile
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
