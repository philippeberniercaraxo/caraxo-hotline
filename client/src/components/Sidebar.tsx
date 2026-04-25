import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import type { AuthUser } from "../App";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface Props {
  user: AuthUser;
  onLogout: () => void;
  items: NavItem[];
}

export default function Sidebar({ user, onLogout, items }: Props) {
  const [location] = useLocation();

  return (
    <aside className="w-60 min-h-screen flex flex-col border-r border-border bg-card" data-testid="sidebar">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #01696F, #004F54)" }}>
            <svg width="20" height="20" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="16" stroke="white" strokeWidth="2"/>
              <path d="M10 18 C10 13 14 10 18 10 C22 10 26 13 26 18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M18 18 L18 26" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="18" cy="18" r="2.5" fill="white"/>
            </svg>
          </div>
          <div>
            <p className="font-bold text-sm leading-none">CARAXO</p>
            <p className="text-xs text-muted-foreground mt-0.5">Hotline</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map(item => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <a className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "text-white"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              style={isActive ? { background: "linear-gradient(135deg, #01696F, #004F54)" } : {}}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {item.icon}
                {item.label}
              </a>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
               style={{ background: "linear-gradient(135deg, #01696F, #004F54)" }}>
            {user.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.role === "admin" ? "Administrateur" : "Consultant"}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          data-testid="button-logout"
          className="w-full text-xs text-muted-foreground hover:text-foreground text-left px-2 py-1.5 rounded hover:bg-muted transition-colors"
        >
          Déconnexion →
        </button>
      </div>
    </aside>
  );
}
