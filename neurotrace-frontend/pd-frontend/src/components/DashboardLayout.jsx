import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Upload, BarChart3, BookOpen, Star, User, LogOut, Menu, X,
} from "lucide-react";
import Logo from "./Logo";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/upload", label: "Upload Sample", icon: Upload },
  { to: "/app/records", label: "Analysis Records", icon: BarChart3 },
  { to: "/app/guide", label: "Guide", icon: BookOpen },
  { to: "/app/feedback", label: "Feedback", icon: Star },
  { to: "/app/profile", label: "Profile", icon: User },
];

function SidebarContent({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 h-16 flex items-center border-b border-mist-200">
        <Logo />
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-mist-100 hover:text-ink-900"
              }`
            }
          >
            <item.icon className="w-[18px] h-[18px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-mist-200">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-navy-800 text-white flex items-center justify-center text-xs font-semibold shrink-0">
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <p className="text-xs text-slate-500 truncate">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
        >
          <LogOut className="w-[18px] h-[18px]" />
          Logout
        </button>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children, title, breadcrumb }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-mist-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-mist-200 bg-white fixed inset-y-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-card-hover">
            <button className="absolute top-4 right-4 text-slate-500" onClick={() => setMobileOpen(false)}>
              <X className="w-5 h-5" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <header className="h-16 border-b border-mist-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 flex items-center px-4 lg:px-8 gap-4">
          <button className="lg:hidden text-ink-900" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="w-6 h-6" />
          </button>
          <div>
            {breadcrumb && <p className="text-xs text-slate-500 mb-0.5">{breadcrumb}</p>}
            <h1 className="font-display font-semibold text-lg text-ink-900">{title}</h1>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
