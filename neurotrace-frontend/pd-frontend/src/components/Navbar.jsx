import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Logo from "./Logo";
import Button from "./ui/Button";
import { useAuth } from "../context/AuthContext";

const links = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-mist-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/"><Logo /></Link>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-slate-600 hover:text-ink-900 transition-colors">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <Button variant="accent" onClick={() => navigate("/app")}>Go to Dashboard</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => navigate("/login")}>Log in</Button>
              <Button variant="accent" onClick={() => navigate("/signup")}>Get Started</Button>
            </>
          )}
        </div>

        <button className="md:hidden text-ink-900" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-mist-200 bg-white px-6 py-4 flex flex-col gap-4">
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-sm font-medium text-slate-600">
              {l.label}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-2">
            {user ? (
              <Button variant="accent" onClick={() => navigate("/app")}>Go to Dashboard</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => navigate("/login")}>Log in</Button>
                <Button variant="accent" onClick={() => navigate("/signup")}>Get Started</Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
