import { Switch, Route } from "wouter";
import Sidebar from "@/components/Sidebar";
import type { AuthUser } from "../../App";
import Dashboard from "./Dashboard";
import ConsultantView from "./ConsultantView";
import FacturationView from "./FacturationView";
import UsersAdmin from "./UsersAdmin";
import SemaineView from "./SemaineView";

const NAV_ITEMS = [
  { href: "/", label: "Vue globale", icon: <GridIcon /> },
  { href: "/consultants", label: "Par consultant", icon: <UsersIcon /> },
  { href: "/semaine", label: "Vue semaine", icon: <CalendarIcon /> },
  { href: "/facturation", label: "Facturation", icon: <EuroIcon /> },
  { href: "/utilisateurs", label: "Utilisateurs", icon: <SettingsIcon /> },
];

export default function AdminLayout({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar user={user} onLogout={onLogout} items={NAV_ITEMS} />
      <main className="flex-1 overflow-auto">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/consultants" component={ConsultantView} />
          <Route path="/semaine" component={SemaineView} />
          <Route path="/facturation" component={FacturationView} />
          <Route path="/utilisateurs" component={UsersAdmin} />
        </Switch>
      </main>
    </div>
  );
}

function GridIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>;
}
function UsersIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>;
}
function EuroIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9"/><path d="M14.5 8.5a4 4 0 1 0 0 7"/>
    <line x1="7" y1="11" x2="14" y2="11"/><line x1="7" y1="13" x2="14" y2="13"/>
  </svg>;
}
function SettingsIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
  </svg>;
}
function CalendarIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>;
}
