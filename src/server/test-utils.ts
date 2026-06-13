/**
 * Test utilities for server route tests.
 * Provides a mock D1Database that uses in-memory storage.
 */

// Simple in-memory table implementation
interface Table {
  columns: string[]
  rows: Map<number, Record<string, unknown>>
  autoIncrement: number
}

class MockD1Result {
  results: unknown[]
  success: boolean
  meta: { last_row_id: number; changes: number }

  constructor(results: unknown[] = [], lastRowId = 0, changes = 0) {
    this.results = results
    this.success = true
    this.meta = { last_row_id: lastRowId, changes }
  }
}

class MockD1Statement {
  private sql: string
  private bindings: unknown[] = []

  constructor(sql: string) {
    this.sql = sql.trim()
  }

  bind(...args: unknown[]): MockD1Statement {
    this.bindings = args
    return this
  }

  async first(): Promise<unknown> {
    // Execute query and return first row
    const result = await this.all()
    return (result.results as unknown[])[0] || null
  }

  async all(): Promise<MockD1Result> {
    // Parse the SQL and mock it
    return executeSql(this.sql, this.bindings)
  }

  async run(): Promise<MockD1Result> {
    return executeSql(this.sql, this.bindings)
  }
}

// In-memory database tables
const tables: Record<string, Table> = {
  users: { columns: ['id', 'username', 'password_hash'], rows: new Map(), autoIncrement: 1 },
  exercise_categories: { columns: ['id', 'name', 'user_id', 'sort_order'], rows: new Map(), autoIncrement: 1 },
  exercises: { columns: ['id', 'name', 'user_id', 'deleted_at', 'sort_order'], rows: new Map(), autoIncrement: 1 },
  exercise_category_mappings: { columns: ['exercise_id', 'category_id', 'sort_order'], rows: new Map(), autoIncrement: 0 },
  trainings: { columns: ['id', 'date', 'user_id', 'category_id'], rows: new Map(), autoIncrement: 1 },
  training_exercises: { columns: ['id', 'training_id', 'exercise_id'], rows: new Map(), autoIncrement: 1 },
  sets: { columns: ['id', 'training_exercise_id', 'set_number', 'weight', 'reps'], rows: new Map(), autoIncrement: 1 },
}

// Seed default data
function seedDefaults() {
  // Nothing seeded by default — tests can add data
}

seedDefaults()

export function resetDb(): void {
  for (const table of Object.values(tables)) {
    table.rows.clear()
    table.autoIncrement = 1
  }
}

function executeSql(sql: string, bindings: unknown[]): MockD1Result {
  // Very basic SQL parser for common patterns used in mellitrack
  const upperSql = sql.toUpperCase().trim()

  try {
    if (upperSql.startsWith('SELECT')) {
      return handleSelect(sql, bindings)
    }
    if (upperSql.startsWith('INSERT')) {
      return handleInsert(sql, bindings)
    }
    if (upperSql.startsWith('UPDATE')) {
      return handleUpdate(sql, bindings)
    }
    if (upperSql.startsWith('DELETE')) {
      return handleDelete(sql, bindings)
    }
  } catch (e) {
    console.error('Mock SQL error:', sql, bindings, e)
    return new MockD1Result([], 0, 0)
  }

  return new MockD1Result([], 0, 0)
}

function getTableName(sql: string): string | null {
  const fromMatch = sql.match(/\bFROM\s+(\w+)/i)
  const intoMatch = sql.match(/\bINTO\s+(\w+)/i)
  const updateMatch = sql.match(/^UPDATE\s+(\w+)/i)
  const deleteMatch = sql.match(/\bFROM\s+(\w+)/i)
  return fromMatch?.[1] || intoMatch?.[1] || updateMatch?.[1] || deleteMatch?.[1] || null
}

/**
 * Apply ORDER BY and LIMIT clauses from SQL to a set of rows.
 */
