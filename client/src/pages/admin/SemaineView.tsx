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
  return `Sem. ${sw} — ${year}`;
}

function extractKeywords(theme: string): string[] {
  const stopwords = new Set([
    "de","du","des","le","la","les","un","une","en","et","ou","à","au","aux",
    "sur","pour","dans","par","avec","sans","lors","l","d","qu","que","qui",
    "se","sa","son","ses","ce","cet","cette","ces","est","sont","a","ont",
    "il","elle","ils","elles","nous","vous","leur","leurs","y","ne","pas","plus",
    "si","je","tu","me","te","lui","eux","tout","tous","toute","toutes",
  ]);
  return theme
    .toLowerCase()
    .replace(/[^a-zàâäéèêëîïôùûüçœ\s]/gi, " ")
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopwords.has(w));
}

// Delta badge : +N (vert) ou -N (rouge) ou = (gris)
function Delta({ a, b, suffix = "" }: { a: number; b: number; suffix?: string }) {
  const diff = a - b;
  const pct = b > 0 ? Math.round((diff / b) * 100) : null;
  if (diff === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const color = diff > 0 ? "#166534" : "#991b1b";
  const bg = diff > 0 ? "#dcfce7" : "#fee2e2";
  const arrow = diff > 0 ? "↑" : "↓";
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold" style={{ color, background: bg }}>
      {arrow} {Math.abs(diff)}{suffix}{pct !== null ? ` (${Math.abs(pct)}%)` : ""}
    </span>
  );
}

// Agrège tickets par semaine → map semaine → {clients, thèmes, typologies, consultants}
function aggregateByWeek(tickets: Ticket[], week: string) {
  const filtered = tickets.filter(t => t.dateReception && getISOWeek(t.dateReception) === week);

  // Par client
  const clients: Record<string, number> = {};
  filtered.forEach(t => { clients[t.client] = (clients[t.client] || 0) + t.nbQuestions; });

  // Thèmes (mots-clés)
  const themes: Record<string, number> = {};
  filtered.forEach(t => {
    extractKeywords(t.theme).forEach(kw => {
      themes[kw] = (themes[kw] || 0) + t.nbQuestions;
    });
  });

  // Typologies
  const typologies: Record<string, { count: number; questions: number }> = {};
  filtered.forEach(t => {
    const type = t.typeQuestion === "note_interne" ? "Note interne" : "Question client";
    const complexLabel = t.complexite === 1 ? "Simple" : t.complexite === 2 ? "Standard" : "Complexe";
    const key = `${type} — ${complexLabel}`;
    if (!typologies[key]) typologies[key] = { count: 0, questions: 0 };
    typologies[key].count++;
    typologies[key].questions += t.nbQuestions;
  });

  // Consultants
  const consultants: Record<string, { name: string; tickets: number; questions: number; facturation: number }> = {};
  filtered.forEach(t => {
    const key = String(t.consultantId);
    if (!consultants[key]) consultants[key] = { name: t.consultantName || "Inconnu", tickets: 0, questions: 0, facturation: 0 };
    consultants[key].tickets++;
    consultants[key].questions += t.nbQuestions;
    consultants[key].facturation += t.montantFacture;
  });

  return {
    tickets: filtered.length,
    questions: filtered.reduce((s, t) => s + t.nbQuestions, 0),
    facturation: filtered.reduce((s, t) => s + t.montantFacture, 0),
    clients,
    themes,
    typologies,
    consultants,
  };
}

