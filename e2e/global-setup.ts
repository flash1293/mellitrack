import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

export default function globalSetup() {
  const dbDir = path.join(process.cwd(), '.wrangler')
  const dbPath = path.join(dbDir, 'local-db.sqlite')

  // Ensure directory exists
  fs.mkdirSync(dbDir, { recursive: true })

  // Remove old database to start fresh
  try { fs.unlinkSync(dbPath) } catch {}
  try { fs.unlinkSync(dbPath + '-wal') } catch {}
  try { fs.unlinkSync(dbPath + '-shm') } catch {}

  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Run migrations
  const migrationsDir = path.join(process.cwd(), 'migrations')
  if (fs.existsSync(migrationsDir)) {
    const files = fs.readdirSync(migrationsDir).sort()
    for (const file of files) {
      if (file.endsWith('.sql')) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
        db.exec(sql)
      }
    }
  }

  // Run seed
  const seedPath = path.join(process.cwd(), 'scripts', 'seed.sql')
  if (fs.existsSync(seedPath)) {
    const sql = fs.readFileSync(seedPath, 'utf-8')
    db.exec(sql)
  }

  db.close()
  console.log('Database seeded successfully at', dbPath)
}
