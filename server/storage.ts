import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and, desc } from "drizzle-orm";
import { users, recaps, tickets, type User, type InsertUser, type Recap, type InsertRecap, type Ticket, type InsertTicket } from "@shared/schema";

const DB_PATH = process.env.DB_PATH || "data.db";
const sqlite = new Database(DB_PATH);
const db = drizzle(sqlite);

// ─── Init schema ────────────────────────────────────────────────────────────
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'consultant',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS recaps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    consultant_id INTEGER NOT NULL,
    week_label TEXT NOT NULL,
    week_start TEXT NOT NULL,
    week_end TEXT NOT NULL,
    file_name TEXT,
    raw_question_count INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recap_id INTEGER NOT NULL,
    consultant_id INTEGER NOT NULL,
    client TEXT NOT NULL,
    interlocuteur TEXT NOT NULL DEFAULT '',
    theme TEXT NOT NULL DEFAULT '',
    domaine TEXT NOT NULL DEFAULT '',
    canal TEXT NOT NULL DEFAULT 'Teamleader Focus',
    nb_questions INTEGER NOT NULL DEFAULT 1,
    type_question TEXT NOT NULL DEFAULT 'question',
    date_reception TEXT NOT NULL,
    date_reponse TEXT NOT NULL,
    delai_jours INTEGER NOT NULL DEFAULT 0,
    complexite INTEGER NOT NULL DEFAULT 1,
    qualite INTEGER NOT NULL DEFAULT 2,
    mots_reponse INTEGER NOT NULL DEFAULT 0,
    refs_juridiques INTEGER NOT NULL DEFAULT 0,
    abonne TEXT NOT NULL DEFAULT 'Oui',
    montant_facture REAL NOT NULL DEFAULT 17,
    commentaire TEXT DEFAULT '',
    alertes TEXT DEFAULT ''
  );
`);

export interface IStorage {
  // Users
  getUserByEmail(email: string): User | undefined;
  getUserById(id: number): User | undefined;
  getAllUsers(): User[];
  createUser(user: InsertUser): User;

  // Recaps
  createRecap(recap: InsertRecap): Recap;
  getRecapById(id: number): Recap | undefined;
  getRecapsByConsultant(consultantId: number): Recap[];
  getAllRecaps(): Recap[];
  updateRecapStatus(id: number, status: string): void;
  deleteRecap(id: number): void;

  // Tickets
  createTicket(ticket: InsertTicket): Ticket;
  getTicketById(id: number): Ticket | undefined;
  getTicketsByRecap(recapId: number): Ticket[];
  getTicketsByConsultant(consultantId: number): Ticket[];
  getAllTickets(): Ticket[];
  updateTicket(id: number, data: Partial<InsertTicket>): Ticket | undefined;
  deleteTicketsByRecap(recapId: number): void;
}

export const storage: IStorage = {
  // ─── Users ────────────────────────────────────────────────────────────────
  getUserByEmail(email) {
    return db.select().from(users).where(eq(users.email, email)).get();
  },
  getUserById(id) {
    return db.select().from(users).where(eq(users.id, id)).get();
  },
  getAllUsers() {
    return db.select().from(users).all();
  },
  createUser(user) {
    return db.insert(users).values(user).returning().get();
  },

  // ─── Recaps ───────────────────────────────────────────────────────────────
  createRecap(recap) {
    return db.insert(recaps).values(recap).returning().get();
  },
  getRecapById(id) {
    return db.select().from(recaps).where(eq(recaps.id, id)).get();
  },
  getRecapsByConsultant(consultantId) {
    return db.select().from(recaps).where(eq(recaps.consultantId, consultantId)).orderBy(desc(recaps.createdAt)).all();
  },
  getAllRecaps() {
    return db.select().from(recaps).orderBy(desc(recaps.createdAt)).all();
  },
  updateRecapStatus(id, status) {
    db.update(recaps).set({ status }).where(eq(recaps.id, id)).run();
  },
  deleteRecap(id) {
    db.delete(recaps).where(eq(recaps.id, id)).run();
  },

  // ─── Tickets ──────────────────────────────────────────────────────────────
  createTicket(ticket) {
    return db.insert(tickets).values(ticket).returning().get();
  },
  getTicketById(id) {
    return db.select().from(tickets).where(eq(tickets.id, id)).get();
  },
  getTicketsByRecap(recapId) {
    return db.select().from(tickets).where(eq(tickets.recapId, recapId)).all();
  },
  getTicketsByConsultant(consultantId) {
    return db.select().from(tickets).where(eq(tickets.consultantId, consultantId)).orderBy(desc(tickets.dateReception)).all();
  },
  getAllTickets() {
    return db.select().from(tickets).orderBy(desc(tickets.dateReception)).all();
  },
  updateTicket(id, data) {
    return db.update(tickets).set(data).where(eq(tickets.id, id)).returning().get();
  },
  deleteTicketsByRecap(recapId) {
    db.delete(tickets).where(eq(tickets.recapId, recapId)).run();
  },
};
