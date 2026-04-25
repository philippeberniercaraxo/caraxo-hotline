import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { AuthUser } from "../App";

interface Props {
  onLogin: (token: string, user: AuthUser) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de connexion");
      return data;
    },
    onSuccess: (data) => {
      onLogin(data.token, data.user);
    },
    onError: (err: Error) => {
      toast({ title: "Connexion échouée", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #004F54 0%, #01696F 50%, #0C8A92 100%)" }}>
      <div className="w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-4">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-label="CARAXO">
              <circle cx="18" cy="18" r="16" stroke="white" strokeWidth="2"/>
              <path d="M10 18 C10 13 14 10 18 10 C22 10 26 13 26 18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M18 18 L18 26" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="18" cy="18" r="2.5" fill="white"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">CARAXO</h1>
          <p className="text-white/70 mt-1 text-sm font-medium">Hotline · Gestion des tickets</p>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="pb-4">
            <h2 className="text-lg font-semibold text-center text-foreground">Connexion</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                data-testid="input-email"
                type="email"
                placeholder="votre@caraxo.fr"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && loginMutation.mutate()}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                data-testid="input-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && loginMutation.mutate()}
              />
            </div>
            <Button
              data-testid="button-login"
              className="w-full text-white font-semibold"
              style={{ background: "linear-gradient(135deg, #01696F, #004F54)" }}
              onClick={() => loginMutation.mutate()}
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Connexion..." : "Se connecter"}
            </Button>
            <p className="text-xs text-center text-muted-foreground pt-2">
              Accès réservé aux consultants CARAXO
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
