import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, Activity, Mail, ArrowRight, PenTool } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import DashboardLayout from "../../components/DashboardLayout";
import { Card, Badge, Skeleton, EmptyState } from "../../components/ui/Primitives";
import Button from "../../components/ui/Button";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

function severityVariant(label) {
  if (label === "parkinson") return "rose";
  return "teal";
}

export default function Dashboard() {
  const [history, setHistory] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/history").then(setHistory).catch(() => setHistory([]));
  }, []);

  const loading = history === null;
  const total = history?.length || 0;
  const withReport = history?.filter((h) => h.report) || [];
  const latest = withReport[0];
  const emailedCount = withReport.filter((h) => h.report?.emailed_at).length;

  const chartData = [...withReport]
    .reverse()
    .slice(-10)
    .map((h, i) => ({
      name: `#${i + 1}`,
      confidence: h.report.confidence,
    }));

  const firstName = user?.email?.split("@")[0];

  return (
    <DashboardLayout title="Dashboard" breadcrumb="Overview">
      <div className="mb-8">
        <h2 className="font-display font-semibold text-xl text-ink-900">
          Welcome back{firstName ? `, ${firstName}` : ""}
        </h2>
        <p className="text-sm text-slate-500 mt-1">Here's a snapshot of your screening activity.</p>
      </div>

      {/* Stat cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard icon={Activity} label="Total Analyses" value={loading ? null : total} />
        <StatCard
          icon={FileText}
          label="Latest Result"
          value={loading ? null : latest ? latest.report.predicted_label : "—"}
          badge={latest ? <Badge variant={severityVariant(latest.report.predicted_label)}>{latest.report.severity_band}</Badge> : null}
        />
        <StatCard icon={Mail} label="Reports Emailed" value={loading ? null : emailedCount} />
        <StatCard
          icon={PenTool}
          label="Report Status"
          value={loading ? null : total > 0 ? "Up to date" : "No reports yet"}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-semibold text-ink-900">Confidence Trend</h3>
            <span className="text-xs text-slate-400">Last {chartData.length} analyses</span>
          </div>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : chartData.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No analyses yet"
              description="Upload your first drawing to start tracking your results over time."
              action={<Button variant="accent" onClick={() => navigate("/app/upload")}>Upload Sample</Button>}
            />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="#EEF3F5" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6B7F85" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#6B7F85" }} axisLine={false} tickLine={false} width={36} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #DCE6E9", fontSize: 13 }}
                  formatter={(v) => [`${v}%`, "Confidence"]}
                />
                <Line type="monotone" dataKey="confidence" stroke="#0D9488" strokeWidth={2.5} dot={{ fill: "#0D9488", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Recent activity */}
        <Card className="p-6">
          <h3 className="font-display font-semibold text-ink-900 mb-5">Recent Activity</h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-500">No activity yet.</p>
          ) : (
            <div className="space-y-1">
              {history.slice(0, 5).map((h) => (
                <button
                  key={h.sample.id}
                  onClick={() => h.report && navigate(`/app/results/${h.report.id}`)}
                  className="w-full flex items-center justify-between gap-3 py-3 border-b border-mist-100 last:border-0 text-left hover:bg-mist-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-ink-900 capitalize">{h.sample.drawing_type} drawing</p>
                    <p className="text-xs text-slate-400">{new Date(h.sample.uploaded_at).toLocaleDateString()}</p>
                  </div>
                  {h.report ? (
                    <Badge variant={severityVariant(h.report.predicted_label)}>{h.report.predicted_label}</Badge>
                  ) : (
                    <Badge variant="amber">Pending</Badge>
                  )}
                </button>
              ))}
            </div>
          )}
          <Button variant="ghost" size="sm" className="w-full mt-4" onClick={() => navigate("/app/records")}>
            View all records <ArrowRight className="w-4 h-4" />
          </Button>
        </Card>
      </div>

      <Card className="mt-6 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-teal-50/60 border-teal-100">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-teal-600 flex items-center justify-center shrink-0">
            <Upload className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-medium text-ink-900">Ready for your next screening?</p>
            <p className="text-sm text-slate-500">Upload a new handwriting drawing for analysis.</p>
          </div>
        </div>
        <Button variant="accent" onClick={() => navigate("/app/upload")}>Upload Sample</Button>
      </Card>
    </DashboardLayout>
  );
}

function StatCard({ icon: Icon, label, value, badge }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-mist-100 flex items-center justify-center">
          <Icon className="w-4 h-4 text-navy-700" />
        </div>
        {badge}
      </div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      {value === null ? (
        <Skeleton className="h-7 w-16" />
      ) : (
        <p className="font-display font-bold text-xl text-ink-900 capitalize">{value}</p>
      )}
    </Card>
  );
}
