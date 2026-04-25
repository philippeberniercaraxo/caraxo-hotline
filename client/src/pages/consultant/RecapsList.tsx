import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Recap } from "@shared/schema";

export default function RecapsList() {
  const { data: recaps = [], isLoading } = useQuery<Recap[]>({ queryKey: ["/api/recaps"] });
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/recaps/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recaps"] });
      toast({ title: "Récap supprimé" });
    },
  });

  const totalFacturation = recaps.reduce((sum, r) => sum, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Mes récaps hebdomadaires</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{recaps.length} récap(s) enregistré(s)</p>
        </div>
        <Link href="/nouveau">
          <Button data-testid="button-new-recap" className="text-white" style={{ background: "#01696F" }}>
            + Nouveau récap
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : recaps.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <p className="font-medium text-foreground">Aucun récap pour l'instant</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Déposez votre premier document Word pour commencer</p>
            <Link href="/nouveau">
              <Button className="text-white" style={{ background: "#01696F" }}>Déposer un récap</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {recaps.map((recap) => (
            <RecapCard key={recap.id} recap={recap} onDelete={() => deleteMutation.mutate(recap.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function RecapCard({ recap, onDelete }: { recap: Recap; onDelete: () => void }) {
  const { data: tickets = [] } = useQuery({ queryKey: ["/api/tickets/recap", recap.id], queryFn: async () => {
    const res = await apiRequest("GET", `/api/tickets/recap/${recap.id}`);
    return res.json();
  }});

  const totalQ = tickets.reduce((s: number, t: any) => s + t.nbQuestions, 0);
  const totalF = tickets.reduce((s: number, t: any) => s + t.montantFacture, 0);
  const alerts = tickets.flatMap((t: any) => JSON.parse(t.alertes || "[]")).length;

  return (
    <Card className="card-hover" data-testid={`card-recap-${recap.id}`}>
      <CardContent className="py-4 px-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                 style={{ background: "linear-gradient(135deg, #01696F, #004F54)" }}>
              {new Date(recap.weekStart).toLocaleDateString("fr-FR", { day: "2-digit" })}
            </div>
            <div>
              <p className="font-semibold text-sm">Semaine du {recap.weekLabel}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tickets.length} ticket(s) · {totalQ} question(s)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {alerts > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                ⚠ {alerts} alerte{alerts > 1 ? "s" : ""}
              </span>
            )}
            <div className="text-right">
              <p className="font-bold text-sm" style={{ color: "#01696F" }}>{totalF} €</p>
              <p className="text-xs text-muted-foreground">facturation</p>
            </div>
            <div className="flex gap-2">
              <Link href={`/recap/${recap.id}`}>
                <Button variant="outline" size="sm" data-testid={`button-view-recap-${recap.id}`}>Voir</Button>
              </Link>
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700"
                onClick={onDelete} data-testid={`button-delete-recap-${recap.id}`}>✕</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