function applyOrderByAndLimit(sql: string, rows: Record<string, unknown>[]): Record<string, unknown>[] {
  let result = [...rows]

  // Handle ORDER BY (use [\s\S] instead of . to match across newlines)
  const orderMatch = sql.match(/ORDER BY\s+([\s\S]+?)(?:LIMIT|$)/i)
  if (orderMatch) {
    const orderClause = orderMatch[1].trim()
    const orders = orderClause.split(',').map((o) => o.trim())
    result.sort((a, b) => {
      for (const order of orders) {
        const colMatch = order.match(/(?:(\w+)\.)?(\w+)(?:\s+(ASC|DESC))?/i)
        if (!colMatch) continue
        const col = colMatch[2]
        const desc = (colMatch[3] || '').toUpperCase() === 'DESC'
        const aVal = (a as any)[col] ?? ''
        const bVal = (b as any)[col] ?? ''
        let cmp: number
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          cmp = aVal - bVal
        } else {
          cmp = String(aVal).localeCompare(String(bVal))
        }
        if (cmp !== 0) {
          return desc ? -cmp : cmp
        }
      }
      return 0
    })
  }

  // Handle LIMIT (use [\s\S] to match across newlines)
  const limitMatch = sql.match(/LIMIT\s+(\d+)/i)
  if (limitMatch) {
    result = result.slice(0, parseInt(limitMatch[1], 10))
  }

  return result
}

function handleSelect(sql: string, bindings: unknown[]): MockD1Result {
  const tableName = getTableName(sql)
  if (!tableName || !tables[tableName]) {
    return new MockD1Result([])
  }

  const table = tables[tableName]
  let rows = Array.from(table.rows.values())

  // Handle JOINs for specific patterns
  if (sql.includes('JOIN')) {
    return handleJoinSelect(sql, bindings)
  }

  // Apply WHERE clauses (simple)
  const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER BY|GROUP BY|LIMIT|$)/i)
  if (whereMatch) {
    rows = rows.filter((row) => {
      return evaluateWhere(whereMatch[1].trim(), row, bindings)
    })
  }

  // Handle GROUP BY (just return rows as-is for mock)
  // Handle ORDER BY and LIMIT
  rows = applyOrderByAndLimit(sql, rows)

  // Map column aliases and expressions
  const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM/i)
  const selectColumns = selectMatch?.[1]?.trim() || '*'

  if (selectColumns === '*') {
    return new MockD1Result(rows)
  }

  // Handle specific column selections
  const result = rows.map((row) => {
    const obj: Record<string, unknown> = {}
    // Parse columns - simplified
    const cols = selectColumns.split(',').map((c) => {
      const aliasMatch = c.trim().match(/(\w+)\.?(\w*)?\s+as\s+(\w+)/i)
      const colName = c.trim().match(/(?:(\w+)\.)?(\w+)/)
      return { raw: c.trim(), alias: aliasMatch?.[3] || colName?.[2] || c.trim() }
    })
    for (const col of cols) {
      obj[col.alias] = (row as any)[col.alias] ?? null
    }
    return obj
  })

  return new MockD1Result(result)
}

