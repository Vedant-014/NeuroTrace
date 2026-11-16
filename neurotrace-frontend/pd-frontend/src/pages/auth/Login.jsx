import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import AuthLayout from "../../components/AuthLayout";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import GoogleButton from "../../components/GoogleButton";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { completeAuth } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const tokens = await api.post("/auth/login", { email, password });
      await completeAuth(tokens);
      toast.success("Welcome back!");
      navigate("/app");
    } catch (err) {
      if (err instanceof ApiError && err.status === 403 && err.message.toLowerCase().includes("verified")) {
        toast.info("Please verify your email first.");
        navigate("/verify-otp", { state: { email, purpose: "registration" } });
        return;
      }
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to continue your screening journey"
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/signup" className="text-teal-600 font-medium hover:text-teal-700">Sign up</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <div className="relative">
          <Input
            label="Password"
            type={showPw ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-[38px] text-slate-400 hover:text-slate-600"
            tabIndex={-1}
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm text-teal-600 font-medium hover:text-teal-700">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" variant="accent" className="w-full" loading={loading}>
          Log in
        </Button>
      </form>

      <div className="flex items-center gap-3 my-6">
        <div className="h-px bg-mist-200 flex-1" />
        <span className="text-xs text-slate-400">OR</span>
        <div className="h-px bg-mist-200 flex-1" />
      </div>

      <GoogleButton />
    </AuthLayout>
  );
}
