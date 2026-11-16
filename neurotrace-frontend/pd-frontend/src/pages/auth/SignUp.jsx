import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import AuthLayout from "../../components/AuthLayout";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import GoogleButton from "../../components/GoogleButton";
import { api, ApiError } from "../../lib/api";
import { useToast } from "../../context/ToastContext";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  function validate() {
    const errs = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email address";
    if (password.length < 8) errs.password = "Password must be at least 8 characters";
    if (password !== confirm) errs.confirm = "Passwords don't match";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post("/auth/signup", { email, password });
      toast.success("Account created. Check your email for the verification code.");
      navigate("/verify-otp", { state: { email, purpose: "registration" } });
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start your handwriting-based Parkinson's screening"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-teal-600 font-medium hover:text-teal-700">Log in</Link>
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
          error={errors.email}
          autoComplete="email"
        />
        <div className="relative">
          <Input
            label="Password"
            type={showPw ? "text" : "password"}
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            autoComplete="new-password"
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
        <Input
          label="Confirm password"
          type={showPw ? "text" : "password"}
          placeholder="Re-enter your password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
          autoComplete="new-password"
        />
        <Button type="submit" variant="accent" className="w-full" loading={loading}>
          Create account
        </Button>
      </form>

      <div className="flex items-center gap-3 my-6">
        <div className="h-px bg-mist-200 flex-1" />
        <span className="text-xs text-slate-400">OR</span>
        <div className="h-px bg-mist-200 flex-1" />
      </div>

      <GoogleButton />

      <p className="text-xs text-slate-400 mt-6 leading-relaxed">
        By creating an account you agree to our Terms of Service and Privacy Policy.
        This tool provides screening estimates only, not medical diagnoses.
      </p>
    </AuthLayout>
  );
}
