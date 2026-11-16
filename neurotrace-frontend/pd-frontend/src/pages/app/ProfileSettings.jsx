import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, KeyRound, LogOut, Save } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import { Card, Badge, PageSpinner } from "../../components/ui/Primitives";
import Input from "../../components/ui/Input";
import { Select, Textarea } from "../../components/ui/FormFields";
import Button from "../../components/ui/Button";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export default function ProfileSettings() {
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/profile").then(setProfile).catch(() => toast.error("Couldn't load your profile"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set(key, val) {
    setProfile((p) => ({ ...p, [key]: val }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...profile };
      delete payload.id; delete payload.user_id; delete payload.created_at; delete payload.updated_at;
      const updated = await api.put("/profile", payload);
      setProfile(updated);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save changes");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    setSendingReset(true);
    try {
      await api.post("/auth/forgot-password", { email: user.email });
      toast.success("A password reset code has been sent to your email.");
      navigate("/reset-password", { state: { email: user.email } });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't start password reset");
    } finally {
      setSendingReset(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  if (!profile) return <DashboardLayout title="Profile"><PageSpinner /></DashboardLayout>;

  return (
    <DashboardLayout title="Profile" breadcrumb="Account">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Account details */}
        <Card className="p-6">
          <h3 className="font-display font-semibold text-ink-900 mb-4">Account details</h3>
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-navy-800 text-white flex items-center justify-center font-semibold shrink-0">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-[160px]">
              <p className="font-medium text-ink-900">{user?.email}</p>
              <p className="text-xs text-slate-500">Member since {new Date(user?.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex gap-2">
              {user?.is_verified && <Badge variant="teal"><ShieldCheck className="w-3 h-3" /> Verified</Badge>}
              <Badge variant="slate" className="capitalize">{user?.auth_provider} login</Badge>
            </div>
          </div>
        </Card>

        {/* Edit profile */}
        <Card className="p-6">
          <h3 className="font-display font-semibold text-ink-900 mb-5">Edit patient profile</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <Input label="Full name" value={profile.full_name || ""} onChange={(e) => set("full_name", e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Age" type="number" value={profile.age || ""} onChange={(e) => set("age", Number(e.target.value))} />
              <Select label="Gender" value={profile.gender || ""} onChange={(e) => set("gender", e.target.value)}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Date of birth"
                type="date"
                value={profile.date_of_birth ? profile.date_of_birth.slice(0, 10) : ""}
                onChange={(e) => set("date_of_birth", e.target.value)}
              />
              <Input label="Phone number" value={profile.phone_number || ""} onChange={(e) => set("phone_number", e.target.value)} />
            </div>
            <Input label="Address" value={profile.address || ""} onChange={(e) => set("address", e.target.value)} />
            <Textarea label="Existing diseases" value={profile.existing_diseases || ""} onChange={(e) => set("existing_diseases", e.target.value)} />
            <label className="flex items-center gap-2.5 text-sm text-ink-900">
              <input
                type="checkbox"
                checked={!!profile.family_history_parkinsons}
                onChange={(e) => set("family_history_parkinsons", e.target.checked)}
                className="w-4 h-4 rounded border-mist-200 text-teal-600 focus:ring-teal-500/30"
              />
              Family history of Parkinson's disease
            </label>
            <Textarea label="Current medications" value={profile.current_medications || ""} onChange={(e) => set("current_medications", e.target.value)} />
            <Textarea label="Medical history" value={profile.medical_history || ""} onChange={(e) => set("medical_history", e.target.value)} />
            <div className="grid grid-cols-3 gap-4">
              <Select label="Smoking" value={profile.smoking_status || ""} onChange={(e) => set("smoking_status", e.target.value)}>
                <option value="">—</option>
                <option value="never">Never</option>
                <option value="former">Former</option>
                <option value="current">Current</option>
              </Select>
              <Select label="Alcohol" value={profile.alcohol_consumption || ""} onChange={(e) => set("alcohol_consumption", e.target.value)}>
                <option value="">—</option>
                <option value="none">None</option>
                <option value="occasional">Occasional</option>
                <option value="regular">Regular</option>
              </Select>
              <Select label="Exercise" value={profile.exercise_habits || ""} onChange={(e) => set("exercise_habits", e.target.value)}>
                <option value="">—</option>
                <option value="sedentary">Sedentary</option>
                <option value="light">Light</option>
                <option value="moderate">Moderate</option>
                <option value="active">Active</option>
              </Select>
            </div>
            <Textarea label="Additional health notes" value={profile.additional_notes || ""} onChange={(e) => set("additional_notes", e.target.value)} />

            <Button type="submit" variant="accent" loading={saving}><Save className="w-4 h-4" /> Save changes</Button>
          </form>
        </Card>

        {/* Security */}
        <Card className="p-6">
          <h3 className="font-display font-semibold text-ink-900 mb-4">Security</h3>
          <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-mist-100">
            <div>
              <p className="text-sm font-medium text-ink-900">Password</p>
              <p className="text-xs text-slate-500">Reset your password via a one-time email code</p>
            </div>
            <Button variant="outline" onClick={handleChangePassword} loading={sendingReset}>
              <KeyRound className="w-4 h-4" /> Change password
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink-900">Log out</p>
              <p className="text-xs text-slate-500">End your session on this device</p>
            </div>
            <Button variant="danger" onClick={handleLogout}><LogOut className="w-4 h-4" /> Logout</Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
