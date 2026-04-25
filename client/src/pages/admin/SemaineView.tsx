import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";

interface Ticket {
  id: number; client: string; interlocuteur: string; theme: string;
  nbQuestions: number; typeQuestion: string; dateReception: string; dateReponse: string;
  delaiJours: number; complexite: number; qualite: number; abonne: string;
  montantFacture: number; alertes: string; consultantName: string; consultantId: number;
}

interface Recap {
  id: number; weekLabel: string; weekStart: string; weekEnd: string;
  consultantId: number; consultantName: string; fileName: string;
}

function getISOWeek(dateStr: string) {
  const d = new Date(dateStr);
  const dayOfWeek = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dayOfWeek);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-S${String(week).padStart(2, "0")}`;
}

function weekLabel(key: string) {
  const [year, sw] = key.split("-S");
  return `Semaine ${sw} — ${year}`;
}

export default function SemaineView() {
  const { data: tickets = [], isLoading } = useQuery<Ticket[]>({ queryKey: ["/api/tickets"] });
  const { data: recaps = [] } = useQuery<Recap[]>({ queryKey: ["/api/recaps"] });

  // Build week options from recaps
  const weekOptions = useMemo(() => {
    const weeks = new Set<string>();
    recaps.forEach(r => {
      if (r.weekStart) weeks.add(getISOWeek(r.weekStart));
    });
    // Also from tickets
    tickets.forEach(t => {
      if (t.dateReception) weeks.add(getISOWeek(t.dateReception));
    });
    return Array.from(weeks).sort().reverse();
  }, [recaps, tickets]);

  const [selectedWeek, setSelectedWeek] = useState<string>("all");

  // Filter tickets by week
  const filteredTickets = useMemo(() => {
    if (selectedWeek === "all") return tickets;
    return tickets.filter(t => t.dateReception && getISOWeek(t.dateReception) === selectedWeek);
  }, [tickets, selectedWeek]);

  // Aggregations
  const totalQ = filteredTickets.reduce((s, t) => s + t.nbQuestions, 0);
  const totalF = filteredTickets.reduce((s, t) => s + t.montantFacture, 0);
  const totalAlerts = filteredTickets.filter(t => {
    try { return JSON.parse(t.alertes || "[]").length > 0; } catch { return false; }
  }).length;

  // By consultant
  const byConsultant = useMemo(() => {
    const map: Record<string, { name: string; tickets: number; questions: number; facturation: number; alertes: number }> = {};
    filteredTickets.forEach(t => {
      const key = String(t.consultantId);
      if (!map[key]) map[key] = { name: t.consultantName || "Inconnu", tickets: 0, questions: 0, facturation: 0, alertes: 0 };
      map[key].tickets++;
      map[key].questions += t.nbQuestions;
      map[key].facturation += t.montantFacture;
      try { if (JSON.parse(t.alertes || "[]").length > 0) map[key].alertes++; } catch {}
    });
    return Object.values(map).sort((a, b) => b.facturation - a.facturation);
  }, [filteredTickets]);

  // By client
  const byClient = useMemo(() => {
    const map: Record<string, { tickets: number; questions: number; facturation: number }> = {};
    filteredTickets.forEach(t => {
      if (!map[t.client]) map[t.client] = { tickets: 0, questions: 0, facturation: 0 };
      map[t.client].tickets++;
      map[t.client].questions += t.nbQuestions;
      map[t.client].facturation += t.montantFacture;
    });
    return Object.entries(map).sort((a, b) => b[1].facturation - a[1].facturation);
  }, [filteredTickets]);

  if (isLoading) return <div className="p-6 text-muted-foreground">Chargement…</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Vue consolidée par semaine</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Tous les consultants regroupés sur une même période</p>
        </div>
        <Select value={selectedWeek} onValueChange={setSelectedWeek}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Choisir une semaine" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les semaines</SelectItem>
            {weekOptions.map(w => (
              <SelectItem key={w} value={w}>{weekLabel(w)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs globaux */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Tickets", value: filteredTickets.length },
          { label: "Questions", value: totalQ },
          { label: "Facturation totale", value: `${totalF} €` },
          { label: "Alertes", value: totalAlerts, warn: totalAlerts > 0 },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="py-4 px-5">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: kpi.warn ? "#d97706" : "#01696F" }}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Par consultant */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Répartition par consultant</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {byConsultant.length === 0 ? (
            <p className="text-sm text-muted-foreground px-5 py-4">Aucune donnée pour cette période.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {["Consultant", "Tickets", "Questions", "Facturation", "Alertes", "Part (%)"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byConsultant.map((c, i) => (
                  <tr key={i} className={`border-b ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3">{c.tickets}</td>
                    <td className="px-4 py-3">{c.questions}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: "#01696F" }}>{c.facturation} €</td>
                    <td className="px-4 py-3">
                      {c.alertes > 0 ? <span className="text-amber-600">⚠ {c.alertes}</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-1.5 max-w-[80px]">
                          <div className="h-1.5 rounded-full" style={{ background: "#01696F", width: `${totalF > 0 ? Math.round(c.facturation / totalF * 100) : 0}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{totalF > 0 ? Math.round(c.facturation / totalF * 100) : 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {/* Total row */}
                <tr className="border-t bg-teal-50/60 font-semibold">
                  <td className="px-4 py-3" style={{ color: "#01696F" }}>TOTAL</td>
                  <td className="px-4 py-3">{filteredTickets.length}</td>
                  <td className="px-4 py-3">{totalQ}</td>
                  <td className="px-4 py-3 text-lg" style={{ color: "#01696F" }}>{totalF} €</td>
                  <td className="px-4 py-3">{totalAlerts > 0 ? <span className="text-amber-600">⚠ {totalAlerts}</span> : "—"}</td>
                  <td className="px-4 py-3">100%</td>
                </tr>
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Par client */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Répartition par client</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {byClient.length === 0 ? (
            <p className="text-sm text-muted-foreground px-5 py-4">Aucune donnée pour cette période.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {["Client", "Tickets", "Questions", "Facturation", "Part (%)"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byClient.map(([client, data], i) => (
                  <tr key={i} className={`border-b ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                    <td className="px-4 py-3 font-medium">{client}</td>
                    <td className="px-4 py-3">{data.tickets}</td>
                    <td className="px-4 py-3">{data.questions}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: "#01696F" }}>{data.facturation} €</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-1.5 max-w-[80px]">
                          <div className="h-1.5 rounded-full" style={{ background: "#01696F", width: `${totalF > 0 ? Math.round(data.facturation / totalF * 100) : 0}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{totalF > 0 ? Math.round(data.facturation / totalF * 100) : 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Détail tous tickets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Tous les tickets ({filteredTickets.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {["#","Consultant","Client","Thème","Q.","Type","Réception","Délai","Montant","Alertes"].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((t, i) => {
                  const alertes = (() => { try { return JSON.parse(t.alertes || "[]"); } catch { return []; } })();
                  return (
                    <tr key={t.id} className={`border-b ${alertes.length > 0 ? "bg-amber-50/40" : i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                      <td className="px-3 py-2 text-muted-foreground text-xs">{i + 1}</td>
                      <td className="px-3 py-2 font-medium text-xs">{t.consultantName}</td>
                      <td className="px-3 py-2 text-xs">{t.client}</td>
                      <td className="px-3 py-2 text-xs max-w-[200px] truncate" title={t.theme}>{t.theme}</td>
                      <td className="px-3 py-2 text-xs">{t.nbQuestions}</td>
                      <td className="px-3 py-2 text-xs">{t.typeQuestion === "note_interne" ? "Note interne" : "Question"}</td>
                      <td className="px-3 py-2 text-xs">{t.dateReception.split("-").reverse().join("/")}</td>
                      <td className="px-3 py-2 text-xs">{t.delaiJours}j</td>
                      <td className="px-3 py-2 text-xs font-semibold" style={{ color: "#01696F" }}>{t.montantFacture} €</td>
                      <td className="px-3 py-2 text-xs">
                        {alertes.length > 0 ? <span className="text-amber-600" title={alertes.join("\n")}>⚠ {alertes.length}</span> : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