function handleJoinSelect(sql: string, bindings: unknown[]): MockD1Result {
  // Handle the specific JOIN patterns used in mellitrack

  // Pattern: exercises LEFT JOIN exercise_category_mappings LEFT JOIN exercise_categories
  if (sql.includes('exercise_category_mappings') && sql.includes('exercise_categories')) {
    const exercises = Array.from(tables.exercises.rows.values())
    const mappings = Array.from(tables.exercise_category_mappings.rows.values())
    const categories = Array.from(tables.exercise_categories.rows.values())

    // Extract user_id from WHERE
    const userId = findWhereValue(sql, bindings, 'user_id')

    // Filter exercises by user_id
    let filteredExercises = exercises
    if (userId !== undefined) {
      filteredExercises = filteredExercises.filter((e) => compareValues((e as any).user_id, userId))
    }

    // Filter out deleted
    const deletedFilterMatch = sql.match(/deleted_at\s+IS\s+NULL/i)
    if (deletedFilterMatch) {
      filteredExercises = filteredExercises.filter((e) => (e as any).deleted_at === null)
    }

    // Apply ORDER BY
    filteredExercises = applyOrderByAndLimit(sql, filteredExercises)

    return new MockD1Result(filteredExercises.map((ex) => {
      const exMappings = mappings.filter((m) => (m as any).exercise_id === (ex as any).id)
      const catNames = exMappings.map((m) => {
        const cat = categories.find((c) => (c as any).id === (m as any).category_id)
        return cat ? (cat as any).name : null
      }).filter(Boolean)
      const catIds = exMappings.map((m) => (m as any).category_id)

      // Get sort_order from mappings
      const catSortOrders = exMappings.map((m) => (m as any).sort_order ?? 0)

      return {
        id: (ex as any).id,
        name: (ex as any).name,
        deleted_at: (ex as any).deleted_at,
        category_names: catNames.join(','),
        category_ids: catIds.join(','),
        category_sort_orders: catSortOrders.join(','),
      }
    }))
  }

  // Pattern: trainings LEFT JOIN exercise_categories
  if (sql.includes('trainings') && sql.includes('exercise_categories') && !sql.includes('training_exercises')) {
    const trainings = Array.from(tables.trainings.rows.values())
    const categories = Array.from(tables.exercise_categories.rows.values())

    const userId = findWhereValue(sql, bindings, 'user_id')
    let filtered = trainings
    if (userId !== undefined) {
      filtered = filtered.filter((t) => compareValues((t as any).user_id, userId))
    }

    const result = filtered.map((t) => ({
      id: (t as any).id,
      date: (t as any).date,
      category_id: (t as any).category_id,
      category_name: categories.find((c) => compareValues((c as any).id, (t as any).category_id))?.name || null,
      exercise_count: 0,
    }))

    return new MockD1Result(applyOrderByAndLimit(sql, result))
  }

  // Pattern: training_exercises JOIN exercises
  if (sql.includes('training_exercises') && sql.includes('exercises') && !sql.includes('sets')) {
    const trainingExercises = Array.from(tables.training_exercises.rows.values())
    const exercises = Array.from(tables.exercises.rows.values())

    const trainingId = findWhereValue(sql, bindings, 'training_id')

    let filtered = trainingExercises
    if (trainingId !== undefined) {
      filtered = filtered.filter((te) => compareValues((te as any).training_id, trainingId))
    }

    const result = filtered.map((te) => {
      const ex = exercises.find((e) => compareValues((e as any).id, (te as any).exercise_id))
      return {
        id: (te as any).id,
        exercise_id: (te as any).exercise_id,
        exercise_name: ex ? (ex as any).name : '',
      }
    })
    return new MockD1Result(applyOrderByAndLimit(sql, result))
  }

  // Pattern: sets JOIN training_exercises (for training detail - sets by training_id)
  if (sql.includes('sets s') && sql.includes('training_exercises te') && !sql.includes('trainings t')) {
    const sets = Array.from(tables.sets.rows.values())
    const trainingExercises = Array.from(tables.training_exercises.rows.values())

    const trainingId = findWhereValue(sql, bindings, 'training_id')

    let filteredTEs = trainingExercises
    if (trainingId !== undefined) {
      filteredTEs = filteredTEs.filter((te) => compareValues((te as any).training_id, trainingId))
    }

    const teIds = new Set(filteredTEs.map((te) => (te as any).id))
    let filteredSets = sets.filter((s) => teIds.has((s as any).training_exercise_id))

    const result = filteredSets.map((s) => ({
      ...s,
      training_exercise_id: (s as any).training_exercise_id,
    }))

    return new MockD1Result(applyOrderByAndLimit(sql, result))
  }

  // Pattern: sets JOIN training_exercises JOIN trainings (for last-set query)
  if (sql.includes('sets s') && sql.includes('training_exercises te') && sql.includes('trainings t')) {
    // Full last-set query: sets JOIN training_exercises JOIN trainings
    const allSets = Array.from(tables.sets.rows.values())
    const allTrainingExercises = Array.from(tables.training_exercises.rows.values())
    const allTrainings = Array.from(tables.trainings.rows.values())

    const exerciseId = findWhereValue(sql, bindings, 'exercise_id')
    const userId = findWhereValue(sql, bindings, 'user_id')

    // Filter training exercises by exercise_id
    let filteredTEs = allTrainingExercises
    if (exerciseId !== undefined) {
      filteredTEs = filteredTEs.filter((te) => compareValues((te as any).exercise_id, exerciseId))
    }

    // Filter trainings by user_id
    let filteredTrainings = allTrainings
    if (userId !== undefined) {
      filteredTrainings = filteredTrainings.filter((t) => compareValues((t as any).user_id, userId))
    }

    // Get valid training IDs
    const validTrainingIds = new Set(filteredTrainings.map((t) => (t as any).id))
    const validTeIds = new Set(filteredTEs.map((te) => (te as any).id))

    // Filter to sets that are in valid training_exercises AND where training is in valid trainings
    const filteredSets = allSets.filter((s) => {
      const teId = (s as any).training_exercise_id
      if (!validTeIds.has(teId)) return false
      const te = filteredTEs.find((te) => (te as any).id === teId)!
      return validTrainingIds.has((te as any).training_id)
    })

    // Apply ORDER BY and LIMIT at the end
    const sortedOrdered = applyOrderByAndLimit(sql, filteredSets)

    return new MockD1Result(sortedOrdered)
  }

  // Pattern: exercises JOIN exercise_category_mappings
  if (sql.includes('exercises e') && sql.includes('exercise_category_mappings m')) {
    const exercises = Array.from(tables.exercises.rows.values())
    const mappings = Array.from(tables.exercise_category_mappings.rows.values())

    // category_id and user_id each appear once in WHERE; findWhereValue counts ? correctly
    const categoryId = findWhereValue(sql, bindings, 'category_id', 1)
    const userId = findWhereValue(sql, bindings, 'user_id', 1)

    let filteredMappings = mappings
    if (categoryId !== undefined) {
      filteredMappings = filteredMappings.filter((m) => compareValues((m as any).category_id, categoryId))
    }

    const exIds = new Set(filteredMappings.map((m) => (m as any).exercise_id))
    let filteredExercises = exercises.filter((e) => exIds.has((e as any).id))
    if (userId !== undefined) {
      filteredExercises = filteredExercises.filter((e) => compareValues((e as any).user_id, userId))
    }

    filteredExercises = filteredExercises.filter((e) => (e as any).deleted_at === null)

    return new MockD1Result(filteredExercises.map((e) => ({
      id: (e as any).id,
      name: (e as any).name,
    })))
  }

  console.warn('Unhandled JOIN pattern:', sql)
  return new MockD1Result([])
}

