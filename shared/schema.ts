import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("consultant"), // "consultant" | "admin"
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─── Weekly Recaps ────────────────────────────────────────────────────────────
export const recaps = sqliteTable("recaps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  consultantId: integer("consultant_id").notNull(),
  weekLabel: text("week_label").notNull(), // e.g. "13-17 avril 2026"
  weekStart: text("week_start").notNull(), // ISO date "2026-04-13"
  weekEnd: text("week_end").notNull(),     // ISO date "2026-04-17"
  fileName: text("file_name"),
  rawQuestionCount: integer("raw_question_count").default(0), // announced in header
  status: text("status").notNull().default("draft"), // "draft" | "validated"
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertRecapSchema = createInsertSchema(recaps).omit({ id: true, createdAt: true });
export type InsertRecap = z.infer<typeof insertRecapSchema>;
export type Recap = typeof recaps.$inferSelect;

// ─── Tickets ──────────────────────────────────────────────────────────────────
export const tickets = sqliteTable("tickets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recapId: integer("recap_id").notNull(),
  consultantId: integer("consultant_id").notNull(),

  // Identification
  client: text("client").notNull(),
  interlocuteur: text("interlocuteur").notNull().default(""),
  theme: text("theme").notNull().default(""),
  domaine: text("domaine").notNull().default(""),
  canal: text("canal").notNull().default("Teamleader Focus"),

  // Volume
  nbQuestions: integer("nb_questions").notNull().default(1),
  typeQuestion: text("type_question").notNull().default("question"), // "question" | "note_interne"

  // Dates
  dateReception: text("date_reception").notNull(),
  dateReponse: text("date_reponse").notNull(),
  delaiJours: integer("delai_jours").notNull().default(0),

  // Analysis
  complexite: integer("complexite").notNull().default(1), // 1|2|3
  qualite: integer("qualite").notNull().default(2),       // 1|2|3
  motsReponse: integer("mots_reponse").notNull().default(0),
  refsJuridiques: integer("refs_juridiques").notNull().default(0),

  // Subscription check
  abonne: text("abonne").notNull().default("Oui"), // "Oui" | "À vérifier" | "Non"

  // Billing
  montantFacture: real("montant_facture").notNull().default(17),

  // Comments & alerts
  commentaire: text("commentaire").default(""),
  alertes: text("alertes").default(""), // JSON string: string[]
});

export const insertTicketSchema = createInsertSchema(tickets).omit({ id: true });
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;
