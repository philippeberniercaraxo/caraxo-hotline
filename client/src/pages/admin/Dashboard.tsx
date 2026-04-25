import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ComplexiteBadge, QualiteBadge, AbonneBadge, DelaiLabel } from "@/components/TicketBadges";

interface GlobalStats {
  totalTickets: number; totalQuestions: number; totalFacturation: number;
  avgDelai: number; totalRecaps: number; totalConsultants: number;
  byClient: Record<string, { tickets: number; questions: number; facturation: number }>;
  byConsultant: Record<string, { name: string; tickets: number; questions: number; facturation: number; avgQualite: number }>;
  alerts: { id: number; client: string; theme: string; alertes: string[] }[];
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<GlobalStats>({ queryKey: ["/api/stats/global"] });
  const { data: tickets = [] } = useQuery<any[]>({ queryKey: ["/api/tickets"] });

  if (isLoading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}</div>
    </div>
  );

  const clients = Object.entries(stats?.byClient || {}).sort((a, b) => b[1].questions - a[1].questions);
  const consultants = Object.entries(stats?.byConsultant || {});

  const recentTickets = [...tickets].sort((a, b) => b.dateReponse?.localeCompare(a.dateReponse || "") || 0).slice(0, 8);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Tableau de bord global</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Vue consolidée de tous les consultants</p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        {[
          { label: "Tickets", value: stats?.totalTickets ?? 0 },
          { label: "Questions", value: stats?.totalQuestions ?? 0 },
          { label: "Facturation", value: `${stats?.totalFacturation ?? 0} €` },
          { label: "Délai moyen", value: stats?.avgDelai === 0 ? "J0" : `J+${stats?.avgDelai}` },
          { label: "Récaps", value: stats?.totalRecaps ?? 0 },
          { label: "Consultants", value: stats?.totalConsultants ?? 0 },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="py-3 px-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-xl font-bold mt-0.5" style={{ color: "#01696F" }}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      {stats?.alerts && stats.alerts.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-800">⚠ Alertes en attente ({stats.alerts.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.alerts.map(a => (
              <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                <span className="text-amber-500 text-lg leading-none">⚠</span>
                <div>
                  <p className="text-xs font-semibold text-amber-900">{a.client} — {a.theme}</p>
                  {a.alertes.map((al, i) => (
                    <p key={i} className="text-xs text-amber-700">• {al}</p>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-5">
        {/* By client */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Par client</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {["Client","Tickets","Questions","Facturation"].map(h => (
                    <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map(([client, d], i) => (
                  <tr key={client} className={`border-b ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
                      data-testid={`row-client-${client}`}>
                    <td className="px-4 py-2.5 font-medium text-xs">{client}</td>
                    <td className="px-4 py-2.5 text-xs">{d.tickets}</td>
                    <td className="px-4 py-2.5 text-xs font-semibold">{d.questions}</td>
                    <td className="px-4 py-2.5 text-xs font-bold" style={{ color: "#01696F" }}>{d.facturation} €</td>
                  </tr>
                ))}
                {clients.length > 0 && (
                  <tr className="border-t-2 bg-muted/20" style={{ borderColor: "#01696F" }}>
                    <td className="px-4 py-2 text-xs font-bold" style={{ color: "#01696F" }}>TOTAL</td>
                    <td className="px-4 py-2 text-xs font-bold">{stats?.totalTickets}</td>
                    <td className="px-4 py-2 text-xs font-bold">{stats?.totalQuestions}</td>
                    <td className="px-4 py-2 text-xs font-bold" style={{ color: "#01696F" }}>{stats?.totalFacturation} €</td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* By consultant */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Par consultant</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {["Consultant","Tickets","Questions","Qualité moy.","Facturation"].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {consultants.map(([cid, d], i) => (
                  <tr key={cid} className={`border-b ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                             style={{ background: "#01696F" }}>
                          {d.name.slice(0, 1)}
                        </div>
                        <span className="text-xs font-medium">{d.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs">{d.tickets}</td>
                    <td className="px-3 py-2.5 text-xs font-semibold">{d.questions}</td>
                    <td className="px-3 py-2.5">
                      <QualiteBadge level={Math.round(d.avgQualite) || 1} />
                    </td>
                    <td className="px-3 py-2.5 text-xs font-bold" style={{ color: "#01696F" }}>{d.facturation} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Recent tickets */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Derniers tickets enregistrés</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {["Consultant","Client","Thème","Q.","Délai","Complexité","Qualité","Abonné","Montant"].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentTickets.map((t, idx) => (
                  <tr key={t.id} className={`border-b ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{t.consultantName || "—"}</td>
                    <td className="px-3 py-2.5 text-xs font-medium">{t.client}</td>
                    <td className="px-3 py-2.5 text-xs max-w-[180px]">
                      <p className="truncate" title={t.theme}>{t.theme}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-semibold">{t.nbQuestions}</td>
                    <td className="px-3 py-2.5"><DelaiLabel days={t.delaiJours} /></td>
                    <td className="px-3 py-2.5"><ComplexiteBadge level={t.complexite} /></td>
                    <td className="px-3 py-2.5"><QualiteBadge level={t.qualite} /></td>
                    <td className="px-3 py-2.5"><AbonneBadge status={t.abonne} /></td>
                    <td className="px-3 py-2.5 text-xs font-bold" style={{ color: "#01696F" }}>{t.montantFacture} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
