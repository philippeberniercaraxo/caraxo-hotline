import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ComplexiteBadge, QualiteBadge, AbonneBadge, DelaiLabel, TypeBadge } from "@/components/TicketBadges";

interface ParsedTicket {
  client: string; interlocuteur: string; theme: string; domaine: string; canal: string;
  nbQuestions: number; typeQuestion: string;
  dateReception: string; dateReponse: string; delaiJours: number;
  complexite: number; qualite: number; motsReponse: number; refsJuridiques: number;
  abonne: string; montantFacture: number; commentaire: string; alertes: string[];
}

interface ParsedData {
  weekLabel: string; weekStart: string; weekEnd: string;
  rawQuestionCount: number; fileName: string;
  tickets: ParsedTicket[];
}

export default function NewRecap() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [dragging, setDragging] = useState(false);
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [editedTickets, setEditedTickets] = useState<ParsedTicket[]>([]);
  const [uploading, setUploading] = useState(false);

  // Upload & parse
  async function handleFile(file: File) {
    if (!file.name.endsWith(".docx")) {
      toast({ title: "Format incorrect", description: "Veuillez déposer un fichier .docx", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const token = getToken();
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${typeof __PORT_5000__ !== "undefined" ? __PORT_5000__ : ""}/api/recaps/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data: ParsedData = await res.json();
      setParsed(data);
      setEditedTickets(data.tickets);
      toast({ title: "Document analysé", description: `${data.tickets.length} ticket(s) détecté(s)` });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  // Save recap
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/recaps", {
        weekLabel: parsed!.weekLabel,
        weekStart: parsed!.weekStart,
        weekEnd: parsed!.weekEnd,
        rawQuestionCount: parsed!.rawQuestionCount,
        fileName: parsed!.fileName,
        ticketsData: editedTickets,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recaps"] });
      toast({ title: "Récap enregistré ✓", description: "Vos données sont sauvegardées" });
      navigate("/");
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  function updateTicket(idx: number, field: string, value: any) {
    setEditedTickets(prev => prev.map((t, i) => {
      if (i !== idx) return t;
      const updated = { ...t, [field]: value };
      // Recalculate billing
      if (field === "nbQuestions" || field === "typeQuestion") {
        updated.montantFacture = (field === "nbQuestions" ? value : t.nbQuestions) * (updated.typeQuestion === "note_interne" ? 10 : 17);
      }
      return updated;
    }));
  }

  const totalF = editedTickets.reduce((s, t) => s + t.montantFacture, 0);
  const totalQ = editedTickets.reduce((s, t) => s + t.nbQuestions, 0);
  const alerts = editedTickets.flatMap(t => t.alertes).length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Nouveau récap hebdomadaire</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Déposez votre document Word — l'analyse est automatique</p>
      </div>

      {!parsed ? (
        <Card>
          <CardContent className="py-8">
            <div
              data-testid="drop-zone"
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`border-2 border-dashed rounded-xl p-16 text-center transition-colors cursor-pointer ${dragging ? "border-primary bg-secondary/30" : "border-border hover:border-primary/50"}`}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <input id="file-input" type="file" accept=".docx" className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#E0F2F1" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#01696F" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="12" x2="12" y2="18"/><line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
              </div>
              {uploading ? (
                <p className="font-medium">Analyse en cours…</p>
              ) : (
                <>
                  <p className="font-semibold text-foreground">Glissez votre fichier Word ici</p>
                  <p className="text-sm text-muted-foreground mt-1">ou cliquez pour parcourir · Format .docx uniquement</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* Summary bar */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Semaine", value: parsed.weekLabel },
              { label: "Tickets", value: editedTickets.length },
              { label: "Questions", value: totalQ },
              { label: "Facturation", value: `${totalF} €` },
            ].map(kpi => (
              <Card key={kpi.label}>
                <CardContent className="py-3 px-4">
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-lg font-bold mt-0.5" style={{ color: "#01696F" }}>{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Alerts */}
          {alerts > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-amber-200 bg-amber-50">
              <span className="text-amber-700 text-sm font-medium">⚠ {alerts} alerte(s) détectée(s) — vérifiez les tickets surlignés ci-dessous</span>
            </div>
          )}

          {/* Tickets table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Tickets détectés — vérifiez et corrigez si besoin</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      {["#","Client","Interlocuteur","Thème","Q.","Type","Réception","Réponse","Délai","Complexité","Qualité","Abonné","Montant","Alertes"].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {editedTickets.map((t, idx) => {
                      const hasAlert = t.alertes.length > 0;
                      return (
                        <tr key={idx} className={`border-b ${hasAlert ? "bg-amber-50/40" : idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
                          data-testid={`row-ticket-${idx}`}>
                          <td className="px-3 py-2 text-muted-foreground text-xs">{idx + 1}</td>
                          <td className="px-3 py-2">
                            <Input value={t.client} onChange={e => updateTicket(idx, "client", e.target.value)}
                              className="h-7 text-xs min-w-[100px]" />
                          </td>
                          <td className="px-3 py-2">
                            <Input value={t.interlocuteur} onChange={e => updateTicket(idx, "interlocuteur", e.target.value)}
                              className="h-7 text-xs min-w-[110px]" />
                          </td>
                          <td className="px-3 py-2">
                            <Input value={t.theme} onChange={e => updateTicket(idx, "theme", e.target.value)}
                              className="h-7 text-xs min-w-[160px]" />
                          </td>
                          <td className="px-3 py-2">
                            <Input type="number" min={1} value={t.nbQuestions}
                              onChange={e => updateTicket(idx, "nbQuestions", parseInt(e.target.value) || 1)}
                              className="h-7 text-xs w-12" />
                          </td>
                          <td className="px-3 py-2">
                            <Select value={t.typeQuestion} onValueChange={v => updateTicket(idx, "typeQuestion", v)}>
                              <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="question">Question</SelectItem>
                                <SelectItem value="note_interne">Note interne</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2 text-xs">{t.dateReception.split("-").reverse().join("/")}</td>
                          <td className="px-3 py-2 text-xs">{t.dateReponse.split("-").reverse().join("/")}</td>
                          <td className="px-3 py-2"><DelaiLabel days={t.delaiJours} /></td>
                          <td className="px-3 py-2">
                            <Select value={String(t.complexite)} onValueChange={v => updateTicket(idx, "complexite", parseInt(v))}>
                              <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1 – Faible</SelectItem>
                                <SelectItem value="2">2 – Moyenne</SelectItem>
                                <SelectItem value="3">3 – Élevée</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <Select value={String(t.qualite)} onValueChange={v => updateTicket(idx, "qualite", parseInt(v))}>
                              <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">⭐ Basique</SelectItem>
                                <SelectItem value="2">⭐⭐ Bonne</SelectItem>
                                <SelectItem value="3">⭐⭐⭐ Excellente</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <Select value={t.abonne} onValueChange={v => updateTicket(idx, "abonne", v)}>
                              <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Oui">Oui</SelectItem>
                                <SelectItem value="À vérifier">À vérifier</SelectItem>
                                <SelectItem value="Non">Non</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2 font-semibold text-xs" style={{ color: "#01696F" }}>{t.montantFacture} €</td>
                          <td className="px-3 py-2">
                            {t.alertes.length > 0 && (
                              <span className="text-amber-600 text-xs" title={t.alertes.join("\n")}>⚠ {t.alertes.length}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setParsed(null)}>← Changer de fichier</Button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-bold" style={{ color: "#01696F" }}>Total : {totalF} €</p>
                <p className="text-xs text-muted-foreground">{totalQ} questions · {editedTickets.length} tickets</p>
              </div>
              <Button data-testid="button-save-recap" className="text-white px-6"
                style={{ background: "#01696F" }}
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Enregistrement…" : "Valider et enregistrer"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

declare const __PORT_5000__: string;
