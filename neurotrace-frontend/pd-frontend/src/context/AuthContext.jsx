import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, setTokens, clearTokens, getTokens } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const { access } = getTokens();
    if (!access) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.get("/auth/me");
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  async function completeAuth(tokenResponse) {
    setTokens(tokenResponse.access_token, tokenResponse.refresh_token);
    await loadUser();
  }

  async function logout() {
    const { refresh } = getTokens();
    try {
      if (refresh) await api.post("/auth/logout", { refresh_token: refresh });
    } catch {
      // ignore - we're clearing local state regardless
    }
    clearTokens();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, completeAuth, logout, refreshUser: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