function findWhereValue(sql: string, bindings: unknown[], column: string, occurrence = 1): unknown | undefined {
  // Find the Nth occurrence of `column = ?` and return the corresponding binding
  const regex = new RegExp(`${column}\\s*=\\s*\\?`, 'gi')
  let count = 0
  let match
  while ((match = regex.exec(sql)) !== null) {
    count++
    if (count === occurrence) {
      // Count how many ? come before this in the WHERE clause
      const beforeMatch = sql.substring(0, match.index)
      const questionMarksBefore = (beforeMatch.match(/\?/g) || []).length
      return bindings[questionMarksBefore]
    }
  }
  return undefined
}

function compareValues(a: unknown, b: unknown): boolean {
  // Coerce to same type for comparison
  if (typeof a === 'number' && typeof b === 'string') return a === Number(b)
  if (typeof a === 'string' && typeof b === 'number') return Number(a) === b
  return a === b
}

function evaluateWhere(clause: string, row: Record<string, unknown>, bindings: unknown[]): boolean {
  // Handle AND conditions
  const parts = clause.split(/\s+AND\s+/i)
  return parts.every((part) => {
    // Handle IS NULL
    if (/IS\s+NULL/i.test(part)) {
      const col = part.match(/(\w+)\s+IS\s+NULL/i)?.[1]
      if (!col) return true
      return row[col] === null || row[col] === undefined
    }

    // Handle IS NOT NULL
    if (/IS\s+NOT\s+NULL/i.test(part)) {
      const col = part.match(/(\w+)\s+IS\s+NOT\s+NULL/i)?.[1]
      if (!col) return true
      return row[col] !== null && row[col] !== undefined
    }

    // Handle column = ?
    const eqMatch = part.match(/(\w+)\s*=\s*\?/)
    if (eqMatch) {
      const col = eqMatch[1]
      // Find which ? this is
      const beforeCount = (clause.substring(0, clause.indexOf(part) + part.indexOf('?')).match(/\?/g) || []).length
      return compareValues(row[col], bindings[beforeCount])
    }

    // Handle column IN (...)
    const inMatch = part.match(/(\w+)\s+IN\s*\((.+?)\)/)
    if (inMatch) {
      const col = inMatch[1]
      const placeholders = inMatch[2].split(',').map((p) => p.trim())
      // Count ? before this IN clause
      const beforeCount = (clause.substring(0, clause.indexOf(part)).match(/\?/g) || []).length
      for (let i = 0; i < placeholders.length; i++) {
        if (placeholders[i] === '?' && compareValues(row[col], bindings[beforeCount + i])) {
          return true
        }
      }
      return false
    }

    // Handle column < ?
    const ltMatch = part.match(/(\w+)\s*<\s*\?/)
    if (ltMatch) {
      const col = ltMatch[1]
      const beforeCount = (clause.substring(0, clause.indexOf(part) + part.indexOf('?')).match(/\?/g) || []).length
      return (row[col] as number) < (bindings[beforeCount] as number)
    }

    // Handle column = literal (for GROUP BY having)
    const literalEq = part.match(/(\w+)\s*=\s*(\w+)/)
    if (literalEq) {
      return compareValues(row[literalEq[1]], row[literalEq[2]])
    }

    return true
  })
}

