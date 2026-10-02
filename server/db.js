import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const db = new Database(join(__dirname, 'nanacourt.db'))

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    court_id    TEXT    NOT NULL,
    court_name  TEXT    NOT NULL,
    date        TEXT    NOT NULL,
    time_range  TEXT    NOT NULL,
    slots       TEXT    DEFAULT '',
    hours       INTEGER NOT NULL,
    total_price INTEGER NOT NULL,
    name        TEXT    NOT NULL,
    phone       TEXT    NOT NULL,
    email       TEXT    DEFAULT '',
    payment_method TEXT NOT NULL,
    proof_file  TEXT    DEFAULT '',
    status      TEXT    DEFAULT 'pending',
    created_at  TEXT    DEFAULT (datetime('now', 'localtime'))
  )
`)

try { db.exec('ALTER TABLE bookings ADD COLUMN slots TEXT DEFAULT ""') } catch {}


export default db
