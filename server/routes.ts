import type { Express } from "express";
import type { Server } from "http";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import { storage } from "./storage";
import { parseDocx } from "./docxParser";

const JWT_SECRET = process.env.JWT_SECRET || (() => { throw new Error("JWT_SECRET env var is required"); })();
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const docxFileFilter = (_req: any, file: any, cb: any) => {
  if (file.mimetype === DOCX_MIME || file.originalname.endsWith(".docx")) cb(null, true);
  else cb(new Error("Seuls les fichiers .docx sont acceptés"));
};
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 }, fileFilter: docxFileFilter });

// ─── Seed admin account if none exists ───────────────────────────────────────
async function seedAdmin() {
  const existing = storage.getUserByEmail("admin@caraxo.fr");
  if (!existing) {
    const hash = await bcrypt.hash("caraxo2026!", 10);
    storage.createUser({ email: "admin@caraxo.fr", passwordHash: hash, name: "Philippe (Admin)", role: "admin" });
    if (process.env.NODE_ENV !== "production") console.log("Admin account created: admin@caraxo.fr / [protected]");
  }
  // Also seed Margaux
  const margaux = storage.getUserByEmail("margaux@caraxo.fr");
  if (!margaux) {
    const hash = await bcrypt.hash("margaux2026", 10);
    storage.createUser({ email: "margaux@caraxo.fr", passwordHash: hash, name: "Margaux", role: "consultant" });
    if (process.env.NODE_ENV !== "production") console.log("Consultant account created: margaux@caraxo.fr / [protected]");
  }
}
seedAdmin();

// ─── Auth middleware ──────────────────────────────────────────────────────────
function requireAuth(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Non autorisé" });
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as any;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token invalide" });
  }
}

function requireAdmin(req: any, res: any, next: any) {
  requireAuth(req, res, () => {
    if (req.user?.role !== "admin") return res.status(403).json({ error: "Accès admin requis" });
    next();
  });
}

