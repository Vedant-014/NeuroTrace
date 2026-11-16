import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Download, Eye, Trash2, FileX2 } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import { Card, Badge, Skeleton, EmptyState, Modal } from "../../components/ui/Primitives";
import { Select } from "../../components/ui/FormFields";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { api, ApiError } from "../../lib/api";
import { useToast } from "../../context/ToastContext";

export default function Records() {
  const [history, setHistory] = useState(null);
  const [search, setSearch] = useState("");
  const [drawingFilter, setDrawingFilter] = useState("");
  const [labelFilter, setLabelFilter] = useState("");
  const [sortDesc, setSortDesc] = useState(true);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  function load() {
    setHistory(null);
    const params = new URLSearchParams();
    if (drawingFilter) params.set("drawing_type", drawingFilter);
    if (labelFilter) params.set("predicted_label", labelFilter);
    api.get(`/history?${params.toString()}`).then(setHistory).catch(() => setHistory([]));
  }

  useEffect(load, [drawingFilter, labelFilter]);

  const filtered = useMemo(() => {
    if (!history) return [];
    let items = history;
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (h) => h.report?.severity_band?.toLowerCase().includes(q) || h.sample.drawing_type.includes(q)
      );
    }
    items = [...items].sort((a, b) => {
      const da = new Date(a.sample.uploaded_at), db = new Date(b.sample.uploaded_at);
      return sortDesc ? db - da : da - db;
    });
    return items;
  }, [history, search, sortDesc]);

  async function handleDownload(reportId) {
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

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api.del(`/samples/${toDelete}`);
      toast.success("Record deleted");
      setToDelete(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete record");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <DashboardLayout title="Analysis Records" breadcrumb="Screening">
      <Card className="p-5 mb-6">
        <div className="grid sm:grid-cols-4 gap-3">
          <Input
            className="sm:col-span-2"
            placeholder="Search by likelihood band…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none hidden" />
            <Select value={drawingFilter} onChange={(e) => setDrawingFilter(e.target.value)}>
              <option value="">All drawing types</option>
              <option value="spiral">Spiral</option>
              <option value="wave">Wave</option>
            </Select>
          </div>
          <Select value={labelFilter} onChange={(e) => setLabelFilter(e.target.value)}>
            <option value="">All results</option>
            <option value="healthy">Healthy</option>
            <option value="parkinson">Parkinson's</option>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {history === null ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileX2}
            title="No records found"
            description="Try adjusting your filters, or upload your first sample to get started."
            action={<Button variant="accent" onClick={() => navigate("/app/upload")}>Upload Sample</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-mist-200 text-left text-slate-500">
                  <th className="px-5 py-3 font-medium">
                    <button onClick={() => setSortDesc(!sortDesc)} className="hover:text-ink-900">
                      Date {sortDesc ? "↓" : "↑"}
                    </button>
                  </th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Result</th>
                  <th className="px-5 py-3 font-medium">Confidence</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((h) => (
                  <tr key={h.sample.id} className="border-b border-mist-100 last:border-0 hover:bg-mist-50/60">
                    <td className="px-5 py-3.5 text-ink-900">{new Date(h.sample.uploaded_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5 capitalize text-slate-600">{h.sample.drawing_type}</td>
                    <td className="px-5 py-3.5">
                      {h.report ? (
                        <Badge variant={h.report.predicted_label === "parkinson" ? "rose" : "teal"} className="capitalize">
                          {h.report.predicted_label}
                        </Badge>
                      ) : (
                        <Badge variant="amber">Pending</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-ink-900">{h.report ? `${h.report.confidence}%` : "—"}</td>
                    <td className="px-5 py-3.5 text-slate-500">{h.report ? "Complete" : "Not analyzed"}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        {h.report && (
                          <>
                            <IconButton onClick={() => navigate(`/app/results/${h.report.id}`)} label="View report">
                              <Eye className="w-4 h-4" />
                            </IconButton>
                            <IconButton onClick={() => handleDownload(h.report.id)} label="Download PDF">
                              <Download className="w-4 h-4" />
                            </IconButton>
                          </>
                        )}
                        <IconButton onClick={() => setToDelete(h.sample.id)} label="Delete record" danger>
                          <Trash2 className="w-4 h-4" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete this record?"
        footer={
          <>
            <Button variant="outline" onClick={() => setToDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleting}>Delete</Button>
          </>
        }
      >
        This will permanently delete the uploaded image and its report. This action can't be undone.
      </Modal>
    </DashboardLayout>
  );
}

function IconButton({ children, onClick, label, danger }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
        danger ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50" : "text-slate-400 hover:text-teal-700 hover:bg-teal-50"
      }`}
    >
      {children}
    </button>
  );
}
