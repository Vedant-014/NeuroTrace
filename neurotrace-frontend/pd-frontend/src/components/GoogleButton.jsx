import { useEffect, useRef } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useNavigate } from "react-router-dom";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleButton() {
  const ref = useRef(null);
  const { completeAuth } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    function init() {
      if (!window.google || !ref.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            const tokens = await api.post("/auth/google", { id_token: response.credential });
            await completeAuth(tokens);
            toast.success("Signed in with Google");
            navigate("/app");
          } catch (err) {
            toast.error(err.message || "Google sign-in failed");
          }
        },
      });
      window.google.accounts.id.renderButton(ref.current, {
        theme: "outline",
        size: "large",
        width: ref.current.offsetWidth,
        text: "continue_with",
      });
    }

    if (window.google?.accounts?.id) {
      init();
    } else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = init;
      document.body.appendChild(script);
    }
  }, [completeAuth, navigate, toast]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <button
        type="button"
        disabled
        title="Set VITE_GOOGLE_CLIENT_ID in your .env to enable Google sign-in"
        className="w-full flex items-center justify-center gap-2 border border-mist-200 rounded-xl py-2.5 text-sm font-medium text-slate-400 cursor-not-allowed"
      >
        Continue with Google (not configured)
      </button>
    );
  }

  return <div ref={ref} className="w-full flex justify-center [&>div]:w-full" />;
}
