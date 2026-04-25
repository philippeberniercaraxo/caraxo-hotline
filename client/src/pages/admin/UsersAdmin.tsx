import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function UsersAdmin() {
  const { toast } = useToast();
  const { data: users = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/users"] });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "consultant" });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/users", form);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setOpen(false);
      setForm({ name: "", email: "", password: "", role: "consultant" });
      toast({ title: "Utilisateur créé ✓" });
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Gestion des utilisateurs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{users.length} utilisateur(s) enregistré(s)</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-user" className="text-white" style={{ background: "#01696F" }}>
              + Ajouter un utilisateur
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvel utilisateur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Nom complet</Label>
                <Input data-testid="input-user-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Prénom Nom" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input data-testid="input-user-email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="prenom@caraxo.fr" />
              </div>
              <div className="space-y-1.5">
                <Label>Mot de passe</Label>
                <Input data-testid="input-user-password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Rôle</Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger data-testid="select-user-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultant">Consultant</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button data-testid="button-create-user" className="w-full text-white" style={{ background: "#01696F" }}
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !form.email || !form.password || !form.name}>
                {createMutation.isPending ? "Création…" : "Créer le compte"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Comptes actifs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {["Utilisateur","Email","Rôle","Créé le"].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u: any, i: number) => (
                <tr key={u.id} className={`border-b ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
                    data-testid={`row-user-${u.id}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                           style={{ background: u.role === "admin" ? "#004F54" : "#01696F" }}>
                        {u.name.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      u.role === "admin"
                        ? "bg-purple-50 text-purple-700 border border-purple-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}>
                      {u.role === "admin" ? "Admin" : "Consultant"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString("fr-FR") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Default credentials reminder */}
      <Card className="border-muted bg-muted/20">
        <CardContent className="py-4 px-5">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Comptes créés automatiquement au démarrage</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Admin (vous)</p>
              <p>admin@caraxo.fr</p>
              <p className="font-mono bg-muted px-1 rounded text-foreground mt-0.5">caraxo2026!</p>
            </div>
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Margaux (consultant)</p>
              <p>margaux@caraxo.fr</p>
              <p className="font-mono bg-muted px-1 rounded text-foreground mt-0.5">margaux2026</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
