import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout";
import Button from "../../components/ui/Button";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const LENGTH = 6;

export default function VerifyOTP() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { completeAuth } = useAuth();

  const email = location.state?.email;
  const purpose = location.state?.purpose || "registration";

  const [digits, setDigits] = useState(Array(LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputsRef = useRef([]);

  useEffect(() => {
    if (!email) navigate("/signup", { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function handleChange(i, val) {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < LENGTH - 1) inputsRef.current[i + 1]?.focus();
  }

  function handleKeyDown(i, e) {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputsRef.current[i - 1]?.focus();
  }

  function handlePaste(e) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!text) return;
    e.preventDefault();
    setDigits(text.split("").concat(Array(LENGTH).fill("")).slice(0, LENGTH));
    inputsRef.current[Math.min(text.length, LENGTH - 1)]?.focus();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length !== LENGTH) {
      toast.error("Enter the full 6-digit code");
      return;
    }
    setLoading(true);
    try {
      if (purpose === "password_reset") {
        navigate("/reset-password", { state: { email, otp_code: code } });
        return;
      }
      const tokens = await api.post("/auth/verify-otp", { email, otp_code: code, purpose });
      await completeAuth(tokens);
      toast.success("Email verified!");
      navigate("/onboarding");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await api.post("/auth/resend-otp", { email, purpose });
      toast.success("A new code has been sent");
      setCooldown(30);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't resend code");
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthLayout
      title="Verify your email"
      subtitle={email ? `Enter the 6-digit code we sent to ${email}` : "Enter the 6-digit code"}
      footer={
        <>
          Wrong email?{" "}
          <Link to="/signup" className="text-teal-600 font-medium hover:text-teal-700">Start over</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex gap-2 sm:gap-3" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputsRef.current[i] = el)}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              inputMode="numeric"
              maxLength={1}
              className="w-11 sm:w-12 h-13 sm:h-14 text-center text-lg font-semibold rounded-xl border border-mist-200 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              aria-label={`Digit ${i + 1}`}
            />
          ))}
        </div>

        <Button type="submit" variant="accent" className="w-full" loading={loading}>
          Verify code
        </Button>

        <p className="text-sm text-slate-500 text-center">
          Didn't get a code?{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="text-teal-600 font-medium hover:text-teal-700 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}
