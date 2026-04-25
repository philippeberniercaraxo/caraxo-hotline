import mammoth from "mammoth";

interface ParsedTicket {
  client: string;
  nbQuestions: number;
  theme: string;
  interlocuteur: string;
  canal: string;
  dateReception: string;
  dateReponse: string;
  delaiJours: number;
  typeQuestion: "question" | "note_interne";
  motsReponse: number;
  refsJuridiques: number;
  complexite: 1 | 2 | 3;
  qualite: 1 | 2 | 3;
  abonne: "Oui" | "À vérifier";
  montantFacture: number;
  commentaire: string;
  alertes: string[];
  domaine: string;
}

interface ParseResult {
  weekLabel: string;
  rawQuestionCount: number;
  tickets: ParsedTicket[];
}

function parseFrenchDate(str: string): string {
  // "17/04/2026" → "2026-04-17"
  const m = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return str;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function daysBetween(d1: string, d2: string): number {
  const a = new Date(d1).getTime();
  const b = new Date(d2).getTime();
  return Math.round((b - a) / 86400000);
}

function guessComplexite(mots: number, refs: number, nbQ: number): 1 | 2 | 3 {
  let score = 0;
  if (mots > 1200) score += 3;
  else if (mots > 600) score += 2;
  else score += 1;
  if (refs > 15) score += 2;
  else if (refs >= 3) score += 1;
  if (nbQ >= 3) score += 2;
  else if (nbQ === 2) score += 1;
  if (score >= 5) return 3;
  if (score >= 3) return 2;
  return 1;
}

function guessQualite(mots: number, refs: number, nbQ: number): 1 | 2 | 3 {
  let score = 0;
  if (mots > 600) score += 2;
  else if (mots > 300) score += 1;
  if (refs > 10) score += 2;
  else if (refs >= 3) score += 1;
  if (nbQ > 1 && mots / nbQ > 400) score += 1;
  if (score >= 4) return 3;
  if (score >= 2) return 2;
  return 1;
}

function guessDomaine(theme: string): string {
  const t = theme.toLowerCase();
  if (t.includes("séjour") || t.includes("étranger") || t.includes("titre")) return "Droit des étrangers";
  if (t.includes("cpf")) return "CPF / Financement formation";
  if (t.includes("apprenti") || t.includes("apprentissage") || t.includes("congé")) return "Contrat d'apprentissage";
  if (t.includes("qualiopi") || t.includes("certification") || t.includes("évaluation") || t.includes("positionnement")) return "QUALIOPI / Certification";
  if (t.includes("sous-traitance")) return "Sous-traitance / Formation";
  if (t.includes("ia act") || t.includes("ia")) return "Réglementation IA";
  if (t.includes("prévention") || t.includes("sécurité") || t.includes("passeport")) return "Prévention / Sécurité";
  if (t.includes("e-learning") || t.includes("digital") || t.includes("durée")) return "Formation digitale";
  if (t.includes("rncp") || t.includes("gratification") || t.includes("alternance")) return "Alternance / RNCP";
  if (t.includes("multisite") || t.includes("salle")) return "QUALIOPI / Multisite";
  return "Droit de la formation";
}

// Known subscribers from typical CARAXO contracts
const KNOWN_SUBSCRIBERS = [
  "AREAS", "CA ASSURANCES SOLUTIONS", "FREE", "ERILIA", "RELYENS", "C&A"
];

export async function parseDocx(buffer: Buffer): Promise<ParseResult> {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  // Extract header info
  let weekLabel = "";
  let rawQuestionCount = 0;

  for (const line of lines.slice(0, 5)) {
    const wm = line.match(/[Ss]emaine\s+du\s+([\d\s\w]+(?:au\s+[\d\s\w]+\d{4}))/i);
    if (wm) weekLabel = wm[0].replace(/^[Ss]emaine\s+du\s+/, "").trim();
    const qm = line.match(/(\d+)\s+questions?\s+r[ée]pondue/i);
    if (qm) rawQuestionCount = parseInt(qm[1]);
  }

  if (!weekLabel) {
    // Try first line
    const fl = lines[0] || "";
    const m = fl.match(/(\d+\s+\w+\s+\d{4})/);
    weekLabel = m ? m[1] : "Semaine inconnue";
  }

  // Find ticket blocks
  const ticketStarts: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\d+\s+ticket[s]?\s+\(\d+\s+question[s]?\)/i.test(lines[i])) {
      ticketStarts.push(i);
    }
  }
  ticketStarts.push(lines.length);

  const parsedTickets: ParsedTicket[] = [];

  for (let t = 0; t < ticketStarts.length - 1; t++) {
    const start = ticketStarts[t];
    const end = ticketStarts[t + 1];
    const segment = lines.slice(start, end);

    const headerLine = segment[0];
    const hm = headerLine.match(/^(\d+)\s+ticket[s]?\s+\((\d+)\s+question[s]?\)\s+([\w\s&'\/\-À-ÿ]+?)\s*:\s*(.+)$/i);
    if (!hm) continue;

    const nbQuestions = parseInt(hm[2]);
    const client = hm[3].trim();
    const canal = hm[4].trim();

    let theme = "";
    let interlocuteur = "";
    let dateReception = "";
    let dateReponse = "";
    let isNoteInterne = false;

    for (const line of segment) {
      if (/^Thème\s*:/i.test(line)) theme = line.split(":").slice(1).join(":").trim();
      if (/^Par\s*:/i.test(line)) interlocuteur = line.split(":").slice(1).join(":").trim();
      if (/^Date de réception/i.test(line)) {
        const dm = line.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
        if (dm) dateReception = parseFrenchDate(dm[1]);
      }
      if (/^Date de réponse/i.test(line)) {
        const dm = line.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
        if (dm) dateReponse = parseFrenchDate(dm[1]);
      }
      if (/note\s+interne/i.test(line)) isNoteInterne = true;
    }

    // Count words in response section
    let motsReponse = 0;
    let refsJuridiques = 0;
    let inResponse = false;
    const responseLines: string[] = [];

    for (const line of segment) {
      if (/^Réponse\s*:/i.test(line)) { inResponse = true; continue; }
      if (inResponse) {
        responseLines.push(line);
        refsJuridiques += (line.match(/article|jurisprudence|cass\.|CE\.|circulaire|décret|ordonnance/gi) || []).length;
      }
    }
    motsReponse = responseLines.join(" ").split(/\s+/).filter(Boolean).length;

    const complexite = guessComplexite(motsReponse, refsJuridiques, nbQuestions);
    const qualite = guessQualite(motsReponse, refsJuridiques, nbQuestions);
    const delaiJours = dateReception && dateReponse ? daysBetween(dateReception, dateReponse) : 0;
    const typeQuestion = isNoteInterne ? "note_interne" : "question";
    const montantFacture = nbQuestions * (isNoteInterne ? 10 : 17);

    // Abonné check
    const clientUpper = client.toUpperCase().trim();
    const isKnownSubscriber = KNOWN_SUBSCRIBERS.some(s => clientUpper.includes(s));
    const abonne: "Oui" | "À vérifier" = isKnownSubscriber ? "Oui" : "À vérifier";

    // Alertes
    const alertes: string[] = [];
    if (abonne === "À vérifier") alertes.push(`${client} : abonnement à vérifier`);
    if (canal.toLowerCase().includes("mail") && !canal.toLowerCase().includes("teamleader")) {
      alertes.push("Canal hors Teamleader Focus – recanaliser");
    }
    if (qualite === 1) alertes.push("Qualité basique – vérifier complétude de la réponse");

    parsedTickets.push({
      client,
      nbQuestions,
      theme,
      interlocuteur,
      canal,
      dateReception: dateReception || new Date().toISOString().slice(0, 10),
      dateReponse: dateReponse || new Date().toISOString().slice(0, 10),
      delaiJours,
      typeQuestion,
      motsReponse,
      refsJuridiques,
      complexite,
      qualite,
      abonne,
      montantFacture,
      commentaire: "",
      alertes,
      domaine: guessDomaine(theme),
    });
  }

  return { weekLabel, rawQuestionCount, tickets: parsedTickets };
}
