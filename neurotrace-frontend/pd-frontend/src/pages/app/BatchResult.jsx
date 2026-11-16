import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Download, Mail, AlertTriangle, CheckCircle2, Share2, Users } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import { Card, Badge, PageSpinner } from "../../components/ui/Primitives";
import Button from "../../components/ui/Button";
import { api, ApiError } from "../../lib/api";
import { useToast } from "../../context/ToastContext";

function riskColor(label) {
  return label === "parkinson" ? "rose" : "teal";
}

export default function BatchResult() {
  const { batchReportId } = useParams();
  const [batch, setBatch] = useState(null);
  const [emailing, setEmailing] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    api
      .get(`/batch-reports/${batchReportId}`)
      .then(setBatch)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Couldn't load batch report"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchReportId]);

  async function handleDownload() {
    try {
      const blob = await api.downloadPdf(`/batch-reports/${batchReportId}/pdf`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `batch_report_${batchReportId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Download failed");
    }
  }

  async function handleEmail() {
    setEmailing(true);
    try {
      await api.post(`/batch-reports/${batchReportId}/email`, {});
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
        await navigator.share({
          title: "My NeuroTrace Screening Result",
          text: `Result: ${batch.final_label} (${batch.votes_parkinson}/${batch.total_samples} samples flagged, ${batch.avg_confidence}% avg confidence)`,
        });
      } catch { /* user cancelled */ }
    } else {
      toast.info("Sharing isn't supported on this browser.");
    }
  }

  if (!batch) return <DashboardLayout title="Batch Analysis Result"><PageSpinner /></DashboardLayout>;

  const isPositive = batch.final_label === "parkinson";
  const winningVotes = isPositive ? batch.votes_parkinson : batch.votes_healthy;

  return (
    <DashboardLayout title="Batch Analysis Result" breadcrumb="Screening">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Headline card */}
        <Card className={`p-6 sm:p-8 border-2 ${isPositive ? "border-rose-100 bg-rose-50/40" : "border-teal-100 bg-teal-50/40"}`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${isPositive ? "bg-rose-100" : "bg-teal-100"}`}>
              {isPositive ? <AlertTriangle className="w-8 h-8 text-rose-600" /> : <CheckCircle2 className="w-8 h-8 text-teal-600" />}
            </div>
            <div className="flex-1">
              <Badge variant={riskColor(batch.final_label)} className="mb-2 capitalize">{batch.severity_band}</Badge>
              <h2 className="font-display font-bold text-2xl text-ink-900 capitalize">{batch.final_label}</h2>
              <p className="text-sm text-slate-500 mt-1">
                Based on {batch.total_samples} drawings · Analyzed on {new Date(batch.generated_at).toLocaleString()}
              </p>
            </div>
            <div className="text-center shrink-0">
              <p className="font-display font-bold text-3xl text-ink-900">{batch.avg_confidence}%</p>
              <p className="text-xs text-slate-500">Avg. confidence</p>
            </div>
          </div>
        </Card>

        {/* Majority vote breakdown */}
        <Card className="p-6">
          <h3 className="font-display font-semibold text-ink-900 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" /> Majority Vote
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            <span className="font-semibold text-ink-900">{winningVotes} of {batch.total_samples}</span> drawings
            were flagged as <span className="capitalize font-medium">{batch.final_label}</span> - this is what
            decided the final result, not any single drawing.
          </p>
          <div className="flex gap-3">
            <VoteBar label="Parkinson pattern" count={batch.votes_parkinson} total={batch.total_samples} color="rose" />
            <VoteBar label="Healthy pattern" count={batch.votes_healthy} total={batch.total_samples} color="teal" />
          </div>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Averaged metrics */}
          <Card className="p-6">
            <h3 className="font-display font-semibold text-ink-900 mb-4">Averaged Analysis</h3>
            <div className="space-y-4">
              <Metric label="CNN model score (avg)" value={`${batch.avg_cnn_score}%`} pct={batch.avg_cnn_score} />
              <Metric label="Classical model score (avg)" value={`${batch.avg_classical_score}%`} pct={batch.avg_classical_score} />
              <Metric label="Smoothness score (avg)" value={`${batch.avg_smoothness_score} / 100`} pct={batch.avg_smoothness_score} />
              <Metric label="Tremor index (avg)" value={batch.avg_tremor_index} pct={batch.avg_tremor_index * 100} />
            </div>
            <p className="text-xs text-slate-500 mt-5 leading-relaxed">
              These are the average scores across all {batch.total_samples} drawings, computed the same
              way as a single-drawing result - CNN + classical model blended per drawing, then averaged.
            </p>
          </Card>

          {/* Individual results */}
          <Card className="p-6">
            <h3 className="font-display font-semibold text-ink-900 mb-4">Individual Drawings</h3>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {batch.reports.map((r, i) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-mist-50 border border-mist-100"
                >
                  <span className="text-slate-500">#{i + 1}</span>
                  <Badge variant={riskColor(r.predicted_label)} className="capitalize">
                    {r.predicted_label}
                  </Badge>
                  <span className="font-medium text-ink-900">{r.confidence}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* AI explanation */}
        <Card className="p-6 sm:p-8 bg-navy-800 border-none text-white">
          <h3 className="font-display font-semibold text-lg mb-3">What this means</h3>
          <p className="text-teal-100 text-sm leading-relaxed">
            {isPositive
              ? "The majority of your drawings show patterns — such as increased stroke irregularity or reduced smoothness — that are statistically associated with Parkinson's-related motor changes in this model's training data."
              : "The majority of your drawings show stroke patterns consistent with typical fine motor control, with low irregularity and tremor signal across this batch."}
          </p>
          <div className="mt-5 flex items-start gap-2 bg-white/10 rounded-xl p-4 text-xs text-teal-50 leading-relaxed">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            This is an AI-assisted screening estimate based on {batch.total_samples} drawings, not a
            medical diagnosis. Please consult a neurologist for clinical evaluation.
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

function VoteBar({ label, count, total, color }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const barColor = color === "rose" ? "bg-rose-500" : "bg-teal-500";
  return (
    <div className="flex-1">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-slate-500">{label}</span>
        <span className="font-medium text-ink-900">{count}/{total}</span>
      </div>
      <div className="h-2 rounded-full bg-mist-100 overflow-hidden">
        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
