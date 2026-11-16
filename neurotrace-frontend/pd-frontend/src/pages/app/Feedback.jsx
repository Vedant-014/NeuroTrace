import { useState } from "react";
import { Star, PartyPopper } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import { Card } from "../../components/ui/Primitives";
import { Textarea } from "../../components/ui/FormFields";
import Button from "../../components/ui/Button";
import { api, ApiError } from "../../lib/api";
import { useToast } from "../../context/ToastContext";

export default function Feedback() {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!rating && !comment.trim()) {
      toast.error("Please leave a rating or a comment.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/feedback", { rating: rating || null, comment: comment.trim() || null });
      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't submit feedback");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout title="Feedback" breadcrumb="Help us improve">
      <div className="max-w-lg mx-auto">
        <Card className="p-8">
          {submitted ? (
            <div className="text-center py-8 fade-up">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-5">
                <PartyPopper className="w-8 h-8 text-teal-600" />
              </div>
              <h2 className="font-display font-bold text-xl text-ink-900 mb-2">Thank you!</h2>
              <p className="text-sm text-slate-500 mb-6">Your feedback helps us make NeuroTrace better for everyone.</p>
              <Button variant="outline" onClick={() => { setSubmitted(false); setRating(0); setComment(""); }}>
                Submit another response
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2 className="font-display font-semibold text-lg text-ink-900 mb-1">How's your experience?</h2>
              <p className="text-sm text-slate-500 mb-6">We'd love to hear your thoughts on NeuroTrace.</p>

              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`Rate ${n} stars`}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-9 h-9 ${
                        n <= (hoverRating || rating) ? "fill-amber-400 text-amber-400" : "text-mist-200"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <Textarea
                label="Tell us more (optional)"
                placeholder="What did you like? What could be better?"
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />

              <Button type="submit" variant="accent" className="w-full mt-6" loading={loading}>
                Submit Feedback
              </Button>
            </form>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
