import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ComplexiteBadge, QualiteBadge, AbonneBadge, DelaiLabel, TypeBadge } from "@/components/TicketBadges";
import type { Ticket, Recap } from "@shared/schema";

export default function RecapDetail() {
  const [, params] = useRoute("/recap/:id");
  const recapId = params?.id;

  const { data: recaps = [], isLoading: rLoading } = useQuery<Recap[]>({ queryKey: ["/api/recaps"] });
  const recap = recaps.find(r => r.id === parseInt(recapId || "0"));

  const { data: tickets = [], isLoading: tLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets/recap", recapId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/tickets/recap/${recapId}`);
      return res.json();
    },
    enabled: !!recapId,
  });

  const totalQ = tickets.reduce((s, t) => s + t.nbQuestions, 0);
  const totalF = tickets.reduce((s, t) => s + t.montantFacture, 0);
  const avgDelai = tickets.length ? Math.round(tickets.reduce((s, t) => s + t.delaiJours, 0) / tickets.length * 10) / 10 : 0;
  const alerts = tickets.flatMap(t => JSON.parse(t.alertes || "[]"));

  if (rLoading || tLoading) return <div className="p-6"><Skeleton className="h-40 w-full" /></div>;
  if (!recap) return <div className="p-6 text-muted-foreground">Récap introuvable</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold">Semaine {recap.weekLabel}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{recap.fileName}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Tickets", value: tickets.length },
          { label: "Questions", value: totalQ },
          { label: "Délai moyen", value: avgDelai === 0 ? "J0" : `J+${avgDelai}` },
          { label: "Facturation", value: `${totalF} €` },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="py-3 px-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-lg font-bold mt-0.5" style={{ color: "#01696F" }}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-1">
          <p className="text-sm font-semibold text-amber-800">⚠ Alertes</p>
          {alerts.map((a: string, i: number) => (
            <p key={i} className="text-xs text-amber-700">• {a}</p>
          ))}
        </div>
      )}

      {/* Tickets */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Détail des tickets</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {["#","Client","Interlocuteur","Thème","Q.","Type","Délai","Complexité","Qualité","Abonné","Montant"].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tickets.map((t, idx) => (
                  <tr key={t.id} className={idx % 2 === 0 ? "bg-white border-b" : "bg-slate-50/40 border-b"} data-testid={`row-ticket-detail-${t.id}`}>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{idx + 1}</td>
                    <td className="px-3 py-2.5 font-medium text-xs">{t.client}</td>
                    <td className="px-3 py-2.5 text-xs">{t.interlocuteur}</td>
                    <td className="px-3 py-2.5 text-xs max-w-[200px]">
                      <p className="truncate" title={t.theme}>{t.theme}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-semibold">{t.nbQuestions}</td>
                    <td className="px-3 py-2.5"><TypeBadge type={t.typeQuestion} /></td>
                    <td className="px-3 py-2.5"><DelaiLabel days={t.delaiJours} /></td>
                    <td className="px-3 py-2.5"><ComplexiteBadge level={t.complexite} /></td>
                    <td className="px-3 py-2.5"><QualiteBadge level={t.qualite} /></td>
                    <td className="px-3 py-2.5"><AbonneBadge status={t.abonne} /></td>
                    <td className="px-3 py-2.5 font-semibold text-xs" style={{ color: "#01696F" }}>{t.montantFacture} €</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2" style={{ borderColor: "#01696F" }}>
                  <td colSpan={4} className="px-3 py-2.5 text-xs font-semibold" style={{ color: "#01696F" }}>TOTAL</td>
                  <td className="px-3 py-2.5 text-xs font-bold">{totalQ}</td>
                  <td colSpan={5} />
                  <td className="px-3 py-2.5 text-sm font-bold" style={{ color: "#01696F" }}>{totalF} €</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
