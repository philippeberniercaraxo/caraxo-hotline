import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ComplexiteBadge, QualiteBadge, AbonneBadge, DelaiLabel, TypeBadge } from "@/components/TicketBadges";

export default function ConsultantView() {
  const [selectedConsultant, setSelectedConsultant] = useState<string>("all");
  const [selectedRecap, setSelectedRecap] = useState<string>("all");

  const { data: users = [] } = useQuery<any[]>({ queryKey: ["/api/users"] });
  const { data: allRecaps = [], isLoading: rLoading } = useQuery<any[]>({ queryKey: ["/api/recaps"] });
  const { data: allTickets = [], isLoading: tLoading } = useQuery<any[]>({ queryKey: ["/api/tickets"] });

  const consultants = users.filter((u: any) => u.role === "consultant");

  const filteredRecaps = selectedConsultant === "all"
    ? allRecaps
    : allRecaps.filter((r: any) => String(r.consultantId) === selectedConsultant);

  const filteredTickets = allTickets.filter((t: any) => {
    const consultantOk = selectedConsultant === "all" || String(t.consultantId) === selectedConsultant;
    const recapOk = selectedRecap === "all" || String(t.recapId) === selectedRecap;
    return consultantOk && recapOk;
  });

  const totalQ = filteredTickets.reduce((s: number, t: any) => s + t.nbQuestions, 0);
  const totalF = filteredTickets.reduce((s: number, t: any) => s + t.montantFacture, 0);
  const avgQ = filteredTickets.length ? (filteredTickets.reduce((s: number, t: any) => s + t.qualite, 0) / filteredTickets.length).toFixed(1) : "—";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold">Par consultant</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Sélectionnez un consultant pour filtrer ses récaps</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="w-52">
          <Select value={selectedConsultant} onValueChange={v => { setSelectedConsultant(v); setSelectedRecap("all"); }}>
            <SelectTrigger data-testid="select-consultant">
              <SelectValue placeholder="Tous les consultants" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les consultants</SelectItem>
              {consultants.map((u: any) => (
                <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-52">
          <Select value={selectedRecap} onValueChange={setSelectedRecap}>
            <SelectTrigger data-testid="select-recap">
              <SelectValue placeholder="Tous les récaps" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les récaps</SelectItem>
              {filteredRecaps.map((r: any) => (
                <SelectItem key={r.id} value={String(r.id)}>Sem. {r.weekLabel}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Tickets", value: filteredTickets.length },
          { label: "Questions", value: totalQ },
          { label: "Qualité moy.", value: avgQ },
          { label: "Facturation", value: `${totalF} €` },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="py-3 px-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-xl font-bold mt-0.5" style={{ color: "#01696F" }}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recaps list */}
      {selectedConsultant !== "all" && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Récaps de la période</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {["Semaine","Fichier","Tickets","Statut"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRecaps.map((r: any, i: number) => (
                  <tr key={r.id} className={`border-b ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                    <td className="px-4 py-2.5 text-xs font-medium">{r.weekLabel}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.fileName || "—"}</td>
                    <td className="px-4 py-2.5 text-xs">{allTickets.filter((t: any) => t.recapId === r.id).length}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                        Validé
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Tickets table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Tickets ({filteredTickets.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {tLoading ? <div className="p-4"><Skeleton className="h-40 w-full" /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {["Consultant","Semaine","Client","Interlocuteur","Thème","Q.","Type","Délai","Complexité","Qualité","Abonné","Montant","Alertes"].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((t: any, idx: number) => {
                    const recap = allRecaps.find((r: any) => r.id === t.recapId);
                    const alerts = JSON.parse(t.alertes || "[]");
                    return (
                      <tr key={t.id} className={`border-b ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
                          data-testid={`row-ticket-consultant-${t.id}`}>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{t.consultantName || "—"}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{recap?.weekLabel || "—"}</td>
                        <td className="px-3 py-2.5 text-xs font-medium">{t.client}</td>
                        <td className="px-3 py-2.5 text-xs">{t.interlocuteur}</td>
                        <td className="px-3 py-2.5 text-xs max-w-[160px]">
                          <p className="truncate" title={t.theme}>{t.theme}</p>
                        </td>
                        <td className="px-3 py-2.5 text-xs font-semibold">{t.nbQuestions}</td>
                        <td className="px-3 py-2.5"><TypeBadge type={t.typeQuestion} /></td>
                        <td className="px-3 py-2.5"><DelaiLabel days={t.delaiJours} /></td>
                        <td className="px-3 py-2.5"><ComplexiteBadge level={t.complexite} /></td>
                        <td className="px-3 py-2.5"><QualiteBadge level={t.qualite} /></td>
                        <td className="px-3 py-2.5"><AbonneBadge status={t.abonne} /></td>
                        <td className="px-3 py-2.5 text-xs font-bold" style={{ color: "#01696F" }}>{t.montantFacture} €</td>
                        <td className="px-3 py-2.5">
                          {alerts.length > 0 && (
                            <span className="text-amber-600 text-xs font-medium" title={alerts.join("\n")}>⚠ {alerts.length}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredTickets.length === 0 && (
                <div className="py-12 text-center text-sm text-muted-foreground">Aucun ticket pour ce filtre</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