/**
 * Extract top-level items from a parenthesized list, respecting nested parens.
 * e.g. "(a, b, (SELECT ... ?))" → ["a", "b", "(SELECT ... ?)"]
 */
function splitTopLevel(str: string): string[] {
  const result: string[] = []
  let depth = 0
  let current = ''
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]
    if (ch === '(') depth++
    else if (ch === ')') depth--
    else if (ch === ',' && depth === 0) {
      result.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }
  if (current.trim()) result.push(current.trim())
  return result
}

/**
 * Extract text between outer parentheses, handling nested parens.
 */
function extractParens(str: string): string | null {
  let depth = 0
  let start = -1
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '(') {
      if (depth === 0) start = i
      depth++
    } else if (str[i] === ')') {
      depth--
      if (depth === 0 && start >= 0) {
        return str.substring(start + 1, i)
      }
    }
  }
  return null
}

/**
 * Count top-level ? in an expression (not nested in parens).
 */
function handleInsert(sql: string, bindings: unknown[]): MockD1Result {
  const intoMatch = sql.match(/INTO\s+(\w+)/i)
  if (!intoMatch) return new MockD1Result([], 0, 0)

  const tableName = intoMatch[1]
  const table = tables[tableName]
  if (!table) return new MockD1Result([], 0, 0)

  // Get column names from INSERT INTO table (col1, col2, ...)
  const colsParens = sql.match(/INTO\s+\w+\s*\(([^)]*)\)\s*VALUES/i)
  const cols = colsParens
    ? colsParens[1].split(',').map((c) => c.trim())
    : table.columns.slice(1)

  // Get VALUES — extract the parens content handling nested parens
  const valuesStart = sql.search(/VALUES\s*/i)
  if (valuesStart === -1) return new MockD1Result([], 0, 0)
  const valuesContent = extractParens(sql.substring(valuesStart))
  if (!valuesContent) return new MockD1Result([], 0, 0)

  // Split values by top-level commas
  const valueExprs = splitTopLevel(valuesContent)

  // Count top-level ? to know which bindings to use
  const numBindingsNeeded = valueExprs.filter((v) => v === '?').length
  const insertBindings = bindings.slice(0, numBindingsNeeded)

  const id = table.autoIncrement++
  const row: Record<string, unknown> = { id }

  let bindingIdx = 0
  for (let i = 0; i < cols.length; i++) {
    if (valueExprs[i] === '?') {
      row[cols[i]] = insertBindings[bindingIdx++]
    }
  }

  // Handle OR IGNORE / OR REPLACE
  if (sql.match(/OR\s+IGNORE/i)) {
    // Check for uniqueness constraints (just check exact match for simplicity)
    for (const existingRow of table.rows.values()) {
      // Check exercise_id + category_id uniqueness
      if ((existingRow as any).exercise_id === row.exercise_id &&
          (existingRow as any).category_id === row.category_id) {
        return new MockD1Result([], 0, 0)
      }
    }
  }

  // Ensure all columns have defaults
  for (const col of table.columns) {
    if (row[col] === undefined) {
      row[col] = null
    }
  }

  table.rows.set(id, row)
  return new MockD1Result([], id, 1)
}

