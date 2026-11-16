import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Image as ImageIcon, X, Sparkles, CheckCircle2 } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import { Card } from "../../components/ui/Primitives";
import Button from "../../components/ui/Button";
import { api, ApiError } from "../../lib/api";
import { useToast } from "../../context/ToastContext";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const MAX_MB = 10;
const SLOTS_PER_TYPE = 5;

function emptySlots() {
  return Array.from({ length: SLOTS_PER_TYPE }, () => null);
}

export default function UploadSample() {
  // Each array holds SLOTS_PER_TYPE entries, either null or { file, preview }
  const [spiralSlots, setSpiralSlots] = useState(emptySlots());
  const [waveSlots, setWaveSlots] = useState(emptySlots());
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(""); // "uploading" | "analyzing"
  const [completedCount, setCompletedCount] = useState(0);
  const toast = useToast();
  const navigate = useNavigate();

  const totalFilled = [...spiralSlots, ...waveSlots].filter(Boolean).length;
  const allFilled = totalFilled === SLOTS_PER_TYPE * 2;

  function validateFile(f) {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      toast.error("Please upload a PNG or JPG image.");
      return false;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`File is too large. Max size is ${MAX_MB}MB.`);
      return false;
    }
    return true;
  }

  function setSlot(kind, index, file) {
    if (!file) return;
    if (!validateFile(file)) return;
    const preview = URL.createObjectURL(file);
    const updater = kind === "spiral" ? setSpiralSlots : setWaveSlots;
    updater((slots) => {
      const next = [...slots];
      if (next[index]?.preview) URL.revokeObjectURL(next[index].preview);
      next[index] = { file, preview };
      return next;
    });
  }

  function clearSlot(kind, index) {
    const updater = kind === "spiral" ? setSpiralSlots : setWaveSlots;
    updater((slots) => {
      const next = [...slots];
      if (next[index]?.preview) URL.revokeObjectURL(next[index].preview);
      next[index] = null;
      return next;
    });
  }

  async function handleAnalyzeAll() {
    if (!allFilled) return;
    setBusy(true);
    setStage("uploading");
    setCompletedCount(0);

    try {
      const uploadOne = async (slot, drawingType) => {
        const formData = new FormData();
        formData.append("drawing_type", drawingType);
        formData.append("file", slot.file);
        const sample = await api.postForm("/samples", formData);
        setCompletedCount((c) => c + 1);
        return sample.id;
      };

      // Upload all 10 individually first (order preserved: spiral 1-5, wave 1-5)
      const spiralIds = [];
      for (const slot of spiralSlots) spiralIds.push(await uploadOne(slot, "spiral"));
      const waveIds = [];
      for (const slot of waveSlots) waveIds.push(await uploadOne(slot, "wave"));

      setStage("analyzing");
      const batchReport = await api.post("/samples/batch-analyze", {
        sample_ids: [...spiralIds, ...waveIds],
      });

      toast.success("Batch analysis complete!");
      navigate(`/app/batch-results/${batchReport.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Upload/analysis failed. Please try again.");
      setBusy(false);
      setStage("");
      setCompletedCount(0);
    }
  }

  return (
    <DashboardLayout title="Upload Samples" breadcrumb="Screening">
      <div className="max-w-3xl mx-auto">
        <Card className="p-6 sm:p-8">
          <h2 className="font-display font-semibold text-lg text-ink-900 mb-1">
            Upload {SLOTS_PER_TYPE} spiral + {SLOTS_PER_TYPE} wave drawings
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            For a more reliable result, this screening uses {SLOTS_PER_TYPE * 2} drawings together -
            the final result is based on the majority pattern across all of them, rather than any
            single drawing. Need help? Check the{" "}
            <button onClick={() => navigate("/app/guide")} className="text-teal-600 font-medium hover:underline">
              drawing guide
            </button>.
          </p>

          <SlotGroup
            label="Spiral drawings"
            slots={spiralSlots}
            onPick={(i, f) => setSlot("spiral", i, f)}
            onClear={(i) => clearSlot("spiral", i)}
            disabled={busy}
          />

          <div className="h-6" />

          <SlotGroup
            label="Wave drawings"
            slots={waveSlots}
            onPick={(i, f) => setSlot("wave", i, f)}
            onClear={(i) => clearSlot("wave", i)}
            disabled={busy}
          />

          {busy && (
            <div className="mt-6">
              <div className="h-2 rounded-full bg-mist-100 overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all duration-300"
                  style={{ width: `${stage === "analyzing" ? 100 : (completedCount / (SLOTS_PER_TYPE * 2)) * 90}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-2">
                {stage === "uploading" ? (
                  <>Uploading… {completedCount}/{SLOTS_PER_TYPE * 2}</>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    Running AI analysis on all {SLOTS_PER_TYPE * 2} drawings…
                  </>
                )}
              </p>
            </div>
          )}

          <Button
            variant="accent"
            className="w-full mt-6"
            disabled={!allFilled}
            loading={busy}
            onClick={handleAnalyzeAll}
          >
            {busy
              ? stage === "analyzing" ? "Analyzing…" : "Uploading…"
              : `Analyze All ${SLOTS_PER_TYPE * 2} Drawings (${totalFilled}/${SLOTS_PER_TYPE * 2} added)`}
          </Button>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function SlotGroup({ label, slots, onPick, onClear, disabled }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-ink-900">{label}</h3>
        <span className="text-xs text-slate-500">
          {slots.filter(Boolean).length}/{slots.length} added
        </span>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {slots.map((slot, i) => (
          <UploadSlot
            key={i}
            index={i}
            slot={slot}
            onPick={(f) => onPick(i, f)}
            onClear={() => onClear(i)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

function UploadSlot({ index, slot, onPick, onClear, disabled }) {
  const inputRef = useRef(null);

  if (slot) {
    return (
      <div className="relative aspect-square rounded-xl overflow-hidden border border-mist-200 bg-mist-50">
        <img src={slot.preview} alt={`Drawing ${index + 1}`} className="w-full h-full object-cover" />
        <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center">
          <CheckCircle2 className="w-3.5 h-3.5" />
        </div>
        {!disabled && (
          <button
            onClick={onClear}
            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white shadow flex items-center justify-center text-slate-500 hover:text-rose-600"
            aria-label="Remove image"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => inputRef.current?.click()}
      className="aspect-square rounded-xl border-2 border-dashed border-mist-200 hover:border-teal-300 hover:bg-mist-50 flex flex-col items-center justify-center gap-1 text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      <ImageIcon className="w-5 h-5" />
      <span className="text-[10px]">#{index + 1}</span>
    </button>
  );
}
