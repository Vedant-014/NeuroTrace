import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { api, ApiError } from "../../lib/api";
import { useToast } from "../../context/ToastContext";

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const [email, setEmail] = useState(location.state?.email || "");
  const [otpCode, setOtpCode] = useState(location.state?.otp_code || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const errs = {};
    if (!email) errs.email = "Email is required";
    if (!otpCode || otpCode.length !== 6) errs.otpCode = "Enter the 6-digit code from your email";
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
      await api.post("/auth/reset-password", { email, otp_code: otpCode, new_password: password });
      toast.success("Password reset! Please log in.");
      navigate("/login");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Enter the code from your email and choose a new password"
      footer={
        <>
          <Link to="/login" className="text-teal-600 font-medium hover:text-teal-700">Back to login</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <Input
          label="6-digit code"
          value={otpCode}
          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          error={errors.otpCode}
          inputMode="numeric"
        />
        <Input label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        <Input label="Confirm new password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
        <Button type="submit" variant="accent" className="w-full" loading={loading}>
          Reset password
        </Button>
      </form>
    </AuthLayout>
  );
}
