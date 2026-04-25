import { Switch, Route } from "wouter";
import Sidebar from "@/components/Sidebar";
import type { AuthUser } from "../../App";
import RecapsList from "./RecapsList";
import NewRecap from "./NewRecap";
import RecapDetail from "./RecapDetail";

const NAV_ITEMS = [
  { href: "/", label: "Mes récaps", icon: <CalendarIcon /> },
  { href: "/nouveau", label: "Nouveau récap", icon: <PlusIcon /> },
];

export default function ConsultantLayout({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar user={user} onLogout={onLogout} items={NAV_ITEMS} />
      <main className="flex-1 overflow-auto">
        <Switch>
          <Route path="/" component={RecapsList} />
          <Route path="/nouveau" component={NewRecap} />
          <Route path="/recap/:id" component={RecapDetail} />
        </Switch>
      </main>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="16"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  );
}
