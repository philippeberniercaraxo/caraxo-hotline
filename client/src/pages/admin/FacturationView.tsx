import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TypeBadge } from "@/components/TicketBadges";

export default function FacturationView() {
  const { data: allTickets = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/tickets"] });
  const { data: allRecaps = [] } = useQuery<any[]>({ queryKey: ["/api/recaps"] });

  // Group by client
  const byClient: Record<string, { tickets: any[]; total: number }> = {};
  for (const t of allTickets) {
    if (!byClient[t.client]) byClient[t.client] = { tickets: [], total: 0 };
    byClient[t.client].tickets.push(t);
    byClient[t.client].total += t.montantFacture;
  }
  const clientsSorted = Object.entries(byClient).sort((a, b) => b[1].total - a[1].total);

  // Group by consultant
  const byConsultant: Record<string, { name: string; tickets: any[]; total: number }> = {};
  for (const t of allTickets) {
    const name = t.consultantName || "Inconnu";
    if (!byConsultant[name]) byConsultant[name] = { name, tickets: [], total: 0 };
    byConsultant[name].tickets.push(t);
    byConsultant[name].total += t.montantFacture;
  }

  const grandTotal = allTickets.reduce((s: number, t: any) => s + t.montantFacture, 0);
  const totalQ = allTickets.reduce((s: number, t: any) => s + t.nbQuestions, 0);
  const noteInternes = allTickets.filter((t: any) => t.typeQuestion === "note_interne");
  const questions = allTickets.filter((t: any) => t.typeQuestion === "question");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold">Facturation</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Montants calculés : 17 € / question · 10 € / note interne</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total général", value: `${grandTotal} €` },
          { label: "Questions (17 €)", value: questions.length },
          { label: "Notes internes (10 €)", value: noteInternes.length },
          { label: "Total questions traitées", value: totalQ },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="py-3 px-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-xl font-bold mt-0.5" style={{ color: "#01696F" }}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

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
                  {["Client","Tickets","Questions","Montant"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientsSorted.map(([client, d], i) => (
                  <tr key={client} className={`border-b ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                    <td className="px-4 py-2.5 text-xs font-medium">{client}</td>
                    <td className="px-4 py-2.5 text-xs">{d.tickets.length}</td>
                    <td className="px-4 py-2.5 text-xs">{d.tickets.reduce((s, t) => s + t.nbQuestions, 0)}</td>
                    <td className="px-4 py-2.5 text-sm font-bold" style={{ color: "#01696F" }}>{d.total} €</td>
                  </tr>
                ))}
                <tr className="border-t-2" style={{ borderColor: "#01696F" }}>
                  <td className="px-4 py-2.5 text-xs font-bold" style={{ color: "#01696F" }}>TOTAL</td>
                  <td className="px-4 py-2.5 text-xs font-bold">{allTickets.length}</td>
                  <td className="px-4 py-2.5 text-xs font-bold">{totalQ}</td>
                  <td className="px-4 py-2.5 text-sm font-bold" style={{ color: "#01696F" }}>{grandTotal} €</td>
                </tr>
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
                  {["Consultant","Tickets","Montant"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.values(byConsultant).sort((a, b) => b.total - a.total).map((d, i) => (
                  <tr key={d.name} className={`border-b ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                             style={{ background: "#01696F" }}>{d.name.slice(0, 1)}</div>
                        <span className="text-xs font-medium">{d.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs">{d.tickets.length}</td>
                    <td className="px-4 py-2.5 text-sm font-bold" style={{ color: "#01696F" }}>{d.total} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Ticket-by-ticket billing */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Détail ticket par ticket</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? <div className="p-4"><Skeleton className="h-40 w-full" /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {["Consultant","Semaine","Client","Thème","Q.","Type","Tarif unitaire","Montant"].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allTickets.map((t: any, idx: number) => {
                    const recap = allRecaps.find((r: any) => r.id === t.recapId);
                    const tarif = t.typeQuestion === "note_interne" ? 10 : 17;
                    return (
                      <tr key={t.id} className={`border-b ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{t.consultantName || "—"}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{recap?.weekLabel || "—"}</td>
                        <td className="px-3 py-2.5 text-xs font-medium">{t.client}</td>
                        <td className="px-3 py-2.5 text-xs max-w-[200px]">
                          <p className="truncate" title={t.theme}>{t.theme}</p>
                        </td>
                        <td className="px-3 py-2.5 text-xs font-semibold">{t.nbQuestions}</td>
                        <td className="px-3 py-2.5"><TypeBadge type={t.typeQuestion} /></td>
                        <td className="px-3 py-2.5 text-xs">{tarif} € × {t.nbQuestions}</td>
                        <td className="px-3 py-2.5 text-sm font-bold" style={{ color: "#01696F" }}>{t.montantFacture} €</td>
                      </tr>
                    );
                  })}
                  {allTickets.length > 0 && (
                    <tr className="border-t-2" style={{ borderColor: "#01696F" }}>
                      <td colSpan={7} className="px-3 py-2.5 text-xs font-bold text-right pr-4" style={{ color: "#01696F" }}>TOTAL</td>
                      <td className="px-3 py-2.5 text-sm font-bold" style={{ color: "#01696F" }}>{grandTotal} €</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
