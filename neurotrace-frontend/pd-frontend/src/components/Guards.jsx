import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PageSpinner } from "./ui/Primitives";

export function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.profile_completed) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

export function RequireAuthNoProfileCheck() {
  // Used for the onboarding/profile-setup route itself, so it doesn't redirect-loop
  const { user, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function RedirectIfAuthed({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (user) return <Navigate to={user.profile_completed ? "/app" : "/onboarding"} replace />;
  return children;
}
