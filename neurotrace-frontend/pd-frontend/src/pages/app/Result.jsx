import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Download, Mail, AlertTriangle, CheckCircle2, Activity, Share2 } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import { Card, Badge, PageSpinner } from "../../components/ui/Primitives";
import Button from "../../components/ui/Button";
import { api, ApiError, getTokens } from "../../lib/api";
import { useToast } from "../../context/ToastContext";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

function riskColor(label) {
  return label === "parkinson" ? "rose" : "teal";
}

export default function Result() {
  const { reportId } = useParams();
  const [report, setReport] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [emailing, setEmailing] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    let objectUrl;
    api.get(`/reports/${reportId}`)
      .then(async (r) => {
        setReport(r);
        const { access } = getTokens();
        const res = await fetch(`${API_BASE}/samples/${r.sample_id}/image`, {
          headers: { Authorization: `Bearer ${access}` },
        });
        if (res.ok) {
          const blob = await res.blob();
          objectUrl = URL.createObjectURL(blob);
          setImageUrl(objectUrl);
        }
      })
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Couldn't load report"));

    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  async function handleDownload() {
    try {
      const blob = await api.downloadPdf(`/reports/${reportId}/pdf`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report_${reportId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Download failed");
    }
  }

  async function handleEmail() {
    setEmailing(true);
    try {
      await api.post(`/reports/${reportId}/email`, {});
      toast.success("Report is on its way to your email.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't send email");
    } finally {
      setEmailing(false);
    }
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "My NeuroTrace Screening Result", text: `Result: ${report.predicted_label} (${report.confidence}% confidence)` });
      } catch { /* user cancelled */ }
    } else {
      toast.info("Sharing isn't supported on this browser.");
    }
  }

  if (!report) return <DashboardLayout title="Analysis Result"><PageSpinner /></DashboardLayout>;

  const isPositive = report.predicted_label === "parkinson";

  return (
    <DashboardLayout title="Analysis Result" breadcrumb="Screening">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Headline card */}
        <Card className={`p-6 sm:p-8 border-2 ${isPositive ? "border-rose-100 bg-rose-50/40" : "border-teal-100 bg-teal-50/40"}`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${isPositive ? "bg-rose-100" : "bg-teal-100"}`}>
              {isPositive ? <AlertTriangle className="w-8 h-8 text-rose-600" /> : <CheckCircle2 className="w-8 h-8 text-teal-600" />}
            </div>
            <div className="flex-1">
              <Badge variant={riskColor(report.predicted_label)} className="mb-2 capitalize">{report.severity_band}</Badge>
              <h2 className="font-display font-bold text-2xl text-ink-900 capitalize">{report.predicted_label}</h2>
              <p className="text-sm text-slate-500 mt-1">Analyzed on {new Date(report.generated_at).toLocaleString()}</p>
            </div>
            <div className="text-center shrink-0">
              <p className="font-display font-bold text-3xl text-ink-900">{report.confidence}%</p>
              <p className="text-xs text-slate-500">Confidence</p>
            </div>
          </div>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Uploaded image */}
          <Card className="p-6">
            <h3 className="font-display font-semibold text-ink-900 mb-4">Uploaded Sample</h3>
            <div className="rounded-xl overflow-hidden border border-mist-200 bg-mist-50 h-64 flex items-center justify-center">
              {imageUrl ? (
                <img src={imageUrl} alt="Uploaded handwriting sample" className="max-h-full max-w-full object-contain" />
              ) : (
                <Activity className="w-8 h-8 text-slate-300 animate-pulse" />
              )}
            </div>
          </Card>

          {/* Metrics */}
          <Card className="p-6">
            <h3 className="font-display font-semibold text-ink-900 mb-4">Analysis Summary</h3>
            <div className="space-y-4">
              <Metric label="CNN model score" value={`${report.cnn_score}%`} pct={report.cnn_score} />
              <Metric label="Classical model score" value={`${report.classical_score}%`} pct={report.classical_score} />
              <Metric label="Smoothness score" value={`${report.smoothness_score} / 100`} pct={report.smoothness_score} />
              <Metric label="Tremor index" value={report.tremor_index} pct={report.tremor_index * 100} />
            </div>
            <p className="text-xs text-slate-500 mt-5 leading-relaxed">
              The final result blends a CNN trained on drawing images with a classical model
              reading tremor and stroke-smoothness metrics from the same drawing.
            </p>
          </Card>
        </div>

        {/* AI explanation */}
        <Card className="p-6 sm:p-8 bg-navy-800 border-none text-white">
          <h3 className="font-display font-semibold text-lg mb-3">What this means</h3>
          <p className="text-teal-100 text-sm leading-relaxed">
            {isPositive
              ? "Your drawing shows patterns — such as increased stroke irregularity or reduced smoothness — that are statistically associated with Parkinson's-related motor changes in this model's training data."
              : "Your drawing shows stroke patterns consistent with typical fine motor control, with low irregularity and tremor signal in this analysis."}
          </p>
          <div className="mt-5 flex items-start gap-2 bg-white/10 rounded-xl p-4 text-xs text-teal-50 leading-relaxed">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            This is an AI-assisted screening estimate, not a medical diagnosis. Please consult a neurologist for clinical evaluation.
          </div>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button variant="accent" onClick={handleDownload}><Download className="w-4 h-4" /> Download PDF</Button>
          <Button variant="outline" onClick={handleEmail} loading={emailing}><Mail className="w-4 h-4" /> Email Report</Button>
          <Button variant="outline" onClick={handleShare}><Share2 className="w-4 h-4" /> Share</Button>
          <Button variant="ghost" onClick={() => navigate("/app/records")} className="ml-auto">View all records</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Metric({ label, value, pct }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-slate-500">{label}</span>
        <span className="font-medium text-ink-900">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-mist-100 overflow-hidden">
        <div className="h-full bg-teal-500 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}