// ── Composant Comparatif ──
function ComparatifSection({ tickets, weekOptions }: { tickets: Ticket[]; weekOptions: string[] }) {
  const [semA, setSemA] = useState<string>(weekOptions[0] || "");
  const [semB, setSemB] = useState<string>(weekOptions[1] || "");
  const [activeTab, setActiveTab] = useState<"clients" | "all">("clients");

  const dataA = useMemo(() => semA ? aggregateByWeek(tickets, semA) : null, [tickets, semA]);
  const dataB = useMemo(() => semB ? aggregateByWeek(tickets, semB) : null, [tickets, semB]);

  if (weekOptions.length < 2) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground text-center">
          Il faut au moins 2 semaines de données pour afficher le comparatif.
        </CardContent>
      </Card>
    );
  }

  // Union de toutes les clés clients
  const allClients = Array.from(new Set([
    ...Object.keys(dataA?.clients || {}),
    ...Object.keys(dataB?.clients || {}),
  ])).sort((a, b) => {
    const qa = dataA?.clients[a] || 0;
    const qb = dataB?.clients[b] || 0;
    return (qb - qa);
  });

  // Union thèmes top 15 combinés
  const allThemes = (() => {
    const merged: Record<string, number> = {};
    Object.entries(dataA?.themes || {}).forEach(([k, v]) => { merged[k] = (merged[k] || 0) + v; });
    Object.entries(dataB?.themes || {}).forEach(([k, v]) => { merged[k] = (merged[k] || 0) + v; });
    return Object.entries(merged).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k]) => k);
  })();

  // Union typologies
  const allTypologies = Array.from(new Set([
    ...Object.keys(dataA?.typologies || {}),
    ...Object.keys(dataB?.typologies || {}),
  ]));

  // Union consultants
  const allConsultants = Array.from(new Set([
    ...Object.keys(dataA?.consultants || {}),
    ...Object.keys(dataB?.consultants || {}),
  ]));

  const headerA = semA ? weekLabel(semA) : "—";
  const headerB = semB ? weekLabel(semB) : "—";

  return (
    <div className="space-y-4">
      {/* Sélecteurs */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground w-16">Semaine A</span>
          <Select value={semA} onValueChange={setSemA}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Choisir" />
            </SelectTrigger>
            <SelectContent>
              {weekOptions.map(w => <SelectItem key={w} value={w}>{weekLabel(w)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <span className="text-muted-foreground text-xs">vs</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground w-16">Semaine B</span>
          <Select value={semB} onValueChange={setSemB}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Choisir" />
            </SelectTrigger>
            <SelectContent>
              {weekOptions.map(w => <SelectItem key={w} value={w}>{weekLabel(w)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs globaux de comparaison */}
      {dataA && dataB && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Tickets", a: dataA.tickets, b: dataB.tickets },
            { label: "Questions", a: dataA.questions, b: dataB.questions },
            { label: "Facturation", a: dataA.facturation, b: dataB.facturation, suffix: " €" },
          ].map(kpi => (
            <Card key={kpi.label}>
              <CardContent className="py-3 px-4">
                <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
                <div className="flex items-end gap-2">
                  <span className="text-lg font-bold" style={{ color: "#01696F" }}>{kpi.a}{kpi.suffix || ""}</span>
                  <span className="text-xs text-muted-foreground mb-0.5">vs {kpi.b}{kpi.suffix || ""}</span>
                </div>
                <div className="mt-1">
                  <Delta a={kpi.a} b={kpi.b} suffix={kpi.suffix || ""} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Onglets */}
      <div className="flex border-b">
        {([["clients", "Par client"], ["all", "Tout (typologies + consultants)"]] as const).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-[#01696F] text-[#01696F]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Onglet Clients */}
      {activeTab === "clients" && dataA && dataB && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Client</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{headerA}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{headerB}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Évolution</th>
                </tr>
              </thead>
              <tbody>
                {allClients.map((client, i) => {
                  const qa = dataA.clients[client] || 0;
                  const qb = dataB.clients[client] || 0;
                  return (
                    <tr key={client} className={`border-b ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                      <td className="px-4 py-2.5 font-medium text-xs">{client}</td>
                      <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: "#01696F" }}>{qa} q.</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{qb} q.</td>
                      <td className="px-4 py-2.5"><Delta a={qa} b={qb} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Onglet Tout */}
      {activeTab === "all" && dataA && dataB && (
        <div className="space-y-4">
          {/* Thèmes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Thèmes récurrents</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Mot-clé</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{headerA}</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{headerB}</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Évolution</th>
                  </tr>
                </thead>
                <tbody>
                  {allThemes.map((kw, i) => {
                    const va = dataA.themes[kw] || 0;
                    const vb = dataB.themes[kw] || 0;
                    return (
                      <tr key={kw} className={`border-b ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                        <td className="px-4 py-2.5 text-xs font-medium capitalize">{kw}</td>
                        <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: "#01696F" }}>{va}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{vb}</td>
                        <td className="px-4 py-2.5"><Delta a={va} b={vb} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Typologies */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Typologies</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Typologie</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{headerA} — Q.</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{headerB} — Q.</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Évolution</th>
                  </tr>
                </thead>
                <tbody>
                  {allTypologies.map((type, i) => {
                    const va = dataA.typologies[type]?.questions || 0;
                    const vb = dataB.typologies[type]?.questions || 0;
                    const isNote = type.startsWith("Note");
                    const isComplex = type.endsWith("Complexe");
                    return (
                      <tr key={type} className={`border-b ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                        <td className="px-4 py-2.5 text-xs">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            isNote ? "bg-purple-50 text-purple-700" : isComplex ? "bg-red-50 text-red-700" : "bg-teal-50 text-teal-700"
                          }`}>{type}</span>
                        </td>
                        <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: "#01696F" }}>{va}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{vb}</td>
                        <td className="px-4 py-2.5"><Delta a={va} b={vb} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Consultants */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Consultants</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Consultant</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{headerA} — Q.</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{headerB} — Q.</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Évolution Q.</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{headerA} — €</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{headerB} — €</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Évolution €</th>
                  </tr>
                </thead>
                <tbody>
                  {allConsultants.map((cid, i) => {
                    const ca = dataA.consultants[cid];
                    const cb = dataB.consultants[cid];
                    const name = ca?.name || cb?.name || "Inconnu";
                    const qa = ca?.questions || 0;
                    const qb = cb?.questions || 0;
                    const fa = ca?.facturation || 0;
                    const fb = cb?.facturation || 0;
                    return (
                      <tr key={cid} className={`border-b ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                        <td className="px-4 py-2.5 font-medium text-xs">{name}</td>
                        <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: "#01696F" }}>{qa}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{qb}</td>
                        <td className="px-4 py-2.5"><Delta a={qa} b={qb} /></td>
                        <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: "#01696F" }}>{fa} €</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{fb} €</td>
                        <td className="px-4 py-2.5"><Delta a={fa} b={fb} suffix=" €" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Page principale ──
export default function SemaineView() {
  const { data: tickets = [], isLoading } = useQuery<Ticket[]>({ queryKey: ["/api/tickets"] });
  const { data: recaps = [] } = useQuery<Recap[]>({ queryKey: ["/api/recaps"] });

  const weekOptions = useMemo(() => {
    const weeks = new Set<string>();
    recaps.forEach(r => { if (r.weekStart) weeks.add(getISOWeek(r.weekStart)); });
    tickets.forEach(t => { if (t.dateReception) weeks.add(getISOWeek(t.dateReception)); });
    return Array.from(weeks).sort().reverse();
  }, [recaps, tickets]);

  const [selectedWeek, setSelectedWeek] = useState<string>("all");

  const filteredTickets = useMemo(() => {
    if (selectedWeek === "all") return tickets;
    return tickets.filter(t => t.dateReception && getISOWeek(t.dateReception) === selectedWeek);
  }, [tickets, selectedWeek]);

  const totalQ = filteredTickets.reduce((s, t) => s + t.nbQuestions, 0);
  const totalF = filteredTickets.reduce((s, t) => s + t.montantFacture, 0);
  const totalAlerts = filteredTickets.filter(t => {
    try { return JSON.parse(t.alertes || "[]").length > 0; } catch { return false; }
  }).length;

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

  const byClient = useMemo(() => {
    const map: Record<string, { tickets: number; questions: number; facturation: number }> = {};
    filteredTickets.forEach(t => {
      if (!map[t.client]) map[t.client] = { tickets: 0, questions: 0, facturation: 0 };
      map[t.client].tickets++;
      map[t.client].questions += t.nbQuestions;
      map[t.client].facturation += t.montantFacture;
    });
    return Object.entries(map).sort((a, b) => b[1].questions - a[1].questions);
  }, [filteredTickets]);

  const questionsByEntreprise = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTickets.forEach(t => { map[t.client] = (map[t.client] || 0) + t.nbQuestions; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredTickets]);

  const byTypologie = useMemo(() => {
    const map: Record<string, { count: number; questions: number }> = {};
    filteredTickets.forEach(t => {
      const type = t.typeQuestion === "note_interne" ? "Note interne" : "Question client";
      const complexLabel = t.complexite === 1 ? "Simple" : t.complexite === 2 ? "Standard" : "Complexe";
      const key = `${type} — ${complexLabel}`;
      if (!map[key]) map[key] = { count: 0, questions: 0 };
      map[key].count++;
      map[key].questions += t.nbQuestions;
    });
    return Object.entries(map).sort((a, b) => b[1].questions - a[1].questions);
  }, [filteredTickets]);

  const themesRecurrents = useMemo(() => {
    const freq: Record<string, number> = {};
    filteredTickets.forEach(t => {
      extractKeywords(t.theme).forEach(kw => { freq[kw] = (freq[kw] || 0) + t.nbQuestions; });
    });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 15);
  }, [filteredTickets]);

  const maxThemeCount = themesRecurrents[0]?.[1] || 1;

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
                          <div className="h-1.5 rounded-full" style={{ background: "#01696F", width: `${totalQ > 0 ? Math.round(data.questions / totalQ * 100) : 0}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{totalQ > 0 ? Math.round(data.questions / totalQ * 100) : 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* ── ANALYSE DES QUESTIONS ── */}
      <div className="flex items-center gap-3 pt-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2">Analyse des questions</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Questions par entreprise */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Questions par entreprise</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {questionsByEntreprise.length === 0 ? (
              <p className="text-sm text-muted-foreground px-5 py-4">Aucune donnée.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Entreprise</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Questions</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {questionsByEntreprise.map(([client, q], i) => {
                    const maxQ = questionsByEntreprise[0][1];
                    return (
                      <tr key={i} className={`border-b ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                        <td className="px-4 py-2.5 font-medium text-xs">{client}</td>
                        <td className="px-4 py-2.5 font-semibold text-xs" style={{ color: "#01696F" }}>{q}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-1.5 max-w-[100px]">
                              <div className="h-1.5 rounded-full" style={{ background: "#01696F", width: `${Math.round(q / maxQ * 100)}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{totalQ > 0 ? Math.round(q / totalQ * 100) : 0}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Classement par typologie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Classement par typologie</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {byTypologie.length === 0 ? (
              <p className="text-sm text-muted-foreground px-5 py-4">Aucune donnée.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Typologie</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Tickets</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Questions</th>
                  </tr>
                </thead>
                <tbody>
                  {byTypologie.map(([type, data], i) => {
                    const isNote = type.startsWith("Note");
                    const isComplex = type.endsWith("Complexe");
                    return (
                      <tr key={i} className={`border-b ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                        <td className="px-4 py-2.5 text-xs">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                            isNote ? "bg-purple-50 text-purple-700" : isComplex ? "bg-red-50 text-red-700" : "bg-teal-50 text-teal-700"
                          }`}>{type}</span>
                        </td>
                        <td className="px-4 py-2.5 text-xs">{data.count}</td>
                        <td className="px-4 py-2.5 font-semibold text-xs" style={{ color: "#01696F" }}>{data.questions}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Thèmes récurrents */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Thèmes récurrents</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Mots-clés les plus fréquents pondérés par nombre de questions</p>
        </CardHeader>
        <CardContent>
          {themesRecurrents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune donnée.</p>
          ) : (
            <div className="space-y-2">
              {themesRecurrents.map(([kw, count], i) => (
                <div key={kw} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                  <span className="text-xs font-medium w-36 truncate capitalize">{kw}</span>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div className="h-2 rounded-full transition-all" style={{
                      background: i < 3 ? "#01696F" : i < 7 ? "#20808D" : "#BCE2E7",
                      width: `${Math.round(count / maxThemeCount * 100)}%`
                    }} />
                  </div>
                  <span className="text-xs font-semibold w-8 text-right" style={{ color: "#01696F" }}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── COMPARATIF SEMAINE SUR SEMAINE ── */}
      <div className="flex items-center gap-3 pt-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2">Comparatif semaine sur semaine</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <ComparatifSection tickets={tickets} weekOptions={weekOptions} />

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