function handleUpdate(sql: string, bindings: unknown[]): MockD1Result {
  const tableName = getTableName(sql)
  if (!tableName || !tables[tableName]) {
    return new MockD1Result([], 0, 0)
  }

  const table = tables[tableName]

  // Parse SET clause
  const setMatch = sql.match(/SET\s+(.+?)(?:WHERE|$)/i)
  if (!setMatch) return new MockD1Result([], 0, 0)

  const setClauses = setMatch[1].split(',').map((s) => s.trim())
  const setCols: { col: string; isBinding: boolean }[] = setClauses.map((s) => {
    const m = s.match(/(\w+)\s*=\s*(.+)/)
    return { col: m?.[1] || '', isBinding: m?.[2] === '?' }
  })

  const setBindingCount = setCols.filter((s) => s.isBinding).length

  // Parse WHERE
  const whereMatch = sql.match(/WHERE\s+(.+?)$/i)
  let rowsToUpdate = Array.from(table.rows.values())

  if (whereMatch) {
    const whereBindings = bindings.slice(setBindingCount)
    rowsToUpdate = rowsToUpdate.filter((row) => evaluateWhere(whereMatch[1].trim(), row, whereBindings))
  }

  let bindingIdx = 0
  for (const row of rowsToUpdate) {
    for (const sc of setCols) {
      if (sc.isBinding) {
        (row as any)[sc.col] = bindings[bindingIdx++]
      }
    }
  }

  return new MockD1Result([], 0, rowsToUpdate.length)
}

function handleDelete(sql: string, bindings: unknown[]): MockD1Result {
  const tableName = getTableName(sql)
  if (!tableName || !tables[tableName]) {
    return new MockD1Result([], 0, 0)
  }

  const table = tables[tableName]

  const whereMatch = sql.match(/WHERE\s+(.+?)$/i)
  let rowsToDelete = Array.from(table.rows.entries())

  if (whereMatch) {
    rowsToDelete = rowsToDelete.filter(([_, row]) => evaluateWhere(whereMatch[1], row, bindings))
  }

  for (const [id] of rowsToDelete) {
    table.rows.delete(id)
  }

  return new MockD1Result([], 0, rowsToDelete.length)
}

// Create a mock D1Database object
export function createMockDb(): D1Database {
  const db = {
    prepare: (sql: string) => new MockD1Statement(sql),
  } as unknown as D1Database

  return db
}

// Helper to create a test environment with mock DB
export function createTestEnv(): { DB: D1Database } {
  return { DB: createMockDb() }
}
