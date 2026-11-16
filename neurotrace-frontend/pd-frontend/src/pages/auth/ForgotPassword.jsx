import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { api, ApiError } from "../../lib/api";
import { useToast } from "../../context/ToastContext";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle="If that address is registered, a reset code is on its way.">
        <Button variant="accent" className="w-full" onClick={() => navigate("/reset-password", { state: { email } })}>
          I have my code
        </Button>
        <p className="text-sm text-slate-500 text-center mt-4">
          <Link to="/login" className="text-teal-600 font-medium hover:text-teal-700">Back to login</Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a reset code"
      footer={
        <>
          Remembered it?{" "}
          <Link to="/login" className="text-teal-600 font-medium hover:text-teal-700">Log in</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" variant="accent" className="w-full" loading={loading}>
          Send reset code
        </Button>
      </form>
    </AuthLayout>
  );
}
