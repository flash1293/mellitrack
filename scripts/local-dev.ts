import { serve } from '@hono/node-server'
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

// Create the D1 mock
function createD1(db: Database.Database) {
  return {
    prepare: (sql: string) => {
      const stmt = db.prepare(sql)
      return {
        bind: (...args: any[]) => ({
          all: () => {
            try {
              const rows = stmt.all(...args)
              return { results: rows }
            } catch (e: any) {
              console.error('SQL error:', e.message, 'SQL:', sql, 'Args:', args)
              return { results: [] }
            }
          },
          first: () => {
            try {
              const row = stmt.get(...args) as any
              return row || null
            } catch (e: any) {
              console.error('SQL error:', e.message, 'SQL:', sql, 'Args:', args)
              return null
            }
          },
          run: () => {
            try {
              const info = stmt.run(...args)
              return {
                meta: { last_row_id: info.lastInsertRowid, changes: info.changes },
                success: true
              }
            } catch (e: any) {
              console.error('SQL error:', e.message, 'SQL:', sql, 'Args:', args)
              return { meta: { last_row_id: null, changes: 0 }, success: false }
            }
          },
        }),
      }
    },
    exec: (sql: string) => db.exec(sql),
    batch: (sqls: string[]) => sqls.map(sql => db.exec(sql)),
    dump: () => Buffer.alloc(0),
  }
}

async function main() {
  // Initialize SQLite database
  const dbPath = path.join(process.cwd(), '.wrangler', 'local-db.sqlite')
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
        console.log(`Applied migration: ${file}`)
      }
    }
  }

  // Run seed
  const seedPath = path.join(process.cwd(), 'scripts', 'seed.sql')
  if (fs.existsSync(seedPath)) {
    const sql = fs.readFileSync(seedPath, 'utf-8')
    db.exec(sql)
    console.log('Seed data applied')
  }

  // Set up environment
  const env = {
    DB: createD1(db),
    APP_PASSWORD: 'mellitrack123',
  }

  // Import and serve the app
  const { default: app } = await import('../src/server/index.js')
  
  // Wrap the app's fetch to inject env
  const handler = (req: Request) => {
    // @ts-ignore
    return app.fetch(req, env)
  }

  const server = serve({
    fetch: handler,
    port: 8787,
  })

  console.log('Local dev server running on http://localhost:8787')
}

main().catch(console.error)