export function registerRoutes(httpServer: Server, app: Express) {

  // ─── AUTH ──────────────────────────────────────────────────────────────────

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = storage.getUserByEmail(email);
    if (!user) return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  });

  app.get("/api/auth/me", requireAuth, (req: any, res) => {
    const user = storage.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  });

  // ─── USERS (admin only) ────────────────────────────────────────────────────

  app.get("/api/users", requireAdmin, (_req, res) => {
    const allUsers = storage.getAllUsers().map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role, createdAt: u.createdAt }));
    res.json(allUsers);
  });

  app.post("/api/users", requireAdmin, async (req, res) => {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: "Champs manquants" });
    const exists = storage.getUserByEmail(email);
    if (exists) return res.status(409).json({ error: "Email déjà utilisé" });
    const hash = await bcrypt.hash(password, 10);
    const user = storage.createUser({ email, passwordHash: hash, name, role: role || "consultant" });
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  });

  // ─── UPLOAD DOCX + PARSE ──────────────────────────────────────────────────

  app.post("/api/recaps/upload", requireAuth, upload.single("file"), async (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: "Aucun fichier fourni" });
    try {
      const parsed = await parseDocx(req.file.buffer);

      // Determine week start/end from tickets dates
      const dates = parsed.tickets.flatMap(t => [t.dateReception, t.dateReponse]).sort();
      const weekStart = dates[0] || new Date().toISOString().slice(0, 10);
      const weekEnd = dates[dates.length - 1] || weekStart;

      // Build preview without saving
      res.json({
        weekLabel: parsed.weekLabel,
        weekStart,
        weekEnd,
        rawQuestionCount: parsed.rawQuestionCount,
        fileName: req.file.originalname,
        tickets: parsed.tickets,
      });
    } catch (e: any) {
      res.status(500).json({ error: "Erreur de lecture du fichier: " + e.message });
    }
  });

  // ─── RECAPS ────────────────────────────────────────────────────────────────

  app.post("/api/recaps", requireAuth, async (req: any, res) => {
    const { weekLabel, weekStart, weekEnd, rawQuestionCount, fileName, ticketsData } = req.body;
    if (!weekLabel || !ticketsData) return res.status(400).json({ error: "Données manquantes" });

    const recap = storage.createRecap({
      consultantId: req.user.id,
      weekLabel,
      weekStart,
      weekEnd,
      fileName,
      rawQuestionCount,
      status: "validated",
    });

    const savedTickets = [];
    for (const t of ticketsData) {
      const ticket = storage.createTicket({
        recapId: recap.id,
        consultantId: req.user.id,
        client: t.client,
        interlocuteur: t.interlocuteur || "",
        theme: t.theme || "",
        domaine: t.domaine || "",
        canal: t.canal || "Teamleader Focus",
        nbQuestions: t.nbQuestions || 1,
        typeQuestion: t.typeQuestion || "question",
        dateReception: t.dateReception,
        dateReponse: t.dateReponse,
        delaiJours: t.delaiJours || 0,
        complexite: t.complexite || 1,
        qualite: t.qualite || 2,
        motsReponse: t.motsReponse || 0,
        refsJuridiques: t.refsJuridiques || 0,
        abonne: t.abonne || "Oui",
        montantFacture: t.montantFacture || t.nbQuestions * 17,
        commentaire: t.commentaire || "",
        alertes: JSON.stringify(t.alertes || []),
      });
      savedTickets.push(ticket);
    }

    res.json({ recap, tickets: savedTickets });
  });

  app.get("/api/recaps", requireAuth, (req: any, res) => {
    if (req.user.role === "admin") {
      const allRecaps = storage.getAllRecaps();
      const users = storage.getAllUsers();
      const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));
      res.json(allRecaps.map(r => ({ ...r, consultantName: userMap[r.consultantId] || "Inconnu" })));
    } else {
      const myRecaps = storage.getRecapsByConsultant(req.user.id);
      res.json(myRecaps);
    }
  });

  app.delete("/api/recaps/:id", requireAuth, (req: any, res) => {
    const id = parseInt(req.params.id);
    const recap = storage.getRecapById(id);
    if (!recap) return res.status(404).json({ error: "Récap introuvable" });
    if (req.user.role !== "admin" && recap.consultantId !== req.user.id) {
      return res.status(403).json({ error: "Accès interdit" });
    }
    storage.deleteTicketsByRecap(id);
    storage.deleteRecap(id);
    res.json({ ok: true });
  });

  // ─── TICKETS ───────────────────────────────────────────────────────────────

  app.get("/api/tickets", requireAuth, (req: any, res) => {
    if (req.user.role === "admin") {
      const allTickets = storage.getAllTickets();
      const users = storage.getAllUsers();
      const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));
      res.json(allTickets.map(t => ({ ...t, consultantName: userMap[t.consultantId] || "Inconnu" })));
    } else {
      res.json(storage.getTicketsByConsultant(req.user.id));
    }
  });

  app.get("/api/tickets/recap/:recapId", requireAuth, (req: any, res) => {
    const recapId = parseInt(req.params.recapId);
    const recap = storage.getRecapById(recapId);
    if (!recap) return res.status(404).json({ error: "Récap introuvable" });
    if (req.user.role !== "admin" && recap.consultantId !== req.user.id) {
      return res.status(403).json({ error: "Accès interdit" });
    }
    res.json(storage.getTicketsByRecap(recapId));
  });

  app.patch("/api/tickets/:id", requireAuth, (req: any, res) => {
    const id = parseInt(req.params.id);
    const ticket = storage.getTicketById(id);
    if (!ticket) return res.status(404).json({ error: "Ticket introuvable" });
    if (req.user.role !== "admin" && ticket.consultantId !== req.user.id) {
      return res.status(403).json({ error: "Accès interdit" });
    }
    const updated = storage.updateTicket(id, req.body);
    res.json(updated);
  });

  // ─── STATS (admin) ─────────────────────────────────────────────────────────

  app.get("/api/stats/global", requireAdmin, (_req, res) => {
    const allTickets = storage.getAllTickets();
    const allRecaps = storage.getAllRecaps();
    const allUsers = storage.getAllUsers().filter(u => u.role === "consultant");

    const totalTickets = allTickets.length;
    const totalQuestions = allTickets.reduce((s, t) => s + t.nbQuestions, 0);
    const totalFacturation = allTickets.reduce((s, t) => s + t.montantFacture, 0);
    const avgDelai = totalTickets > 0 ? allTickets.reduce((s, t) => s + t.delaiJours, 0) / totalTickets : 0;

    // By client
    const byClient: Record<string, { tickets: number; questions: number; facturation: number }> = {};
    for (const t of allTickets) {
      if (!byClient[t.client]) byClient[t.client] = { tickets: 0, questions: 0, facturation: 0 };
      byClient[t.client].tickets++;
      byClient[t.client].questions += t.nbQuestions;
      byClient[t.client].facturation += t.montantFacture;
    }

    // By consultant
    const byConsultant: Record<number, { name: string; tickets: number; questions: number; facturation: number; avgQualite: number }> = {};
    const userMap = Object.fromEntries(allUsers.map(u => [u.id, u.name]));
    for (const t of allTickets) {
      if (!byConsultant[t.consultantId]) {
        byConsultant[t.consultantId] = { name: userMap[t.consultantId] || "Inconnu", tickets: 0, questions: 0, facturation: 0, avgQualite: 0 };
      }
      byConsultant[t.consultantId].tickets++;
      byConsultant[t.consultantId].questions += t.nbQuestions;
      byConsultant[t.consultantId].facturation += t.montantFacture;
      byConsultant[t.consultantId].avgQualite += t.qualite;
    }
    for (const cid of Object.keys(byConsultant)) {
      const c = byConsultant[Number(cid)];
      if (c.tickets > 0) c.avgQualite = c.avgQualite / c.tickets;
    }

    // Alerts
    const alerts = allTickets.filter(t => {
      const a = JSON.parse(t.alertes || "[]");
      return a.length > 0;
    }).map(t => ({ id: t.id, client: t.client, theme: t.theme, alertes: JSON.parse(t.alertes || "[]") }));

    res.json({
      totalTickets,
      totalQuestions,
      totalFacturation,
      avgDelai: Math.round(avgDelai * 10) / 10,
      totalRecaps: allRecaps.length,
      totalConsultants: allUsers.length,
      byClient,
      byConsultant,
      alerts,
    });
  });
}
