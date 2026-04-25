import { useState, Component, type ReactNode } from "react";
import { Switch, Route, Router, Link } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { setToken } from "./lib/auth";
import LoginPage from "./pages/Login";
import ConsultantLayout from "./pages/consultant/Layout";
import AdminLayout from "./pages/admin/Layout";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: "consultant" | "admin";
}

// Error boundary to catch silent crashes
class ErrorBoundary extends Component<{children: ReactNode}, {error: string | null}> {
  state = { error: null };
  static getDerivedStateFromError(err: Error) { return { error: err.message }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, color: 'red', background: '#fff' }}>
          <h2>Erreur de rendu</h2>
          <pre>{this.state.error}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);

  function handleLogin(token: string, u: AuthUser) {
    setToken(token);
    setUser(u);
  }

  function handleLogout() {
    setToken(null);
    setUser(null);
    queryClient.clear();
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router hook={useHashLocation}>
          {!user ? (
            <LoginPage onLogin={handleLogin} />
          ) : user.role === "admin" ? (
            <AdminLayout user={user} onLogout={handleLogout} />
          ) : (
            <ConsultantLayout user={user} onLogout={handleLogout} />
          )}
        </Router>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
