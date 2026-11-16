import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { RequireAuth, RequireAuthNoProfileCheck, RedirectIfAuthed } from "./components/Guards";

import Landing from "./pages/Landing";
import SignUp from "./pages/auth/SignUp";
import Login from "./pages/auth/Login";
import VerifyOTP from "./pages/auth/VerifyOTP";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Onboarding from "./pages/Onboarding";

import Dashboard from "./pages/app/Dashboard";
import UploadSample from "./pages/app/UploadSample";
import Result from "./pages/app/Result";
import BatchResult from "./pages/app/BatchResult";
import Records from "./pages/app/Records";
import Guide from "./pages/app/Guide";
import Feedback from "./pages/app/Feedback";
import ProfileSettings from "./pages/app/ProfileSettings";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/signup" element={<RedirectIfAuthed><SignUp /></RedirectIfAuthed>} />
            <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
            <Route path="/verify-otp" element={<VerifyOTP />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Onboarding: authed but profile may not be complete yet */}
            <Route element={<RequireAuthNoProfileCheck />}>
              <Route path="/onboarding" element={<Onboarding />} />
            </Route>

            {/* App: authed + profile complete */}
            <Route element={<RequireAuth />}>
              <Route path="/app" element={<Dashboard />} />
              <Route path="/app/upload" element={<UploadSample />} />
              <Route path="/app/results/:reportId" element={<Result />} />
              <Route path="/app/batch-results/:batchReportId" element={<BatchResult />} />
              <Route path="/app/records" element={<Records />} />
              <Route path="/app/guide" element={<Guide />} />
              <Route path="/app/feedback" element={<Feedback />} />
              <Route path="/app/profile" element={<ProfileSettings />} />
            </Route>

            <Route path="*" element={<Landing />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
